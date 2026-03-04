import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;
const ticketmasterApiKey = process.env.TICKETMASTER_API_KEY;
const eventbriteToken = process.env.EVENTBRITE_TOKEN;
const eventfindaUser = process.env.EVENTFINDA_USER;
const eventfindaPassword = process.env.EVENTFINDA_PASSWORD;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vibe = searchParams.get('vibe') || 'DEFAULT';
  const locationParam = searchParams.get('location') || 'BRISBANE';
  const debug = searchParams.get('debug') === '1';

  try {
    const dataPath = path.join(process.cwd(), 'src', 'data', 'events.json');
    let allRawEvents: any[] = [];
    const providerDebug: any = { ticketmaster: {}, eventbrite: {}, eventfinda: {} };
    
    // 1. Load scraped events from JSON
    if (fs.existsSync(dataPath)) {
      const fileData = fs.readFileSync(dataPath, 'utf8');
      allRawEvents = JSON.parse(fileData);
    }
    
    // 2. Load Ticketmaster events at runtime (if API key configured)
    if (ticketmasterApiKey) {
      try {
        const tmEvents = await fetchTicketmasterEvents(ticketmasterApiKey, providerDebug.ticketmaster);
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
        const ebEvents = await fetchEventbriteEvents(eventbriteToken, providerDebug.eventbrite);
        if (ebEvents.length > 0) {
          allRawEvents = [...allRawEvents, ...ebEvents];
        }
      } catch (err) {
        console.error('Error fetching Eventbrite runtime events:', err);
      }
    }

    // 4. Load Eventfinda events at runtime (if API creds configured)
    if (eventfindaUser && eventfindaPassword) {
      try {
        const efEvents = await fetchEventfindaEvents(eventfindaUser, eventfindaPassword, providerDebug.eventfinda);
        if (efEvents.length > 0) {
          allRawEvents = [...allRawEvents, ...efEvents];
        }
      } catch (err) {
        console.error('Error fetching Eventfinda runtime events:', err);
      }
    }

    // 5. Load approved user-submitted events from Supabase
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

        rawDate = normalizeDate(rawDate);

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
      if (debug) {
        const bySource: Record<string, number> = {};
        for (const e of mappedEvents) bySource[e.source] = (bySource[e.source] || 0) + 1;
        return NextResponse.json({ events: mappedEvents, debug: { bySource, providers: providerDebug } });
      }
      return NextResponse.json({ events: mappedEvents });
    }
  } catch (error) {
    console.error('Error reading events:', error);
  }

  return NextResponse.json({ events: getFallbackData(vibe) });
}

function normalizeDate(input: string): string {
  if (!input) return 'Available Today';
  const s = String(input).trim();

  // yyyy-mm-dd -> DD MON YYYY
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    const mon = dt.toLocaleString('en-AU', { month: 'short', timeZone: 'UTC' }).toUpperCase();
    return `${String(d).padStart(2, '0')} ${mon} ${y}`;
  }

  // already DD MON YYYY-ish
  if (/^\d{2}\s+[A-Za-z]{3}\s+\d{4}$/.test(s)) {
    const [d, mon, y] = s.split(/\s+/);
    return `${d.padStart(2, '0')} ${mon.toUpperCase()} ${y}`;
  }

  return s;
}

function classifySeqLocation(text: string): 'BRISBANE' | 'GC' | 'SC' | '' {
  const t = (text || '').toUpperCase();
  const bne = ['BRISBANE', 'FORTITUDE VALLEY', 'SOUTHBANK', 'SOUTH BANK', 'NEW FARM', 'PADDINGTON', 'WEST END', 'MILTON'];
  const gc = ['GOLD COAST', 'SURFERS PARADISE', 'BROADBEACH', 'ROBINA', 'SOUTHPORT', 'COOLANGATTA', 'BURLEIGH', 'TUGUN', 'CARRARA', 'NERANG', 'HELENSVALE', 'COOMERA'];
  const sc = ['SUNSHINE COAST', 'MAROOCHYDORE', 'NOOSA', 'MOOLOOLABA', 'CALOUNDRA', 'BUDERIM', 'NAMBOUR', 'PEREGIAN'];
  if (gc.some(k => t.includes(k))) return 'GC';
  if (sc.some(k => t.includes(k))) return 'SC';
  if (bne.some(k => t.includes(k))) return 'BRISBANE';
  return '';
}

