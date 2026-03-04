import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;
const ticketmasterApiKey = process.env.TICKETMASTER_API_KEY;
const eventbriteToken = process.env.EVENTBRITE_TOKEN;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vibe = searchParams.get('vibe') || 'DEFAULT';
  const locationParam = searchParams.get('location') || 'BRISBANE';

  try {
    const dataPath = path.join(process.cwd(), 'src', 'data', 'events.json');
    let allRawEvents: any[] = [];
    
    // 1. Load scraped events from JSON
    if (fs.existsSync(dataPath)) {
      const fileData = fs.readFileSync(dataPath, 'utf8');
      allRawEvents = JSON.parse(fileData);
    }
    
    // 2. Load Ticketmaster events at runtime (if API key configured)
    if (ticketmasterApiKey) {
      try {
        const tmEvents = await fetchTicketmasterEvents(ticketmasterApiKey);
        if (tmEvents.length > 0) {
          allRawEvents = [...allRawEvents, ...tmEvents];
        }
      } catch (err) {
        console.error('Error fetching Ticketmaster runtime events:', err);
      }
    }

    // 3. Load Eventbrite events at runtime (if token configured)
    if (eventbriteToken) {
      try {
        const ebEvents = await fetchEventbriteEvents(eventbriteToken);
        if (ebEvents.length > 0) {
          allRawEvents = [...allRawEvents, ...ebEvents];
        }
      } catch (err) {
        console.error('Error fetching Eventbrite runtime events:', err);
      }
    }

    // 4. Load approved user-submitted events from Supabase
    if (supabase) {
      try {
        const { data: userEvents, error } = await supabase
          .from('user_submitted_events')
          .select('*')
          .eq('status', 'approved');
        
        if (!error && userEvents && userEvents.length > 0) {
          // Convert user events to match scraped event format
          const formattedUserEvents = userEvents.map((ue: any) => ({
            id: ue.id,
            title: ue.title,
            venue: ue.venue,
            date: ue.date,
            vibe: ue.vibe || 'ALL',
            source: 'Community',
            description: ue.description || '',
            image: ue.image || null,
            link: ue.link || '#',
            priceBand: ue.price_band || 'TBC',
            energy: ue.energy || 'MEDIUM',
            indoor: ue.indoor_mode || 'ANY',
            hotScore: 75, // User events get a solid hot score
            location: ue.location
          }));
          
          // Merge with scraped events
          allRawEvents = [...allRawEvents, ...formattedUserEvents];
        }
      } catch (err) {
        console.error('Error fetching user events:', err);
        // Continue without user events if there's an error
      }
    }

    // 3. Filter and map events
    const mappedEvents = allRawEvents
      .filter((e: any) => {
        const venue = (e.venue || '').toUpperCase();
        const source = (e.source || '').toUpperCase();
        const title = (e.title || '').toUpperCase();
        const eventLocation = (e.location || '').toUpperCase();
        
        let locationMatch = false;
        if (locationParam === 'BRISBANE') {
          locationMatch = venue.includes('BRISBANE') || source.includes('BCC') || venue.includes('MOUNT GRAVATT') || eventLocation === 'BRISBANE';
        } else if (locationParam === 'GC') {
          locationMatch = venue.includes('GOLD COAST') || venue.includes('HOTA') || venue.includes('SURFERS PARADISE') || source.includes('GCCC') || venue.includes('COOLANGATTA') || venue.includes('CARRARA') || venue.includes('BROADBEACH') || venue.includes('TUGUN') || venue.includes('HOPE ISLAND') || eventLocation === 'GC';
        } else if (locationParam === 'SC') {
          locationMatch = venue.includes('SUNSHINE') || venue.includes('MAROOCHYDORE') || venue.includes('NOOSA') || venue.includes('MOOLOOLABA') || eventLocation === 'SC';
        } else {
          locationMatch = true;
        }

        if (!locationMatch) return false;

        if (vibe === 'SPORTS') {
          const sportsKeywords = ['SPORT', 'VOLLEY', 'STADIUM', 'MARATHON', 'RUN', 'RACE', 'FITNESS', 'YOGA', 'GYM'];
          return sportsKeywords.some(kw => title.includes(kw) || venue.includes(kw));
        }
        if (vibe === 'MUSIC') {
          const musicKeywords = ['MUSIC', 'CONCERT', 'BAND', 'DJ', 'FESTIVAL', 'LIVE', 'JAZZ', 'BLUES', 'OPERA', 'SYMPHONY'];
          return musicKeywords.some(kw => title.includes(kw) || venue.includes(kw));
        }
        if (vibe === 'CHILL') {
          const chillKeywords = ['PARK', 'MARKET', 'EXHIBITION', 'MUSEUM', 'ART', 'LIBRARY', 'GARDEN', 'PICNIC', 'YOGA'];
          return chillKeywords.some(kw => title.includes(kw) || venue.includes(kw));
        }

        return true;
      })
      .map((e: any, index: number) => {
        let rawTitle = (e.title || '').trim();
        let rawDate = e.date || 'Available Today';
        let rawVenue = e.venue || (locationParam === 'GC' ? 'Gold Coast' : 'Brisbane');

        // CLEANUP: If the title contains a date at the start (e.g., "19Apr2026The Betty..."), extract it
        const dateMatch = rawTitle.match(/^(\d{2}[A-Za-z]{3}\d{4})(.*)/);
        if (dateMatch) {
          const extractedDate = dateMatch[1];
          rawDate = `${extractedDate.slice(0, 2)} ${extractedDate.slice(2, 5).toUpperCase()} ${extractedDate.slice(5)}`;
          rawTitle = dateMatch[2].trim();
        }
        
        // CLEANUP: Handle "Volleyslam6 to 15 MarchCoolangattaDetails"
        if (rawTitle.includes('Volleyslam')) {
           rawTitle = "Gold Coast Volleyslam";
           rawDate = "6 - 15 MAR 2026";
           rawVenue = "Coolangatta Beach";
        }

        // Format rawDate if it looks like "19APR2026"
        if (/^\d{2}[A-Z]{3}\d{4}$/.test(rawDate)) {
           rawDate = `${rawDate.slice(0, 2)} ${rawDate.slice(2, 5)} ${rawDate.slice(5)}`;
        }

        return {
          id: e.id || `h-${index}`,
          title: rawTitle,
          date: rawDate,
          venue: rawVenue,
          hero: e.image || e.hero || getPlaceholderImage(vibe),
          link: e.link || '#',
          source: e.source || 'Vacuum',
          updatedLabel: e.updatedLabel || 'Verified',
          priceBand: e.priceBand || 'TBC',
          energy: e.energy || 'MEDIUM',
          indoor: e.indoor || 'ANY',
          distanceKm: e.distanceKm || 0,
          hotScore: e.hotScore || 50
        };
      });

    if (mappedEvents.length > 0) {
      return NextResponse.json({ events: mappedEvents });
    }
  } catch (error) {
    console.error('Error reading events:', error);
  }

  return NextResponse.json({ events: getFallbackData(vibe) });
}

