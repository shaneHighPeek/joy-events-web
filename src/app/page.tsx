"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Compass,
  Flame,
  Loader2,
  Menu,
  Share2,
  Search,
  ChevronRight,
  MapPin,
  Calendar,
  Heart,
  Users,
  Sparkles,
  TrendingUp,
  ArrowRight,
  SlidersHorizontal,
  X,
  Mail,
  Bell,
  Plane,
  CalendarPlus,
  UserPlus,
  Zap,
  Gift,
  Shield,
  MessageCircle,
  ArrowDown,
  Check,
  Smartphone,
} from "lucide-react";

type Vibe = "DEFAULT" | "SPORTS" | "MUSIC" | "CHILL";
type Location = "BRISBANE" | "GC" | "SC";
type PriceBand = "ANY" | "FREE" | "$" | "$$" | "$$$";
type Energy = "ANY" | "LOW" | "MEDIUM" | "HIGH";
type IndoorMode = "ANY" | "INDOOR" | "OUTDOOR";
type PulseWindow = "NOW" | "TONIGHT" | "WEEKEND" | "NEXT_30" | "ANY";
type SortMode = "HOT" | "NEW" | "NEXT";
type SettingMode = "SOLO" | "DATE" | "MATES" | "FAMILY";

interface Event {
  id: string;
  title: string;
  date: string;
  venue: string;
  hero: string;
  link: string;
  source: string;
  priceBand: PriceBand | "TBC";
  energy: Energy;
  indoor: IndoorMode;
  hotScore: number;
}

const locationLabels: Record<Location, string> = {
  BRISBANE: "Brisbane",
  GC: "Gold Coast",
  SC: "Sunshine Coast",
};

const vibeList: Vibe[] = ["DEFAULT", "SPORTS", "MUSIC", "CHILL"];

const themes: Record<Vibe, { outsideBg: string; accent: string; visual: string; description: string }> = {
  DEFAULT: {
    outsideBg: "bg-slate-950",
    accent: "text-blue-400",
    visual: 'url("https://images.unsplash.com/photo-1518173946687-a4c8a9ba332f?auto=format&fit=crop&q=80&w=2000")',
    description: "Real local culture. Zero noise. Pure discovery.",
  },
  SPORTS: {
    outsideBg: "bg-[#2D0012]",
    accent: "text-amber-400",
    visual: 'url("https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&q=80&w=2000")',
    description: "Stadium nights, local rivalries, city buzz.",
  },
  MUSIC: {
    outsideBg: "bg-[#0a0a0a]",
    accent: "text-fuchsia-400",
    visual: 'url("https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=2000")',
    description: "From hidden bars to headline stages. Your sound.",
  },
  CHILL: {
    outsideBg: "bg-[#431407]",
    accent: "text-orange-400",
    visual: 'url("https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=2000")',
    description: "Slow mornings, sunset sessions, social spaces.",
  },
};

const locationCards = [
  {
    id: "BRISBANE" as Location,
    label: "Brisbane",
    subtitle: "River nights, laneways, hidden culture",
    icon: "🏙️",
    gradient: "from-blue-600/20 via-cyan-500/10 to-transparent",
    borderGlow: "group-hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]",
  },
  {
    id: "GC" as Location,
    label: "Gold Coast",
    subtitle: "Beach energy, nightlife, sun-soaked scenes",
    icon: "🌊",
    gradient: "from-amber-600/20 via-orange-500/10 to-transparent",
    borderGlow: "group-hover:shadow-[0_0_30px_rgba(251,146,60,0.3)]",
  },
  {
    id: "SC" as Location,
    label: "Sunshine Coast",
    subtitle: "Markets, live music, laid-back vibes",
    icon: "🌅",
    gradient: "from-emerald-600/20 via-teal-500/10 to-transparent",
    borderGlow: "group-hover:shadow-[0_0_30px_rgba(16,185,129,0.3)]",
  },
];

function getEnergyLabel(level: Energy) {
  if (level === "LOW") return "Calm Vibe";
  if (level === "MEDIUM") return "Balanced Energy";
  if (level === "HIGH") return "High Intensity";
  return "Any Energy";
}