async function fetchTicketmasterEvents(apiKey: string, dbg: any = {}): Promise<any[]> {
  const url = new URL('https://app.ticketmaster.com/discovery/v2/events.json');
  url.searchParams.set('apikey', apiKey);
  url.searchParams.set('stateCode', 'QLD');
  url.searchParams.set('countryCode', 'AU');
  url.searchParams.set('size', '100');
  url.searchParams.set('sort', 'date,asc');

  const res = await fetch(url.toString(), { cache: 'no-store' });
  dbg.httpStatus = res.status;
  if (!res.ok) {
    dbg.error = `HTTP ${res.status}`;
    console.error(`Ticketmaster HTTP ${res.status}`);
    return [];
  }

  const data = await res.json();
  const events = data?._embedded?.events || [];
  dbg.rawCount = events.length;

  const mapped = events
    .map((e: any) => {
      const venueObj = e?._embedded?.venues?.[0] || {};
      const venue = venueObj?.name || 'Venue TBC';
      const city = (venueObj?.city?.name || '').toUpperCase();
      const state = (venueObj?.state?.stateCode || '').toUpperCase();
      const address = `${venueObj?.address?.line1 || ''} ${venueObj?.country?.name || ''}`;
      const seqText = `${city} ${venue} ${address}`;

      // keep to QLD only
      if (state && state !== 'QLD') return null;
      const images = e?.images || [];
      let bestImg = images?.[0]?.url || null;
      for (const img of images) {
        if (img?.ratio === '16_9' && (img?.width || 0) >= 1000) {
          bestImg = img.url;
          break;
        }
      }

      const location = classifySeqLocation(seqText);

      const localDate = e?.dates?.start?.localDate || '';
      const todayIso = new Date().toISOString().slice(0, 10);
      if (localDate && /^\d{4}-\d{2}-\d{2}$/.test(localDate) && localDate < todayIso) return null;

      return {
        id: `tm-${e.id}`,
        title: e?.name || 'Ticketmaster Event',
        venue,
        date: localDate || 'Available Today',
        vibe: 'MUSIC',
        source: 'Ticketmaster',
        link: e?.url || '#',
        image: bestImg,
        description: e?.info || '',
        activitytype: e?.classifications?.[0]?.segment?.name || '',
        location,
      };
    })
    .filter(Boolean) as any[];

  dbg.filteredCount = mapped.length;
  console.log(`Ticketmaster runtime fetched: ${mapped.length}`);
  return mapped;
}

