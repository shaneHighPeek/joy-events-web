"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Compass,
  Flame,
  Loader2,
  Menu,
  Share2,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  X,
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
  Zap,
  DollarSign,
  Maximize2,
  Filter,
} from "lucide-react";

type Vibe = "DEFAULT" | "SPORTS" | "MUSIC" | "CHILL";
type Location = "BRISBANE" | "GC" | "SC";
type DateWindow = "ANY" | "TODAY" | "WEEKEND" | "THIS_WEEK";
type PriceBand = "ANY" | "FREE" | "$" | "$$" | "$$$";
type Energy = "ANY" | "LOW" | "MEDIUM" | "HIGH";
type SettingMode = "SOLO" | "DATE" | "MATES" | "FAMILY";
type IndoorMode = "ANY" | "INDOOR" | "OUTDOOR";
type AdaptiveMode = "NONE" | "SOLO_EXPLORER" | "DATE_NIGHT" | "NEW_IN_TOWN" | "FAMILY_DAY";
type PulseWindow = "NOW" | "TONIGHT" | "WEEKEND";
type VisitorTravelStyle = "RELAXED" | "EXPLORE" | "SOCIAL";

interface Event {
  id: string;
  title: string;
  date: string;
  venue: string;
  hero: string;
  link: string;
  source: string;
  updatedLabel: string;
  priceBand: Exclude<PriceBand, "ANY"> | "TBC";
  energy: Exclude<Energy, "ANY">;
  indoor: Exclude<IndoorMode, "ANY">;
  distanceKm: number;
  hotScore: number;
}

interface PreferenceProfile {
  mode: SettingMode;
  budget: PriceBand;
  energy: Energy;
  radius: number;
  transport: "CAR" | "TRAIN" | "TRAM" | "ANY";
}

const defaultProfile: PreferenceProfile = {
  mode: "SOLO",
  budget: "ANY",
  energy: "ANY",
  radius: 40,
  transport: "ANY",
};

const locationLabels: Record<Location, string> = {
  BRISBANE: "Brisbane",
  GC: "Gold Coast",
  SC: "Sunshine Coast",
};

const vibeList: Vibe[] = ["DEFAULT", "SPORTS", "MUSIC", "CHILL"];

const themes: Record<
  Vibe,
  {
    outsideBg: string;
    accent: string;
    glow: string;
    visual: string;
    description: string;
  }
> = {
  DEFAULT: {
    outsideBg: "bg-slate-950",
    accent: "text-blue-500",
    glow: "shadow-blue-500/30",
    visual: 'url("https://images.unsplash.com/photo-1518173946687-a4c8a9ba332f?auto=format&fit=crop&q=80&w=2000")',
    description: "The SEQ Discovery Engine. Discover real local culture without the noise.",
  },
  SPORTS: {
    outsideBg: "bg-[#2D0012]",
    accent: "text-[#FFB81C]",
    glow: "shadow-[#FFB81C]/30",
    visual: 'url("https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&q=80&w=2000")',
    description: "The game is calling. Stadium nights, local rivalries, city buzz.",
  },
  MUSIC: {
    outsideBg: "bg-[#0a0a0a]",
    accent: "text-fuchsia-500",
    glow: "shadow-fuchsia-500/30",
    visual: 'url("https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=2000")',
    description: "From hidden bars to headline stages. Find the sound that fits tonight.",
  },
  CHILL: {
    outsideBg: "bg-[#431407]",
    accent: "text-[#FF7E5F]",
    glow: "shadow-[#FF7E5F]/30",
    visual: 'url("https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=2000")',
    description: "Slow mornings, sunset sessions, and social spaces that feel welcoming.",
  },
};