function getIndoorLabel(mode: IndoorMode) {
  if (mode === "INDOOR") return "Indoor";
  if (mode === "OUTDOOR") return "Outdoor";
  return "Indoor/Outdoor";
}

export default function Home() {
  const [vibe, setVibe] = useState<Vibe>("DEFAULT");
  const [location, setLocation] = useState<Location | null>(null);
  const [showEvents, setShowEvents] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"profile" | "connect" | "plan" | "notify" | "discover">("profile");

  const [query, setQuery] = useState("");
  const [priceBand, setPriceBand] = useState<PriceBand>("ANY");
  const [energy, setEnergy] = useState<Energy>("ANY");
  const [indoorMode, setIndoorMode] = useState<IndoorMode>("ANY");
  const [pulseWindow, setPulseWindow] = useState<PulseWindow>("ANY");
  const [sortMode, setSortMode] = useState<SortMode>("HOT");

  const [savedEventIds, setSavedEventIds] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Profile
  const [mode, setMode] = useState<SettingMode>("SOLO");
  const [authEmail, setAuthEmail] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Social Connect
  const [socialMatchOptIn, setSocialMatchOptIn] = useState(false);

  // Trip Planner
  const [tripRegion, setTripRegion] = useState<Location>("BRISBANE");
  const [tripVibe, setTripVibe] = useState<Vibe>("DEFAULT");
  const [tripPlan, setTripPlan] = useState<string[]>([]);
  const [tripLoading, setTripLoading] = useState(false);

  // Notifications
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifyTypes, setNotifyTypes] = useState<string[]>(["TONIGHT", "WEEKEND"]);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyLoading, setNotifyLoading] = useState(false);

  const current = themes[vibe];

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      setUserId(user?.id ?? null);
      setUserEmail(user?.email ?? null);
      if (user?.id) loadSavedEvents(user.id);
    });
  }, []);

  const loadSavedEvents = async (uid: string) => {
    if (!supabase) return;
    const { data } = await supabase.from("saved_events").select("event_id").eq("user_id", uid);
    if (data) setSavedEventIds(data.map((r) => r.event_id));
  };

  const logEventClick = async (event: Event) => {
    if (!supabase) return;
    
    const clickData = {
      event_id: event.id,
      event_title: event.title,
      event_link: event.link,
      user_id: userId,
      location: location,
      vibe: vibe,
      source: event.source,
      user_agent: navigator.userAgent,
      referrer: document.referrer
    };

    try {
      const { error } = await supabase.from("event_clicks").insert(clickData);
      if (error) console.error("Click log failed:", error);
    } catch (e) {
      console.error("Click log error:", e);
    }
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
    const filtered = events.filter((e) => {
      const q = query.toLowerCase();
      const matchQuery = !q || e.title.toLowerCase().includes(q) || e.venue.toLowerCase().includes(q);
      const matchPrice = priceBand === "ANY" || e.priceBand === priceBand;
      const matchEnergy = energy === "ANY" || e.energy === energy;
      const matchIndoor = indoorMode === "ANY" || e.indoor === indoorMode;
      const matchPulse =
        pulseWindow === "ANY" ||
        (pulseWindow === "NOW" && /today|now/i.test(e.date)) ||
        (pulseWindow === "TONIGHT" && /today|tonight/i.test(e.date)) ||
        (pulseWindow === "WEEKEND" && /sat|sun|weekend/i.test(e.date)) ||
        (pulseWindow === "NEXT_30" && /mar|apr|may|jun|jul|aug|sep|oct|nov|dec|jan|feb/i.test(e.date));
      return matchQuery && matchPrice && matchEnergy && matchIndoor && matchPulse;
    });

    return [...filtered].sort((a, b) => {
      if (sortMode === "HOT") return (b.hotScore || 50) - (a.hotScore || 50);
      if (sortMode === "NEW") return b.id.localeCompare(a.id);
      if (sortMode === "NEXT") return a.date.localeCompare(b.date);
      return 0;
    });
  }, [events, query, priceBand, energy, indoorMode, pulseWindow, sortMode]);

  const featuredEvent = filteredEvents[0] || null;
  const remainingEvents = filteredEvents.slice(1);
  const tonightCount = useMemo(() => events.filter((e) => /today|tonight/i.test(e.date)).length, [events]);
  const monthCount = useMemo(() => events.length, [events]);
  const freeCount = useMemo(() => events.filter((e) => e.priceBand === "FREE").length, [events]);

  const sendMagicLink = async () => {
    if (!supabase || !authEmail.trim()) {
      setAuthMessage("Enter an email first.");
      return;
    }
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: authEmail.trim(),
      options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
    });
    setAuthMessage(error ? error.message : "✨ Magic link sent! Check your inbox.");
    setAuthLoading(false);
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUserId(null);
    setUserEmail(null);
    setAuthMessage("Signed out.");
  };

  const generateTripPlan = async () => {
    setTripLoading(true);
    try {
      const res = await fetch(`/api/events?vibe=${tripVibe}&location=${tripRegion}`);
      const data = await res.json();
      const picks = (data.events || []).slice(0, 4);
      const plan = [
        `Day 1 Morning: ${picks[0]?.title || "Cafe + local walk"}`,
        `Day 1 Evening: ${picks[1]?.title || "Live event"}`,
        `Day 2 Morning: ${picks[2]?.title || "Market or cultural stop"}`,
        `Day 2 Evening: ${picks[3]?.title || "Final night feature"}`,
      ];
      setTripPlan(plan);
    } catch (error) {
      console.error("Trip plan failed", error);
    } finally {
      setTripLoading(false);
    }
  };

  const submitNotificationIntent = async () => {
    if (!notifyEmail.trim() || notifyTypes.length === 0 || !supabase) {
      setNotifyMessage("Enter email and pick at least one alert type.");
      return;
    }
    setNotifyLoading(true);
    const { error } = await supabase.from("notification_intents").insert({
      user_id: userId,
      email: notifyEmail.trim(),
      region: location || "ANY",
      vibe: vibe,
      intent_types: notifyTypes,
      created_at: new Date().toISOString(),
    });
    setNotifyLoading(false);
    setNotifyMessage(error ? "Could not save right now." : "✅ You're on the list!");
  };

  const toggleNotifyType = (type: string) => {
    setNotifyTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  };

  const AppFooter = () => (
    <footer className="w-full mt-20 border-t border-white/10 pt-12 pb-24 px-6 md:px-12 text-slate-400">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-4">
          <h4 className="text-xl font-black italic uppercase tracking-tighter text-white">jOY EVENTS</h4>
          <p className="text-sm leading-relaxed max-w-sm">
            Service-first event discovery for Brisbane, Gold Coast, and Sunshine Coast. Built for belonging, not ad inventory.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white">Legal</p>
            <nav className="flex flex-col gap-3 text-xs">
              <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <span className="hover:text-white cursor-pointer transition-colors">Data Policy</span>
            </nav>
          </div>
          <div className="space-y-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white">Trust</p>
            <div className="space-y-2 text-[10px] leading-relaxed">
              <p><span className="font-black text-slate-300">Disclaimer:</span> Event times and availability can change. Verify before travel.</p>
              <p><span className="font-black text-slate-300">Sources:</span> Council Open Data, Ticketmaster API, Community Input.</p>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-white/5 text-[10px] uppercase tracking-widest text-slate-600 font-bold flex justify-between items-center">
        <span>© 2026 jOY Discovery Engine</span>
        <div className="flex gap-4">
          <span>Brisbane</span>
          <span>Gold Coast</span>
          <span>Sunshine Coast</span>
        </div>
      </div>
    </footer>
  );

  return (
    <main className={`min-h-screen transition-all duration-1000 flex flex-col items-center relative ${current.outsideBg}`}>
      <div
        className="fixed inset-0 z-0 opacity-50 transition-all duration-1000"
        style={{ backgroundImage: current.visual, backgroundSize: "cover", backgroundPosition: "center", filter: "brightness(0.4)" }}
      />

      {/* POV Phone Frame Overlay (Desktop Only) - Decorative top bezel */}
      <div className="hidden md:block fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[1400px] h-32 z-[120] pointer-events-none">
        <div className="absolute inset-0 rounded-b-[4rem] border-8 border-t-0 border-slate-100 shadow-[0_0_60px_rgba(255,255,255,0.15),inset_0_-20px_40px_rgba(0,0,0,0.3)]" style={{ background: 'linear-gradient(180deg, rgba(248,250,252,0.95) 0%, rgba(248,250,252,0.85) 50%, transparent 100%)' }}>
          {/* Sensor housing notch */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-48 h-8 bg-black/90 rounded-b-3xl border-x border-b border-slate-800/50">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-slate-700/50 rounded-full" />
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 w-full min-h-screen flex flex-col">

          {/* Header */}
          <div className="h-20 bg-black/60 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6 sticky top-0 z-[100]">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black italic tracking-tighter text-white cursor-pointer" onClick={() => setShowEvents(false)}>jOY</h1>
              <span className={`text-[8px] font-black uppercase tracking-[0.25em] ${current.accent}`}>Events</span>
            </div>
            {/* Vibe Selector (Visible everywhere) */}
            <div className="flex gap-4 md:gap-6 overflow-x-auto no-scrollbar">
              {vibeList.map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    setVibe(v);
                    if (location) fetchEvents(v, location);
                  }}
                  className={`text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${
                    vibe === v ? "text-white underline underline-offset-8 decoration-2" : "text-white/30 hover:text-white/70"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="relative p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-white/70 hover:text-white transition-all group shrink-0"
            >
              <Menu className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse border-2 border-black" />
            </button>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col">
            {/* Landing */}
            {!showEvents && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 space-y-12 animate-in fade-in zoom-in-95 duration-700">
                <div className="text-center space-y-6 max-w-2xl mt-8">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Sparkles className={`w-5 h-5 ${current.accent}`} />
                    <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${current.accent}`}>South East Queensland</span>
                    <Sparkles className={`w-5 h-5 ${current.accent}`} />
                  </div>
                  <h2 className="text-[14vw] md:text-8xl font-black italic uppercase tracking-tighter leading-[0.85] text-white">
                    FIND YOUR <span className={current.accent}>JOY</span>
                  </h2>
                  <p className="text-lg md:text-xl text-slate-300 font-medium leading-relaxed">{current.description}</p>
                </div>

                <div className="w-full max-w-5xl space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Choose Your City</p>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600 flex items-center gap-1">
                      <Compass className="w-3 h-3" />
                      Explore More Inside
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {locationCards.map((loc) => (
                      <button
                        key={loc.id}
                        onClick={() => handleLocationSelect(loc.id)}
                        className={`group relative bg-gradient-to-br ${loc.gradient} backdrop-blur-sm border border-white/10 rounded-3xl p-6 md:p-8 text-left transition-all duration-500 hover:border-white/30 hover:-translate-y-2 ${loc.borderGlow}`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl" />
                        <div className="relative flex items-start justify-between mb-4">
                          <div className="text-5xl mb-2">{loc.icon}</div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="bg-white/10 border border-white/20 text-white px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                              <Flame className="w-3 h-3 fill-orange-400 text-orange-400" />
                              Live Now
                            </span>
                          </div>
                        </div>
                        <h3 className="relative text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-white leading-none mb-2">
                          {loc.label}
                        </h3>
                        <p className="relative text-sm text-slate-300 font-medium mb-4">{loc.subtitle}</p>
                        <div className="relative flex items-center justify-between pt-4 border-t border-white/10">
                          <div className="flex flex-col">
                            <span className="text-2xl font-black text-white">{events.length || "42"}</span>
                            <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-slate-400">Events This Week</span>
                          </div>
                          <div className="flex items-center gap-2 text-white/70 group-hover:text-white transition-colors">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Explore</span>
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        </div>
                        <div className="absolute top-6 right-6 w-3 h-3">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 text-center space-y-3">
                    <div className="flex items-center justify-center gap-2">
                      <Users className={`w-5 h-5 ${current.accent}`} />
                      <p className="text-sm font-black uppercase tracking-[0.2em] text-white">Not Alone</p>
                    </div>
                    <p className="text-slate-300 text-sm font-medium max-w-lg mx-auto leading-relaxed">
                      Thousands of locals and visitors use jOY to cure loneliness. There's always more happening than you think. Pick a city and discover your people.
                    </p>
                  </div>
                </div>
                <AppFooter />
              </div>
            )}

            {/* Events View */}
            {showEvents && (
              <div className="flex-1 flex flex-col animate-in slide-in-from-right duration-500">
                {/* The Invitation (Hero POV) */}
                {featuredEvent && (
                  <div className="relative h-[50vh] md:h-[60vh] w-full overflow-hidden border-b border-white/10">
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${featuredEvent.hero})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
                    
                    <div className="relative h-full flex flex-col justify-end p-6 md:p-12 max-w-4xl">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="bg-emerald-500 border border-emerald-400 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-full tracking-widest flex items-center gap-2">
                          <Sparkles className="w-3 h-3" />
                          Tonight's Invitation
                        </span>
                        <span className="bg-white/10 border border-white/20 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-full tracking-widest">
                          LIVE NOW
                        </span>
                      </div>

                      <h2 className="text-4xl md:text-7xl font-black italic uppercase tracking-tighter leading-[0.85] mb-4 text-white">
                        {featuredEvent.title}
                      </h2>

                      <div className="flex flex-wrap items-center gap-4 mb-6 text-sm md:text-base">
                        <div className="flex items-center gap-2 text-slate-200 font-bold">
                          <MapPin className="w-4 h-4" />
                          {featuredEvent.venue}
                        </div>
                        <div className="flex items-center gap-2 text-slate-200 font-bold">
                          <Calendar className="w-4 h-4" />
                          {featuredEvent.date}
                        </div>
                        {featuredEvent.priceBand === "FREE" && (
                          <span className="bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-black uppercase">Free Entry</span>
                        )}
                      </div>

                      <p className="text-lg md:text-xl text-slate-200 font-medium leading-relaxed max-w-2xl mb-6">
                        <span className="font-black text-white">200+ people are going.</span> You belong here. Come as you are—solo, with friends, or make new ones.
                      </p>

                      <div className="flex flex-col md:flex-row gap-3 mb-4">
                        <a
                          href={featuredEvent.link}
                          target="_blank"
                          onClick={() => logEventClick(featuredEvent)}
                          className="bg-white text-black px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-[0.2em] hover:bg-slate-100 transition-all flex items-center justify-center gap-2 shadow-2xl"
                        >
                          <Check className="w-5 h-5" />
                          I'm Going
                        </a>
                        <button
                          onClick={() => {
                            const grid = document.getElementById("discovery-grid");
                            grid?.scrollIntoView({ behavior: "smooth" });
                          }}
                          className="border-2 border-white text-white px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                        >
                          Not Sure? See What Else Is On
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                        <div className="flex -space-x-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 border-2 border-black" />
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-400 to-pink-500 border-2 border-black" />
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 border-2 border-black" />
                        </div>
                        <span>And many others from {locationLabels[location!] || "SEQ"}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Discovery Grid */}
                <div id="discovery-grid" className="p-6 border-b border-white/10 space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Sparkles className={`w-5 h-5 ${current.accent}`} />
                      <div>
                        <p className="text-sm font-black uppercase tracking-[0.2em] text-white">Or Explore More</p>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                          {remainingEvents.length} events this week • More added daily
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="flex bg-white/5 border border-white/10 rounded-xl p-1">
                        {(["HOT", "NEW", "NEXT"] as SortMode[]).map((m) => (
                          <button
                            key={m}
                            onClick={() => setSortMode(m)}
                            className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${
                              sortMode === m ? "bg-white text-black" : "text-white/40 hover:text-white/70"
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-3 py-2 flex items-center gap-2 rounded-xl border transition-all ${
                          showFilters ? "bg-white text-black border-white" : "bg-white/5 border-white/10 text-white"
                        }`}
                      >
                        <SlidersHorizontal className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">Refine</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {([
                      { id: "ANY", label: "All", count: monthCount },
                      { id: "NOW", label: "Now", count: 0 },
                      { id: "TONIGHT", label: "Tonight", count: tonightCount },
                      { id: "WEEKEND", label: "Weekend", count: 0 },
                      { id: "NEXT_30", label: "Next 30 Days", count: 0 },
                    ] as const).map((pulse) => (
                      <button
                        key={pulse.id}
                        onClick={() => setPulseWindow(pulse.id)}
                        className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-[0.15em] transition-all ${
                          pulseWindow === pulse.id ? "bg-white text-black border-white" : "bg-white/5 border-white/10 text-white hover:border-white/30"
                        }`}
                      >
                        {pulse.label}
                        {pulse.count && pulse.count > 0 && (
                          <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[8px] font-black ${pulseWindow === pulse.id ? "bg-black text-white" : "bg-white/10 text-white"}`}>
                            {pulse.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {showFilters && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Search events or venues..."
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-white/30 transition-all"
                        />
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-1">Price</p>
                          <select
                            value={priceBand}
                            onChange={(e) => setPriceBand(e.target.value as PriceBand)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-[10px] font-bold text-white uppercase"
                          >
                            <option value="ANY">Any Price</option>
                            <option value="FREE">Free ({freeCount})</option>
                            <option value="$">Budget ($)</option>
                            <option value="$$">Moderate ($$)</option>
                            <option value="$$$">Premium ($$$)</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-1">Energy</p>
                          <select
                            value={energy}
                            onChange={(e) => setEnergy(e.target.value as Energy)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-[10px] font-bold text-white uppercase"
                          >
                            <option value="ANY">Any Energy</option>
                            <option value="LOW">Calm</option>
                            <option value="MEDIUM">Balanced</option>
                            <option value="HIGH">High</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-1">Setting</p>
                          <select
                            value={indoorMode}
                            onChange={(e) => setIndoorMode(e.target.value as IndoorMode)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-[10px] font-bold text-white uppercase"
                          >
                            <option value="ANY">Any</option>
                            <option value="INDOOR">Indoor</option>
                            <option value="OUTDOOR">Outdoor</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {loading ? (
                    <div className="h-96 flex flex-col items-center justify-center space-y-4">
                      <Loader2 className={`w-8 h-8 animate-spin ${current.accent}`} />
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Finding Your Joy...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-12">
                      {remainingEvents.map((e) => (
                        <div key={e.id} className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 flex flex-col">
                          <div className="relative h-48 bg-slate-900 overflow-hidden">
                            <img src={e.hero} alt={e.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            <div className="absolute top-3 left-3 bg-black/90 border border-white/20 px-2 py-1 rounded-full">
                              <span className="text-[8px] font-black uppercase tracking-widest text-white">{e.source}</span>
                            </div>
                            <div className="absolute top-3 right-3 bg-white px-2 py-1 rounded-full flex items-center gap-1 shadow-md">
                              <Flame className="w-3 h-3 text-orange-500 fill-orange-500" />
                              <span className="text-[9px] font-black text-black">{e.hotScore || 50}</span>
                            </div>
                          </div>
                          <div className="p-4 flex flex-col flex-1 space-y-3">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 text-slate-500 font-bold text-[10px] uppercase tracking-wide">
                                <Calendar className="w-3 h-3" />
                                {e.date}
                              </div>
                              <h3 className="text-base font-black italic uppercase leading-tight text-black tracking-tighter line-clamp-2" title={e.title}>
                                {e.title}
                              </h3>
                              <div className="flex items-center gap-1.5 text-slate-400 font-medium text-[10px] uppercase tracking-tight">
                                <MapPin className="w-3 h-3" />
                                <span className="truncate">{e.venue}</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {e.priceBand === "FREE" && (
                                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[8px] font-black uppercase tracking-wider">Free Entry</span>
                              )}
                              <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[8px] font-black uppercase tracking-wider">{getEnergyLabel(e.energy)}</span>
                              <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[8px] font-black uppercase tracking-wider">{getIndoorLabel(e.indoor)}</span>
                            </div>

                            <div className="flex-1" />

                            <div className="flex gap-2">
                              <a
                                href={e.link}
                                target="_blank"
                                onClick={() => logEventClick(e)}
                                className="flex-1 bg-black text-white text-[10px] font-black uppercase tracking-[0.12em] py-2.5 rounded-xl text-center hover:bg-slate-800 transition-colors"
                              >
                                Details
                              </a>
                              <button className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                                <Heart className="w-4 h-4 text-slate-600" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {remainingEvents.length === 0 && !loading && (
                    <div className="text-center py-12 space-y-3">
                      <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">No other matches</p>
                      <p className="text-xs text-slate-600">Try adjusting your filters or go with tonight's invitation!</p>
                    </div>
                  )}
                  
                  <div className="py-6 border-t border-white/10 flex justify-between items-center">
                    <button
                      onClick={() => setShowEvents(false)}
                      className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-colors flex items-center gap-2"
                    >
                      ← Back to Cities
                    </button>
                  </div>
                </div>
                <AppFooter />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Hub */}
      {showSettings && (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowSettings(false)} />
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-slate-950 border border-white/10 rounded-t-[3rem] md:rounded-[3rem] overflow-hidden animate-in slide-in-from-bottom duration-500">
            <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-xl border-b border-white/10 p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-2xl font-black italic uppercase text-white tracking-tighter">Connect & Plan</h3>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-bold mt-1">Unlock Your jOY Features</p>
                </div>
                <button onClick={() => setShowSettings(false)} className="p-2 border border-white/10 rounded-full text-white/50 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {[
                  { id: "profile", label: "Profile", icon: UserPlus },
                  { id: "connect", label: "Connect", icon: Users },
                  { id: "plan", label: "Trip Plan", icon: Plane },
                  { id: "notify", label: "Alerts", icon: Bell },
                  { id: "discover", label: "Discover", icon: Sparkles },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSettingsTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-[0.15em] whitespace-nowrap transition-all ${
                      settingsTab === tab.id ? "bg-white text-black border-white" : "bg-white/5 border-white/10 text-white hover:border-white/30"
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-160px)]">
              {/* Profile */}
              {settingsTab === "profile" && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-blue-400" />
                      <p className="text-sm font-black uppercase tracking-[0.2em] text-white">Free Account</p>
                    </div>
                    {userId ? (
                      <div className="space-y-3">
                        <p className="text-sm text-slate-300">Signed in as {userEmail || "user"}.</p>
                        <button
                          onClick={signOut}
                          className="px-4 py-2 rounded-xl border border-white/20 text-xs font-black uppercase tracking-[0.15em] hover:bg-white/5"
                        >
                          Sign Out
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <input
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm text-white"
                        />
                        <button
                          onClick={sendMagicLink}
                          disabled={authLoading}
                          className="w-full bg-white text-black py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] disabled:opacity-60"
                        >
                          {authLoading ? <Loader2 className="inline w-4 h-4 animate-spin" /> : "Send Magic Link"}
                        </button>
                      </div>
                    )}
                    {authMessage && <p className="text-xs text-slate-400">{authMessage}</p>}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
                    <p className="text-sm font-black uppercase tracking-[0.2em] text-white">Social Mode</p>
                    <div className="grid grid-cols-2 gap-3">
                      {(["SOLO", "DATE", "MATES", "FAMILY"] as SettingMode[]).map((m) => (
                        <button
                          key={m}
                          onClick={() => setMode(m)}
                          className={`py-3 rounded-xl border text-[10px] font-black uppercase tracking-[0.15em] transition-all ${
                            mode === m ? "bg-white text-black border-white" : "bg-white/5 border-white/10 text-white hover:border-white/30"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Connect */}
              {settingsTab === "connect" && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-emerald-400" />
                      <p className="text-sm font-black uppercase tracking-[0.2em] text-white">Social Match (Anonymous)</p>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      See anonymous compatible attendees for events. Connect with people who share your vibe—privately and respectfully.
                    </p>
                    <button
                      onClick={() => setSocialMatchOptIn(!socialMatchOptIn)}
                      className={`w-full py-3 rounded-xl border text-[10px] font-black uppercase tracking-[0.15em] transition-all ${
                        socialMatchOptIn ? "bg-emerald-500 text-white border-emerald-500" : "bg-white/5 border-white/10 text-white"
                      }`}
                    >
                      {socialMatchOptIn ? "✅ Opt-In Active" : "Opt In to Social Match"}
                    </button>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-fuchsia-400" />
                      <p className="text-sm font-black uppercase tracking-[0.2em] text-white">Group Planning</p>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      Build shortlists with friends. Vote on events. Share plans. Coming soon.
                    </p>
                  </div>
                </div>
              )}

              {/* Trip Plan */}
              {settingsTab === "plan" && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <Plane className="w-5 h-5 text-orange-400" />
                      <p className="text-sm font-black uppercase tracking-[0.2em] text-white">48h Visitor Quickstart</p>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">Generate a 2-day event itinerary based on your vibe and budget.</p>
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        value={tripRegion}
                        onChange={(e) => setTripRegion(e.target.value as Location)}
                        className="bg-slate-900 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white"
                      >
                        <option value="BRISBANE">Brisbane</option>
                        <option value="GC">Gold Coast</option>
                        <option value="SC">Sunshine Coast</option>
                      </select>
                      <select
                        value={tripVibe}
                        onChange={(e) => setTripVibe(e.target.value as Vibe)}
                        className="bg-slate-900 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white"
                      >
                        <option value="DEFAULT">Default</option>
                        <option value="SPORTS">Sports</option>
                        <option value="MUSIC">Music</option>
                        <option value="CHILL">Chill</option>
                      </select>
                    </div>
                    <button
                      onClick={generateTripPlan}
                      disabled={tripLoading}
                      className="w-full bg-orange-500 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] disabled:opacity-60"
                    >
                      {tripLoading ? <Loader2 className="inline w-4 h-4 animate-spin" /> : "Generate Plan"}
                    </button>
                    {tripPlan.length > 0 && (
                      <div className="space-y-2 mt-4">
                        {tripPlan.map((stop, idx) => (
                          <p key={idx} className="text-sm text-slate-300 bg-black/30 border border-white/10 rounded-xl p-3">
                            {stop}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notify */}
              {settingsTab === "notify" && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <Bell className="w-5 h-5 text-amber-400" />
                      <p className="text-sm font-black uppercase tracking-[0.2em] text-white">Get Notified</p>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">Capture your interests now. We'll send you alerts when matching events drop.</p>
                    <input
                      value={notifyEmail}
                      onChange={(e) => setNotifyEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm text-white"
                    />
                    <div className="flex flex-wrap gap-2">
                      {(["TONIGHT", "WEEKEND", "NEAR_ME", "NEW_DROPS"] as string[]).map((type) => (
                        <button
                          key={type}
                          onClick={() => toggleNotifyType(type)}
                          className={`px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-[0.15em] transition-all ${
                            notifyTypes.includes(type) ? "bg-amber-500 text-white border-amber-500" : "bg-white/5 border-white/10 text-white"
                          }`}
                        >
                          {type.replace("_", " ")}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={submitNotificationIntent}
                      disabled={notifyLoading}
                      className="w-full bg-amber-500 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] disabled:opacity-60"
                    >
                      {notifyLoading ? <Loader2 className="inline w-4 h-4 animate-spin" /> : "Save Alert Preferences"}
                    </button>
                    {notifyMessage && <p className="text-xs text-slate-400">{notifyMessage}</p>}
                  </div>
                </div>
              )}

              {/* Discover (10 Differences) */}
              {settingsTab === "discover" && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/10 p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-fuchsia-400" />
                      <p className="text-sm font-black uppercase tracking-[0.2em] text-white">What Makes jOY Different</p>
                    </div>
                    <div className="space-y-3">
                      {[
                        { icon: Shield, text: "Real event sources • No fake listings" },
                        { icon: Heart, text: "Built to cure loneliness, not sell ads" },
                        { icon: Users, text: "Anonymous social matching (opt-in)" },
                        { icon: Zap, text: "Smart filters: Price, Energy, Indoor/Outdoor" },
                        { icon: CalendarPlus, text: "48h trip planner for visitors" },
                        { icon: Bell, text: "Notification intents (not spam)" },
                        { icon: TrendingUp, text: "Live event counts & Hot Meter" },
                        { icon: Gift, text: "Free events highlighted" },
                        { icon: MapPin, text: "3 cities: Brisbane, Gold Coast, Sunshine Coast" },
                        { icon: Compass, text: "Discovery-first design • Always more to explore" },
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-start gap-3 bg-black/30 border border-white/10 rounded-xl p-4">
                          <item.icon className="w-5 h-5 text-fuchsia-400 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-slate-300 leading-relaxed">{item.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-slate-950/95 backdrop-blur-xl border-t border-white/10 p-6">
              <button
                onClick={() => setShowSettings(false)}
                className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