async function fetchEventbriteEvents(token: string, dbg: any = {}): Promise<any[]> {
  const targets = [
    { city: 'Brisbane', location: 'BRISBANE' },
    { city: 'Gold Coast', location: 'GC' },
    { city: 'Surfers Paradise', location: 'GC' },
    { city: 'Sunshine Coast', location: 'SC' },
    { city: 'Maroochydore', location: 'SC' },
    { city: 'Noosa', location: 'SC' },
  ];

  const mapped: any[] = [];
  dbg.cities = [];

  for (const t of targets) {
    const url = new URL('https://www.eventbriteapi.com/v3/events/search/');
    url.searchParams.set('location.address', t.city);
    url.searchParams.set('location.within', '60km');
    url.searchParams.set('expand', 'venue');
    url.searchParams.set('sort_by', 'date');
    url.searchParams.set('start_date.range_start', new Date().toISOString());
    // some Eventbrite tokens still accept token query param
    url.searchParams.set('token', token);

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      dbg.cities.push({ city: t.city, status: res.status, rawCount: 0 });
      console.error(`Eventbrite ${t.city} HTTP ${res.status}`);
      continue;
    }

    const data = await res.json();
    const events = data?.events || [];
    dbg.cities.push({ city: t.city, status: res.status, rawCount: events.length });

    for (const e of events) {
      const status = (e?.status || '').toLowerCase();
      if (status && !['live', 'started'].includes(status)) continue;

      const startLocal = e?.start?.local || '';
      const localDate = startLocal ? startLocal.slice(0, 10) : '';
      const todayIso = new Date().toISOString().slice(0, 10);
      if (localDate && /^\d{4}-\d{2}-\d{2}$/.test(localDate) && localDate < todayIso) continue;
      const date = /^\d{4}-\d{2}-\d{2}$/.test(localDate) ? localDate : 'Available Today';

      const venueName = e?.venue?.name || e?.venue?.address?.localized_address_display || t.city;
      const image = e?.logo?.original?.url || e?.logo?.url || null;

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

  dbg.filteredCount = deduped.length;
  console.log(`Eventbrite runtime fetched: ${deduped.length}`);
  return deduped;
}

async function fetchEventfindaEvents(user: string, password: string, dbg: any = {}): Promise<any[]> {
  const out: any[] = [];
  const auth = Buffer.from(`${user}:${password}`).toString('base64');
  const nowIso = new Date().toISOString();
  dbg.requests = [];

  const targets = [
    { query: 'brisbane', code: 'BRISBANE' },
    { query: 'gold coast', code: 'GC' },
    { query: 'sunshine coast', code: 'SC' },
    { query: 'maroochydore', code: 'SC' },
    { query: 'noosa', code: 'SC' },
  ];

  const fetchJson = async (url: string) => {
    const res = await fetch(url, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
    if (!res.ok) {
      dbg.requests.push({ url, status: res.status, rawCount: 0 });
      console.error(`Eventfinda HTTP ${res.status} for ${url}`);
      return null;
    }
    try {
      const data = await res.json();
      const rawCount = (data?.events || data?.results || []).length;
      dbg.requests.push({ url, status: res.status, rawCount });
      return data;
    } catch {
      dbg.requests.push({ url, status: res.status, rawCount: -1, parseError: true });
      console.error('Eventfinda JSON parse failed');
      return null;
    }
  };

  // Strategy A: per-region query (more stable mapping)
  for (const t of targets) {
    const url = new URL('https://api.eventfinda.com.au/v2/events.json');
    url.searchParams.set('rows', '80');
    url.searchParams.set('order', 'date');
    url.searchParams.set('q', t.query);

    const data = await fetchJson(url.toString());
    const events = data?.events || data?.results || [];

    for (const e of events) {
      const start = e?.datetime_start || e?.session?.datetime_start || '';
      if (start && start < nowIso) continue;
      const localDate = start ? String(start).slice(0, 10) : '';

      let image: string | null = null;
      const imgs = e?.images?.images || e?.images || [];
      if (Array.isArray(imgs) && imgs.length > 0) {
        image = imgs[0]?.transforms?.['7']?.url || imgs[0]?.url || null;
      }

      const title = e?.name || 'Eventfinda Event';
      const cat = (e?.category?.name || '').toLowerCase();
      const vibe = /music|concert|gig/.test(cat + ' ' + title.toLowerCase()) ? 'MUSIC' : 'ALL';
      const venueText = `${e?.location_summary || ''} ${e?.location?.name || ''}`.trim();
      const locCode = classifySeqLocation(`${t.query} ${venueText}`) || t.code;

      out.push({
        id: `ef-${e.id}`,
        title,
        venue: e?.location_summary || e?.location?.name || 'Venue TBC',
        date: localDate || 'Available Today',
        vibe,
        source: 'Eventfinda',
        link: e?.url || '#',
        image,
        description: e?.description || '',
        activitytype: e?.category?.name || '',
        location: locCode,
      });
    }
  }

  // Strategy B fallback: broad feed + classify if still empty
  if (out.length === 0) {
    const url = new URL('https://api.eventfinda.com.au/v2/events.json');
    url.searchParams.set('rows', '200');
    url.searchParams.set('order', 'date');
    const data = await fetchJson(url.toString());
    const events = data?.events || data?.results || [];

    for (const e of events) {
      const start = e?.datetime_start || e?.session?.datetime_start || '';
      if (start && start < nowIso) continue;
      const localDate = start ? String(start).slice(0, 10) : '';
      const venueText = `${e?.location_summary || ''} ${e?.location?.name || ''} ${e?.location?.summary || ''}`.trim();
      const locCode = classifySeqLocation(venueText);
      if (!locCode) continue;

      out.push({
        id: `ef-${e.id}`,
        title: e?.name || 'Eventfinda Event',
        venue: e?.location_summary || e?.location?.name || 'Venue TBC',
        date: localDate || 'Available Today',
        vibe: 'ALL',
        source: 'Eventfinda',
        link: e?.url || '#',
        image: null,
        description: e?.description || '',
        activitytype: e?.category?.name || '',
        location: locCode,
      });
    }
  }

  const seen = new Set<string>();
  const deduped: any[] = [];
  for (const e of out) {
    const key = `${(e.title || '').toLowerCase()}|${(e.date || '').toUpperCase()}|${(e.venue || '').toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(e);
  }

  dbg.filteredCount = deduped.length;
  console.log(`Eventfinda runtime fetched: ${deduped.length}`);
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
