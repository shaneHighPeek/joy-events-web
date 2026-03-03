import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

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
    
    // 2. Load approved user-submitted events from Supabase
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