async function fetchTicketmasterEvents(apiKey: string): Promise<any[]> {
  const url = new URL('https://app.ticketmaster.com/discovery/v2/events.json');
  url.searchParams.set('apikey', apiKey);
  url.searchParams.set('stateCode', 'QLD');
  url.searchParams.set('countryCode', 'AU');
  url.searchParams.set('size', '100');
  url.searchParams.set('sort', 'date,asc');

  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) {
    console.error(`Ticketmaster HTTP ${res.status}`);
    return [];
  }

  const data = await res.json();
  const events = data?._embedded?.events || [];

  const relevantCities = new Set([
    'BRISBANE', 'GOLD COAST', 'SUNSHINE COAST',
    'SURFERS PARADISE', 'BROADBEACH', 'ROBINA', 'SOUTHPORT',
    'COOLANGATTA', 'MAROOCHYDORE', 'NOOSA', 'MOOLOOLABA'
  ]);

  const mapped = events
    .filter((e: any) => {
      const city = (e?._embedded?.venues?.[0]?.city?.name || '').toUpperCase();
      return relevantCities.has(city);
    })
    .map((e: any) => {
      const venue = e?._embedded?.venues?.[0]?.name || 'Venue TBC';
      const city = (e?._embedded?.venues?.[0]?.city?.name || '').toUpperCase();
      const images = e?.images || [];
      let bestImg = images?.[0]?.url || null;
      for (const img of images) {
        if (img?.ratio === '16_9' && (img?.width || 0) >= 1000) {
          bestImg = img.url;
          break;
        }
      }

      let location = 'BRISBANE';
      if (['GOLD COAST', 'SURFERS PARADISE', 'BROADBEACH', 'ROBINA', 'SOUTHPORT', 'COOLANGATTA'].includes(city)) {
        location = 'GC';
      } else if (['SUNSHINE COAST', 'MAROOCHYDORE', 'NOOSA', 'MOOLOOLABA'].includes(city)) {
        location = 'SC';
      }

      return {
        id: `tm-${e.id}`,
        title: e?.name || 'Ticketmaster Event',
        venue,
        date: e?.dates?.start?.localDate || 'Available Today',
        vibe: 'MUSIC',
        source: 'Ticketmaster',
        link: e?.url || '#',
        image: bestImg,
        description: e?.info || '',
        activitytype: e?.classifications?.[0]?.segment?.name || '',
        location,
      };
    });

  console.log(`Ticketmaster runtime fetched: ${mapped.length}`);
  return mapped;
}