export default function Home() {
  const [vibe, setVibe] = useState<Vibe>("DEFAULT");
  const [location, setLocation] = useState<Location | null>(null);
  const [showEvents, setShowEvents] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Search & Filters
  const [query, setQuery] = useState("");
  const [dateWindow, setDateWindow] = useState<DateWindow>("ANY");
  const [priceBand, setPriceBand] = useState<PriceBand>("ANY");
  const [energy, setEnergy] = useState<Energy>("ANY");
  const [indoorMode, setIndoorMode] = useState<IndoorMode>("ANY");
  const [pulseWindow, setPulseWindow] = useState<PulseWindow | "ANY">("ANY");

  const [profile, setProfile] = useState<PreferenceProfile>(defaultProfile);
  const [userId, setUserId] = useState<string | null>(null);
  const [savedEventIds, setSavedEventIds] = useState<string[]>([]);

  const current = themes[vibe];

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
      if (data.session?.user?.id) {
        loadSavedEvents(data.session.user.id);
      }
    });
  }, []);

  const loadSavedEvents = async (uid: string) => {
    if (!supabase) return;
    const { data } = await supabase.from("saved_events").select("event_id").eq("user_id", uid);
    if (data) setSavedEventIds(data.map((r) => r.event_id));
  };

  const fetchEvents = async (selectedVibe: Vibe, selectedLocation: Location) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/events?vibe=${selectedVibe}&location=${selectedLocation}`);
      const data = await res.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error("Fetch failed", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = (loc: Location) => {
    setLocation(loc);
    fetchEvents(vibe, loc);
    setTimeout(() => setShowEvents(true), 300);
  };

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const q = query.toLowerCase();
      const matchQuery = !q || e.title.toLowerCase().includes(q) || e.venue.toLowerCase().includes(q);
      const matchPrice = priceBand === "ANY" || e.priceBand === priceBand;
      const matchEnergy = energy === "ANY" || e.energy === energy;
      const matchIndoor = indoorMode === "ANY" || e.indoor === indoorMode;
      const matchPulse = pulseWindow === "ANY" || 
        (pulseWindow === "NOW" && /today|now/i.test(e.date)) ||
        (pulseWindow === "TONIGHT" && /today|tonight/i.test(e.date)) ||
        (pulseWindow === "WEEKEND" && /sat|sun|weekend/i.test(e.date));

      return matchQuery && matchPrice && matchEnergy && matchIndoor && matchPulse;
    });
  }, [events, query, priceBand, energy, indoorMode, pulseWindow]);

  return (
    <main className={`min-h-screen transition-all duration-1000 flex flex-col items-center relative ${current.outsideBg}`}>
      <div
        className="fixed inset-0 z-0 opacity-40 transition-all duration-1000"
        style={{ backgroundImage: current.visual, backgroundSize: "cover", backgroundPosition: "center" }}
      />

      <div className="relative z-10 w-full max-w-[1200px] min-h-screen bg-black/90 md:border-x border-white/10 flex flex-col">
        {/* Header / Vibe Selector */}
        <div className="h-20 bg-black/60 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 sticky top-0 z-[100]">
          <h1 className="text-2xl font-black italic tracking-tighter text-white">jOY</h1>
          <div className="hidden md:flex gap-8">
            {vibeList.map((v) => (
              <button
                key={v}
                onClick={() => { setVibe(v); if (location) fetchEvents(v, location); }}
                className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                  vibe === v ? "text-white underline underline-offset-8 decoration-2" : "text-white/30 hover:text-white"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <button onClick={() => setShowSettings(true)} className="p-2 bg-white/5 rounded-full border border-white/10 text-white/70">
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Hero Section (Start) */}
        {!showEvents && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-12">
            <div className="text-center space-y-4">
              <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${current.accent}`}>SEQ DISCOVERY ENGINE</span>
              <h2 className="text-[12vw] md:text-8xl font-black italic uppercase tracking-tighter leading-none text-white">
                FIND YOUR <span className={current.accent}>JOY</span>
              </h2>
              <p className="text-slate-400 max-w-md mx-auto font-medium">{current.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl">
              {(["BRISBANE", "GC", "SC"] as Location[]).map((loc) => (
                <button
                  key={loc}
                  onClick={() => handleLocationSelect(loc)}
                  className="group relative h-40 rounded-3xl overflow-hidden border border-white/10 bg-slate-900/50 hover:border-white/30 transition-all p-6 text-left"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <MapPin className={`w-6 h-6 mb-4 ${current.accent}`} />
                  <p className="text-xl font-black uppercase tracking-tighter text-white">{locationLabels[loc]}</p>
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Explore Pulse</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Events View */}
        {showEvents && (
          <div className="flex-1 flex flex-col">
            {/* Minimal Search & Filter Trigger */}
            <div className="p-6 border-b border-white/10 space-y-4">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={`Search ${locationLabels[location!]} events...`}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-white/30"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-4 flex items-center gap-2 rounded-2xl border transition-all ${
                    showFilters ? "bg-white text-black border-white" : "bg-white/5 border-white/10 text-white"
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">Filters</span>
                </button>
              </div>

              {/* Collapsible Filters */}
              {showFilters && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-1.5">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-1">When</p>
                    <select
                      value={pulseWindow}
                      onChange={(e) => setPulseWindow(e.target.value as PulseWindow | "ANY")}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold text-white uppercase"
                    >
                      <option value="ANY">Any Time</option>
                      <option value="NOW">Happening Now</option>
                      <option value="TONIGHT">Tonight</option>
                      <option value="WEEKEND">This Weekend</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-1">Price</p>
                    <select
                      value={priceBand}
                      onChange={(e) => setPriceBand(e.target.value as PriceBand)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold text-white uppercase"
                    >
                      <option value="ANY">Any Price</option>
                      <option value="FREE">Free Only</option>
                      <option value="$">Budget ($)</option>
                      <option value="$$">Moderate ($$)</option>
                      <option value="$$$">Premium ($$$)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-1">Vibe Energy</p>
                    <select
                      value={energy}
                      onChange={(e) => setEnergy(e.target.value as Energy)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold text-white uppercase"
                    >
                      <option value="ANY">Any Energy</option>
                      <option value="LOW">Calm / Chill</option>
                      <option value="MEDIUM">Balanced</option>
                      <option value="HIGH">High Energy</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-1">Setting</p>
                    <select
                      value={indoorMode}
                      onChange={(e) => setIndoorMode(e.target.value as IndoorMode)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold text-white uppercase"
                    >
                      <option value="ANY">Indoor/Outdoor</option>
                      <option value="INDOOR">Indoor Only</option>
                      <option value="OUTDOOR">Outdoor Only</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Event Grid */}
            <div className="p-6">
              {loading ? (
                <div className="h-96 flex flex-col items-center justify-center space-y-4">
                  <Loader2 className={`w-8 h-8 animate-spin ${current.accent}`} />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Scanning Horizon...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredEvents.map((e) => (
                    <div key={e.id} className="group bg-white rounded-3xl overflow-hidden shadow-2xl transition-transform hover:-translate-y-1 flex flex-col h-full">
                      <div className="relative h-48 md:h-56 bg-slate-900 overflow-hidden">
                        <img
                          src={e.hero}
                          alt={e.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute top-4 left-4 bg-black/90 border border-white/20 px-2 py-1 rounded-full">
                          <span className="text-[8px] font-black uppercase tracking-widest text-white">{e.source}</span>
                        </div>
                        <div className="absolute top-4 right-4 bg-white px-2 py-1 rounded-full flex items-center gap-1">
                          <Flame className="w-3 h-3 text-orange-500 fill-orange-500" />
                          <span className="text-[9px] font-black text-black">{e.hotScore}</span>
                        </div>
                      </div>
                      <div className="p-6 flex flex-col flex-1 space-y-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-slate-500 font-bold text-[10px] uppercase tracking-widest">
                            <Calendar className="w-3 h-3" />
                            {e.date}
                          </div>
                          <h3 className="text-xl font-black italic uppercase leading-none text-black tracking-tighter truncate" title={e.title}>
                            {e.title}
                          </h3>
                          <div className="flex items-center gap-1 text-slate-400 font-medium text-[10px] uppercase tracking-tight">
                            <MapPin className="w-3 h-3" />
                            {e.venue}
                          </div>
                        </div>

                        {/* Enrichment Chips */}
                        <div className="flex flex-wrap gap-1.5">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-bold uppercase tracking-wide">
                            {e.priceBand === "FREE" ? "Free" : e.priceBand}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-bold uppercase tracking-wide">
                            {e.energy}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-bold uppercase tracking-wide">
                            {e.indoor}
                          </span>
                        </div>

                        <div className="pt-2 flex gap-2">
                          <a
                            href={e.link}
                            target="_blank"
                            className="flex-1 bg-black text-white text-[10px] font-black uppercase tracking-[0.15em] py-3 rounded-xl text-center hover:bg-slate-800 transition-colors"
                          >
                            Details
                          </a>
                          <button className="p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                            <Share2 className="w-4 h-4 text-slate-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal (Simplified) */}
      {showSettings && (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <div className="relative w-full max-w-md bg-slate-950 border border-white/10 rounded-t-[3rem] md:rounded-[3rem] p-8 space-y-8 animate-in slide-in-from-bottom duration-500">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black italic uppercase text-white tracking-tighter">Preferences</h3>
              <button onClick={() => setShowSettings(false)} className="p-2 border border-white/10 rounded-full text-white/50"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Mode</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["SOLO", "DATE", "MATES", "FAMILY"] as SettingMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setProfile({ ...profile, mode: m })}
                      className={`py-3 rounded-2xl border text-[10px] font-black uppercase tracking-widest ${
                        profile.mode === m ? "bg-white text-black border-white" : "bg-white/5 border-white/10 text-white"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Default Region</p>
                <select 
                  value={location || ""} 
                  onChange={(e) => handleLocationSelect(e.target.value as Location)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold"
                >
                  <option value="">Select Region</option>
                  <option value="BRISBANE">Brisbane</option>
                  <option value="GC">Gold Coast</option>
                  <option value="SC">Sunshine Coast</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="w-full bg-white text-black py-4 rounded-3xl font-black uppercase tracking-[0.2em] text-xs"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