async function fetchEventbriteEvents(token: string): Promise<any[]> {
  const targets = [
    { city: 'Brisbane', location: 'BRISBANE' },
    { city: 'Gold Coast', location: 'GC' },
    { city: 'Sunshine Coast', location: 'SC' },
  ];

  const mapped: any[] = [];

  for (const t of targets) {
    const url = new URL('https://www.eventbriteapi.com/v3/events/search/');
    url.searchParams.set('location.address', t.city);
    url.searchParams.set('location.within', '50km');
    url.searchParams.set('expand', 'venue');

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error(`Eventbrite ${t.city} HTTP ${res.status}`);
      continue;
    }

    const data = await res.json();
    const events = data?.events || [];

    for (const e of events) {
      const status = (e?.status || '').toLowerCase();
      if (status && status !== 'live') continue;

      const startLocal = e?.start?.local || '';
      const localDate = startLocal ? startLocal.slice(0, 10) : 'Available Today';
      const date = /^\d{4}-\d{2}-\d{2}$/.test(localDate) ? localDate : 'Available Today';

      const venueName = e?.venue?.name || e?.venue?.address?.localized_address_display || t.city;
      const image = e?.logo?.original?.url || null;

      mapped.push({
        id: `eb-${e.id}`,
        title: e?.name?.text || 'Eventbrite Event',
        venue: venueName,
        date,
        vibe: 'ALL',
        source: 'Eventbrite',
        link: e?.url || '#',
        image,
        description: e?.description?.text || '',
        activitytype: '',
        location: t.location,
      });
    }
  }

  // de-dup by title/date/venue
  const seen = new Set<string>();
  const deduped: any[] = [];
  for (const e of mapped) {
    const key = `${(e.title || '').toLowerCase()}|${(e.date || '').toUpperCase()}|${(e.venue || '').toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(e);
  }

  console.log(`Eventbrite runtime fetched: ${deduped.length}`);
  return deduped;
}

function getPlaceholderImage(vibe: string) {
  const images: any = {
    SPORTS: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&q=80&w=2000',
    MUSIC: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=2000',
    CHILL: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=2000',
    DEFAULT: 'https://images.unsplash.com/photo-1518173946687-a4c8a9ba332f?auto=format&fit=crop&q=80&w=2000'
  };
  return images[vibe] || images.DEFAULT;
}

function getFallbackData(vibe: string) {
  const fallbacks: any = {
    SPORTS: [{ id: 's1', title: 'Brisbane Broncos vs Sydney Roosters', date: 'Fri 14 Mar 2026', venue: 'Suncorp Stadium', hero: getPlaceholderImage('SPORTS'), link: '#', source: 'Fallback', updatedLabel: 'System', priceBand: 'TBC', energy: 'HIGH', indoor: 'OUTDOOR', distanceKm: 0, hotScore: 80 }],
    MUSIC: [{ id: 'm1', title: 'RÜFÜS DU SOL: World Tour', date: 'Thu 20 Mar 2026', venue: 'Riverstage', hero: getPlaceholderImage('MUSIC'), link: '#', source: 'Fallback', updatedLabel: 'System', priceBand: 'TBC', energy: 'HIGH', indoor: 'OUTDOOR', distanceKm: 0, hotScore: 95 }],
    CHILL: [{ id: 'c1', title: 'Burleigh Pavilion Sunday Session', date: 'Sun Every Week', venue: 'Burleigh Pavilion', hero: getPlaceholderImage('CHILL'), link: '#', source: 'Fallback', updatedLabel: 'System', priceBand: 'TBC', energy: 'LOW', indoor: 'OUTDOOR', distanceKm: 0, hotScore: 60 }],
    DEFAULT: [{ id: 'd1', title: 'Brisbane City Markets', date: 'Wed Every Week', venue: 'Reddacliff Place', hero: getPlaceholderImage('DEFAULT'), link: '#', source: 'Fallback', updatedLabel: 'System', priceBand: 'FREE', energy: 'MEDIUM', indoor: 'OUTDOOR', distanceKm: 0, hotScore: 40 }]
  };
  return fallbacks[vibe] || fallbacks.DEFAULT;
}
