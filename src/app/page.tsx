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

interface EventFeedbackState {
  matchVibe?: boolean;
  recommend?: boolean;
}

interface TrustScore {
  score: number;
  label: "High" | "Medium" | "Low";
  reason: string;
}

interface SocialMatchProfile {
  id: string;
  alias: string;
  matchPercent: number;
  mode: SettingMode;
}

interface GroupVoteState {
  yes: number;
  no: number;
  maybe: number;
}

interface PlanStop {
  id: string;
  eventId: string;
  title: string;
  venue: string;
  stopType: "FOOD" | "EVENT" | "AFTER";
  timeLabel: string;
}

const defaultProfile: PreferenceProfile = {
  mode: "SOLO",
  budget: "$$",
  energy: "MEDIUM",
  radius: 25,
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
    visual:
      'url("https://images.unsplash.com/photo-1518173946687-a4c8a9ba332f?auto=format&fit=crop&q=80&w=2000")',
    description:
      "The SEQ Discovery Engine. Discover real local culture without the noise.",
  },
  SPORTS: {
    outsideBg: "bg-[#2D0012]",
    accent: "text-[#FFB81C]",
    glow: "shadow-[#FFB81C]/30",
    visual:
      'url("https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&q=80&w=2000")',
    description:
      "The game is calling. Stadium nights, local rivalries, city buzz.",
  },
  MUSIC: {
    outsideBg: "bg-[#0a0a0a]",
    accent: "text-fuchsia-500",
    glow: "shadow-fuchsia-500/30",
    visual:
      'url("https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=2000")',
    description:
      "From hidden bars to headline stages. Find the sound that fits tonight.",
  },
  CHILL: {
    outsideBg: "bg-[#431407]",
    accent: "text-[#FF7E5F]",
    glow: "shadow-[#FF7E5F]/30",
    visual:
      'url("https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=2000")',
    description:
      "Slow mornings, sunset sessions, and social spaces that feel welcoming.",
  },
};

function getHotLabel(score: number) {
  if (score >= 85) return "Buzzing";
  if (score >= 65) return "Hot";
  if (score >= 45) return "Warm";
  return "Cold";
}

function getHotClass(score: number) {
  if (score >= 85) return "bg-red-600 text-white";
  if (score >= 65) return "bg-orange-500 text-white";
  if (score >= 45) return "bg-amber-300 text-black";
  return "bg-slate-300 text-black";
}

function getEnergyLabel(level: Energy) {
  if (level === "LOW") return "Calm";
  if (level === "MEDIUM") return "Balanced";
  if (level === "HIGH") return "High Energy";
  return "Any Energy";
}

function getTrustScore(event: Event): TrustScore {
  const sourceWeights: Record<string, number> = {
    "Council Feed": 32,
    Ticketmaster: 30,
    "League Partner": 29,
    "Venue Partner": 27,
    "Community Source": 21,
    "Local Host": 20,
    "Stadium Feed": 28,
    "Bands Feed": 26,
  };

  const sourceBase = sourceWeights[event.source] ?? 20;
  const recencyBase = /10m/i.test(event.updatedLabel) ? 24 : 18;
  const completeness = event.venue.includes("TBC") || event.priceBand === "TBC" ? 10 : 18;
  const momentum = Math.round(event.hotScore * 0.3);
  const score = Math.max(18, Math.min(98, sourceBase + recencyBase + completeness + momentum));
  const label: TrustScore["label"] = score >= 78 ? "High" : score >= 60 ? "Medium" : "Low";
  const reason =
    label === "High"
      ? "Strong source + fresh listing"
      : label === "Medium"
        ? "Good signal, still verify details"
        : "Limited signal, verify before attending";

  return { score, label, reason };
}

function getTrustClass(label: TrustScore["label"]) {
  if (label === "High") return "bg-emerald-500/20 border-emerald-400/70 text-emerald-100";
  if (label === "Medium") return "bg-amber-500/20 border-amber-400/70 text-amber-100";
  return "bg-rose-500/20 border-rose-400/70 text-rose-100";
}

function createSocialMatches(event: Event): SocialMatchProfile[] {
  const aliases = ["WaveRider_21", "CitySpark", "NightMuse", "CoastLocal", "VibeScout", "EventNomad"];
  return aliases.slice(0, 3).map((alias, idx) => ({
    id: `${event.id}-m-${idx}`,
    alias,
    matchPercent: Math.max(62, Math.min(96, event.hotScore + 6 - idx * 7)),
    mode: idx === 0 ? "SOLO" : idx === 1 ? "MATES" : "DATE",
  }));
}

function trackEvent(name: string, payload: Record<string, unknown>) {
  if (typeof window === "undefined") return;

  const eventData = {
    event: name,
    ts: Date.now(),
    ...payload,
  };

  const dataLayer = (window as unknown as { dataLayer?: Array<Record<string, unknown>> }).dataLayer;
  if (Array.isArray(dataLayer)) {
    dataLayer.push(eventData);
    return;
  }

  console.debug("[jOY analytics]", eventData);
}

function enrichEvents(
  rawEvents: Array<{ id: string; title: string; date: string; venue: string; hero: string; link: string }>,
  selectedVibe: Vibe,
): Event[] {
  const sources = {
    DEFAULT: ["Council Feed", "Ticketmaster", "Community Source"],
    SPORTS: ["Ticketmaster", "Stadium Feed", "League Partner"],
    MUSIC: ["Bands Feed", "Venue Partner", "Community Source"],
    CHILL: ["Council Feed", "Local Host", "Venue Partner"],
  } as const;

  const prices: Array<Event["priceBand"]> = ["FREE", "$", "$$", "$$$"];
  const energies: Array<Event["energy"]> = ["LOW", "MEDIUM", "HIGH"];
  const indoorModes: Array<Event["indoor"]> = ["INDOOR", "OUTDOOR"];

  return rawEvents.map((event, index) => {
    const baseScore = Math.max(18, 35 + ((event.title.length + index * 17) % 60));
    const cleanVenue = event.venue?.trim() || "Venue TBC";
    const hasVenue = cleanVenue !== "Venue TBC";
    const distanceKm = 4 + ((index * 7 + event.title.length) % 52);

    return {
      ...event,
      venue: cleanVenue,
      source: sources[selectedVibe][index % sources[selectedVibe].length],
      updatedLabel: index % 2 === 0 ? "Updated 10m ago" : "Updated 45m ago",
      priceBand: hasVenue ? prices[index % prices.length] : "TBC",
      energy: energies[index % energies.length],
      indoor: indoorModes[index % indoorModes.length],
      distanceKm,
      hotScore: Math.min(baseScore, 96),
    };
  });
}

export default function Home() {
  const [vibe, setVibe] = useState<Vibe>("DEFAULT");
  const [location, setLocation] = useState<Location | null>(null);
  const [showEvents, setShowEvents] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [query, setQuery] = useState("");
  const [dateWindow, setDateWindow] = useState<DateWindow>("ANY");
  const [priceBand, setPriceBand] = useState<PriceBand>("ANY");
  const [energy, setEnergy] = useState<Energy>("ANY");
  const [indoorMode, setIndoorMode] = useState<IndoorMode>("ANY");
  const [nearMeNow, setNearMeNow] = useState(false);
  const [adaptiveMode, setAdaptiveMode] = useState<AdaptiveMode>("NONE");
  const [pulseWindow, setPulseWindow] = useState<PulseWindow | "ANY">("ANY");

  const [profile, setProfile] = useState<PreferenceProfile>(defaultProfile);
  const [savedEventIds, setSavedEventIds] = useState<string[]>([]);
  const viewedEventIds = useRef<Set<string>>(new Set());
  const [feedbackByEvent, setFeedbackByEvent] = useState<Record<string, EventFeedbackState>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authEmailInput, setAuthEmailInput] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifyRegion, setNotifyRegion] = useState<Location | "ANY">("ANY");
  const [notifyVibe, setNotifyVibe] = useState<Vibe | "ANY">("ANY");
  const [notifyTypes, setNotifyTypes] = useState<string[]>(["TONIGHT", "NEAR_ME"]);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [showVisitorQuickstart, setShowVisitorQuickstart] = useState(false);
  const [visitorRegion, setVisitorRegion] = useState<Location>("BRISBANE");
  const [visitorVibe, setVisitorVibe] = useState<Vibe>("DEFAULT");
  const [visitorBudget, setVisitorBudget] = useState<PriceBand>("$$");
  const [visitorTravelStyle, setVisitorTravelStyle] = useState<VisitorTravelStyle>("EXPLORE");
  const [visitorLoading, setVisitorLoading] = useState(false);
  const [visitorPlan, setVisitorPlan] = useState<string[]>([]);
  const [socialMatchOptIn, setSocialMatchOptIn] = useState(false);
  const [socialMatchUnlockedEvents, setSocialMatchUnlockedEvents] = useState<string[]>([]);
  const [groupShortlist, setGroupShortlist] = useState<Event[]>([]);
  const [groupVotes, setGroupVotes] = useState<Record<string, GroupVoteState>>({});
  const socialViewedEventIds = useRef<Set<string>>(new Set());
  const [planStops, setPlanStops] = useState<PlanStop[]>([]);
  const [planSavedMessage, setPlanSavedMessage] = useState("");
  const [fallbackMode, setFallbackMode] = useState<"NONE" | "SOLD_OUT" | "WEATHER" | "NEARBY">("NONE");
  const [showCultureLayer, setShowCultureLayer] = useState(true);

  const current = themes[vibe];
  const locationCards: Array<{
    id: Location;
    label: string;
    subtitle: string;
    iconSrc: string;
    glow: string;
    chip: string;
  }> = [
    {
      id: "BRISBANE",
      label: "Brisbane",
      subtitle: "City pulse, laneways, river nights",
      iconSrc: "/brisbane.png",
      glow: "from-blue-500/30 via-cyan-400/10 to-transparent",
      chip: "Urban",
    },
    {
      id: "GC",
      label: "Gold Coast",
      subtitle: "Beach energy, nightlife, sport",
      iconSrc: "/gold-coast.png",
      glow: "from-orange-500/30 via-amber-400/10 to-transparent",
      chip: "Coastal",
    },
    {
      id: "SC",
      label: "Sunshine Coast",
      subtitle: "Markets, live music, chilled culture",
      iconSrc: "/sunshine-coast.png",
      glow: "from-emerald-500/30 via-lime-400/10 to-transparent",
      chip: "Laid-back",
    },
  ];

  const filteredEvents = useMemo(() => {
    const dislikedEnergies = new Set(
      Object.entries(feedbackByEvent)
        .filter(([, f]) => f.matchVibe === false)
        .map(([eventId]) => events.find((event) => event.id === eventId)?.energy)
        .filter(Boolean),
    );

    return events
      .filter((event) => {
        const queryMatch =
          query.trim().length === 0 ||
          event.title.toLowerCase().includes(query.toLowerCase()) ||
          event.venue.toLowerCase().includes(query.toLowerCase());

        const priceMatch = priceBand === "ANY" || event.priceBand === priceBand;
        const energyMatch = energy === "ANY" || event.energy === energy;
        const indoorMatch = indoorMode === "ANY" || event.indoor === indoorMode;
        const radiusMatch = event.distanceKm <= profile.radius;
        const nearNowMatch =
          !nearMeNow ||
          (event.distanceKm <= Math.min(profile.radius, 15) &&
            (/today|tonight|now|fri|sat|sun|weekend/i.test(event.date) || event.hotScore >= 55));
        const pulseWindowMatch =
          pulseWindow === "ANY" ||
          (pulseWindow === "NOW" && (/today|now/i.test(event.date) || event.distanceKm <= 12)) ||
          (pulseWindow === "TONIGHT" && /today|tonight|fri|sat/i.test(event.date)) ||
          (pulseWindow === "WEEKEND" && /sat|sun|weekend/i.test(event.date));

        const dateMatch =
          dateWindow === "ANY" ||
          (dateWindow === "TODAY" && /today|tonight|now/i.test(event.date)) ||
          (dateWindow === "WEEKEND" && /sat|sun|weekend/i.test(event.date)) ||
          (dateWindow === "THIS_WEEK" && /mon|tue|wed|thu|fri|sat|sun|week|today|tonight/i.test(event.date));

        return (
          queryMatch &&
          priceMatch &&
          energyMatch &&
          indoorMatch &&
          dateMatch &&
          radiusMatch &&
          nearNowMatch &&
          pulseWindowMatch
        );
      })
      .sort((a, b) => {
        const fa = feedbackByEvent[a.id];
        const fb = feedbackByEvent[b.id];

        const scoreA =
          a.hotScore +
          (fa?.matchVibe === true ? 15 : 0) +
          (fa?.matchVibe === false ? -35 : 0) +
          (fa?.recommend === true ? 10 : 0) +
          (fa?.recommend === false ? -12 : 0) +
          (dislikedEnergies.has(a.energy) ? -8 : 0);

        const scoreB =
          b.hotScore +
          (fb?.matchVibe === true ? 15 : 0) +
          (fb?.matchVibe === false ? -35 : 0) +
          (fb?.recommend === true ? 10 : 0) +
          (fb?.recommend === false ? -12 : 0) +
          (dislikedEnergies.has(b.energy) ? -8 : 0);

        return scoreB - scoreA;
      });
  }, [
    events,
    query,
    dateWindow,
    priceBand,
    energy,
    indoorMode,
    profile.radius,
    nearMeNow,
    pulseWindow,
    feedbackByEvent,
  ]);

  const featuredEvent = filteredEvents[0] || null;
  const featuredTrust = featuredEvent ? getTrustScore(featuredEvent) : null;
  const tonightPulse = useMemo(
    () =>
      filteredEvents
        .filter((event) => /today|tonight|now|fri/i.test(event.date))
        .sort((a, b) => b.hotScore - a.hotScore)
        .slice(0, 4),
    [filteredEvents],
  );
  const weekendPulse = useMemo(
    () =>
      filteredEvents
        .filter((event) => /sat|sun|weekend/i.test(event.date))
        .sort((a, b) => b.hotScore - a.hotScore)
        .slice(0, 4),
    [filteredEvents],
  );
  const soldOutAlternatives = useMemo(
    () =>
      filteredEvents
        .slice(1)
        .filter((event) => event.hotScore >= 60)
        .sort((a, b) => b.hotScore - a.hotScore)
        .slice(0, 3),
    [filteredEvents],
  );
  const weatherAlternatives = useMemo(
    () =>
      filteredEvents
        .slice(1)
        .filter((event) => event.indoor === "INDOOR")
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 3),
    [filteredEvents],
  );
  const nearbyAlternatives = useMemo(
    () =>
      filteredEvents
        .slice(1)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 3),
    [filteredEvents],
  );

  useEffect(() => {
    if (!featuredEvent) return;
    const trust = getTrustScore(featuredEvent);
    trackEvent("trust_score_view", {
      event_id: featuredEvent.id,
      trust_score: trust.score,
      trust_label: trust.label,
    });
  }, [featuredEvent?.id]);

  useEffect(() => {
    if (!socialMatchOptIn) return;
    const visible = filteredEvents.slice(0, 4);
    visible.forEach((event) => {
      if (socialViewedEventIds.current.has(event.id)) return;
      socialViewedEventIds.current.add(event.id);
      trackEvent("social_match_view", {
        event_id: event.id,
        event_title: event.title,
      });
    });
  }, [socialMatchOptIn, filteredEvents]);

  const loadSavedEvents = async (uid: string) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("saved_events")
      .select("event_id")
      .eq("user_id", uid);

    if (error) {
      console.error("Failed to load saved events", error);
      return;
    }

    setSavedEventIds((data || []).map((row) => row.event_id as string));
  };

  const loadFeedback = async (uid: string) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("event_feedback")
      .select("event_id, match_vibe, recommend")
      .eq("user_id", uid);

    if (error) {
      console.error("Failed to load feedback", error);
      return;
    }

    const mapped: Record<string, EventFeedbackState> = {};
    (data || []).forEach((row) => {
      mapped[row.event_id as string] = {
        matchVibe: row.match_vibe as boolean | undefined,
        recommend: row.recommend as boolean | undefined,
      };
    });
    setFeedbackByEvent(mapped);
  };

  useEffect(() => {
    if (!supabase) return;
    const sb = supabase;

    sb.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user ?? null;
      setUserId(user?.id ?? null);
      setUserEmail(user?.email ?? null);
      if (user?.id) {
        await sb.from("profiles").upsert(
          {
            id: user.id,
            email: user.email,
          },
          { onConflict: "id" },
        );
        await loadSavedEvents(user.id);
        await loadFeedback(user.id);
      }
    });

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
      setUserId(user?.id ?? null);
      setUserEmail(user?.email ?? null);
      if (user?.id) {
        await sb.from("profiles").upsert(
          {
            id: user.id,
            email: user.email,
          },
          { onConflict: "id" },
        );
        await loadSavedEvents(user.id);
        await loadFeedback(user.id);
      } else {
        setSavedEventIds([]);
        setFeedbackByEvent({});
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const unsent = filteredEvents.filter((event) => !viewedEventIds.current.has(event.id));
    if (unsent.length === 0) return;

    unsent.forEach((event) => {
      viewedEventIds.current.add(event.id);
      trackEvent("event_card_view", {
        event_id: event.id,
        event_title: event.title,
        location,
        vibe,
      });
    });
  }, [filteredEvents, location, vibe]);

  const fetchEvents = async (selectedVibe: Vibe, selectedLocation: Location) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/events?vibe=${selectedVibe}&location=${selectedLocation}`);
      const data = await res.json();
      const enriched = enrichEvents(data.events || [], selectedVibe);
      setEvents(enriched);
    } catch (error) {
      console.error("Failed to fetch events", error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = (loc: Location) => {
    setLocation(loc);
    fetchEvents(vibe, loc);
    setTimeout(() => setShowEvents(true), 300);
  };

  const applyPreset = (preset: "FRIDAY" | "RESET" | "DATE") => {
    if (preset === "FRIDAY") {
      setProfile({ mode: "MATES", budget: "$$", energy: "HIGH", radius: 30, transport: "TRAIN" });
      setEnergy("HIGH");
      setPriceBand("$$");
      return;
    }
    if (preset === "DATE") {
      setProfile({ mode: "DATE", budget: "$$$", energy: "LOW", radius: 20, transport: "CAR" });
      setEnergy("LOW");
      setPriceBand("$$$");
      return;
    }

    setProfile({ mode: "SOLO", budget: "FREE", energy: "LOW", radius: 15, transport: "ANY" });
    setEnergy("LOW");
    setPriceBand("FREE");
  };

  const applyAdaptiveMode = (mode: AdaptiveMode) => {
    setAdaptiveMode(mode);
    trackEvent("adaptive_mode_selected", { mode });

    if (mode === "SOLO_EXPLORER") {
      setProfile((prev) => ({ ...prev, mode: "SOLO", radius: 20, transport: "ANY" }));
      setEnergy("LOW");
      setPriceBand("ANY");
      setDateWindow("ANY");
      setNearMeNow(false);
      return;
    }
    if (mode === "DATE_NIGHT") {
      setProfile((prev) => ({ ...prev, mode: "DATE", radius: 18, transport: "CAR" }));
      setEnergy("LOW");
      setPriceBand("$$$");
      setIndoorMode("INDOOR");
      setDateWindow("TODAY");
      setNearMeNow(true);
      return;
    }
    if (mode === "NEW_IN_TOWN") {
      setProfile((prev) => ({ ...prev, mode: "SOLO", radius: 25, transport: "TRAIN" }));
      setEnergy("ANY");
      setPriceBand("ANY");
      setDateWindow("WEEKEND");
      setNearMeNow(false);
      return;
    }
    if (mode === "FAMILY_DAY") {
      setProfile((prev) => ({ ...prev, mode: "FAMILY", radius: 22, transport: "CAR" }));
      setEnergy("LOW");
      setPriceBand("$$");
      setIndoorMode("OUTDOOR");
      setDateWindow("TODAY");
      setNearMeNow(false);
      return;
    }

    setProfile((prev) => ({ ...prev, mode: "SOLO", radius: 25, transport: "ANY" }));
    setEnergy("ANY");
    setPriceBand("ANY");
    setDateWindow("ANY");
    setIndoorMode("ANY");
    setNearMeNow(false);
  };

  const sendMagicLink = async () => {
    if (!supabase) {
      setAuthMessage("Supabase not configured in .env.local");
      return;
    }
    if (!authEmailInput.trim()) {
      setAuthMessage("Enter an email first.");
      return;
    }

    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: authEmailInput.trim(),
      options: {
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });

    setAuthMessage(error ? error.message : "Magic link sent. Check your inbox.");
    setAuthLoading(false);
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setAuthMessage("Signed out.");
  };

  const persistPreferences = async () => {
    if (!supabase || !userId) return;

    const { error } = await supabase.from("user_preferences").upsert(
      {
        user_id: userId,
        mode: profile.mode,
        budget: profile.budget,
        energy: profile.energy,
        radius_km: profile.radius,
        transport: profile.transport,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) {
      console.error("Failed to save preferences", error);
    }
  };

  const toggleSaveEvent = async (event: Event) => {
    const alreadySaved = savedEventIds.includes(event.id);
    const next = alreadySaved
      ? savedEventIds.filter((id) => id !== event.id)
      : [...savedEventIds, event.id];
    setSavedEventIds(next);

    if (supabase && userId) {
      if (alreadySaved) {
        const { error } = await supabase
          .from("saved_events")
          .delete()
          .eq("user_id", userId)
          .eq("event_id", event.id);
        if (error) console.error("Failed to unsave event", error);
      } else {
        const { error } = await supabase.from("saved_events").insert({
          user_id: userId,
          event_id: event.id,
          event_title: event.title,
          location,
          vibe,
        });
        if (error) console.error("Failed to save event", error);
      }
    }

    trackEvent("save_event", {
      event_id: event.id,
      event_title: event.title,
      action: alreadySaved ? "unsave" : "save",
      persistence: userId ? "supabase" : "local",
    });
  };

  const submitEventFeedback = async (
    event: Event,
    field: "matchVibe" | "recommend",
    value: boolean,
  ) => {
    const previous = feedbackByEvent[event.id] || {};
    const nextState = { ...previous, [field]: value };

    setFeedbackByEvent((prev) => ({
      ...prev,
      [event.id]: nextState,
    }));

    if (supabase && userId) {
      const { error } = await supabase.from("event_feedback").upsert(
        {
          user_id: userId,
          event_id: event.id,
          match_vibe: nextState.matchVibe ?? null,
          recommend: nextState.recommend ?? null,
          created_at: new Date().toISOString(),
        },
        { onConflict: "user_id,event_id" },
      );
      if (error) {
        console.error("Failed to save feedback", error);
      }
    }

    trackEvent("event_feedback_submit", {
      event_id: event.id,
      field,
      value,
      persistence: userId ? "supabase" : "local",
    });
  };

  const toggleNotifyType = (type: string) => {
    setNotifyTypes((prev) => (prev.includes(type) ? prev.filter((item) => item !== type) : [...prev, type]));
  };

  const submitNotificationIntent = async () => {
    const email = notifyEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setNotifyMessage("Enter a valid email.");
      return;
    }
    if (notifyTypes.length === 0) {
      setNotifyMessage("Pick at least one alert type.");
      return;
    }
    if (!supabase) {
      setNotifyMessage("Supabase not configured.");
      return;
    }

    setNotifyLoading(true);
    const { error } = await supabase.from("notification_intents").insert({
      user_id: userId,
      email,
      region: notifyRegion,
      vibe: notifyVibe,
      intent_types: notifyTypes,
      created_at: new Date().toISOString(),
    });
    setNotifyLoading(false);

    if (error) {
      console.error("Failed to save notification intent", error);
      setNotifyMessage("Could not save right now. If this is first run, create notification_intents table.");
      return;
    }

    setNotifyMessage("You're on the list.");
    trackEvent("notification_intent_submit", {
      region: notifyRegion,
      vibe: notifyVibe,
      intent_types: notifyTypes,
      signed_in: Boolean(userId),
    });
  };

  const generateVisitorPlan = async () => {
    setVisitorLoading(true);
    try {
      const res = await fetch(`/api/events?vibe=${visitorVibe}&location=${visitorRegion}`);
      const data = await res.json();
      const enriched = enrichEvents(data.events || [], visitorVibe);
      const budgetFiltered =
        visitorBudget === "ANY" ? enriched : enriched.filter((event) => event.priceBand === visitorBudget);
      const scoped = budgetFiltered.length > 0 ? budgetFiltered : enriched;
      const sorted =
        visitorTravelStyle === "RELAXED"
          ? [...scoped].sort((a, b) => a.hotScore - b.hotScore)
          : visitorTravelStyle === "SOCIAL"
            ? [...scoped].sort((a, b) => b.hotScore - a.hotScore)
            : [...scoped].sort((a, b) => a.distanceKm - b.distanceKm);

      const picks = sorted.slice(0, 4);
      const plan: string[] = [
        `Day 1 Morning: ${picks[0]?.title || "Cafe + local walk"} (${picks[0]?.venue || "SEQ local"})`,
        `Day 1 Evening: ${picks[1]?.title || "Live event pick"} (${picks[1]?.venue || "City centre"})`,
        `Day 2 Morning: ${picks[2]?.title || "Market / cultural stop"} (${picks[2]?.venue || "Local hotspot"})`,
        `Day 2 Evening: ${picks[3]?.title || "Final night feature"} (${picks[3]?.venue || "SEQ venue"})`,
      ];
      setVisitorPlan(plan);

      trackEvent("visitor_plan_generated", {
        region: visitorRegion,
        vibe: visitorVibe,
        budget: visitorBudget,
        travel_style: visitorTravelStyle,
      });
    } catch (error) {
      console.error("Failed to generate visitor quickstart", error);
      setVisitorPlan(["Could not generate plan right now. Try again."]);
    } finally {
      setVisitorLoading(false);
    }
  };

  const requestSocialConnect = (event: Event) => {
    setSocialMatchUnlockedEvents((prev) => (prev.includes(event.id) ? prev : [...prev, event.id]));
    trackEvent("social_match_connect_click", {
      event_id: event.id,
      event_title: event.title,
      location,
      vibe,
    });
  };

  const addToGroupShortlist = (event: Event) => {
    setGroupShortlist((prev) => {
      if (prev.some((item) => item.id === event.id)) return prev;
      trackEvent("group_plan_created", { event_id: event.id, source: "event_card" });
      return [...prev, event];
    });
  };

  const castGroupVote = (eventId: string, vote: keyof GroupVoteState) => {
    setGroupVotes((prev) => {
      const current = prev[eventId] || { yes: 0, no: 0, maybe: 0 };
      const next = {
        ...prev,
        [eventId]: { ...current, [vote]: current[vote] + 1 },
      };
      return next;
    });
    trackEvent("group_vote_cast", { event_id: eventId, vote });
  };

  const copyGroupShortlistLink = async () => {
    if (groupShortlist.length === 0 || typeof window === "undefined") return;
    const ids = groupShortlist.map((event) => event.id).join(",");
    const shareUrl = `${window.location.origin}${window.location.pathname}?group=${encodeURIComponent(ids)}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      trackEvent("group_shortlist_link_copied", { count: groupShortlist.length });
    } catch (error) {
      console.error("Failed to copy shortlist link", error);
    }
  };

  const addToPlanBuilder = (event: Event, stopType: PlanStop["stopType"] = "EVENT") => {
    setPlanStops((prev) => {
      if (prev.some((stop) => stop.eventId === event.id && stop.stopType === stopType)) return prev;
      const slot = prev.length + 1;
      const defaultTimes = ["10:00", "13:00", "17:00", "20:00"];
      const next: PlanStop = {
        id: `${event.id}-${stopType}-${slot}`,
        eventId: event.id,
        title: event.title,
        venue: event.venue,
        stopType,
        timeLabel: defaultTimes[(slot - 1) % defaultTimes.length],
      };
      return [...prev, next];
    });
    trackEvent("plan_builder_open", {
      event_id: event.id,
      stop_type: stopType,
    });
  };

  const removePlanStop = (stopId: string) => {
    setPlanStops((prev) => prev.filter((stop) => stop.id !== stopId));
  };

  const updatePlanStopTime = (stopId: string, timeLabel: string) => {
    setPlanStops((prev) =>
      prev.map((stop) => (stop.id === stopId ? { ...stop, timeLabel } : stop)),
    );
  };

  const savePlanBuilder = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("joy_plan_builder", JSON.stringify(planStops));
    }
    setPlanSavedMessage("Plan saved.");
    trackEvent("plan_saved", { stop_count: planStops.length });
  };

  const sharePlanBuilder = async () => {
    if (typeof window === "undefined" || planStops.length === 0) return;
    const encoded = encodeURIComponent(
      planStops.map((stop) => `${stop.timeLabel}-${stop.stopType}-${stop.title}`).join("|"),
    );
    const shareUrl = `${window.location.origin}${window.location.pathname}?plan=${encoded}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setPlanSavedMessage("Share link copied.");
    } catch (error) {
      console.error("Failed to copy plan link", error);
    }
  };

  const topGroupPick = useMemo(() => {
    if (groupShortlist.length === 0) return null;
    const scored = groupShortlist.map((event) => {
      const votes = groupVotes[event.id] || { yes: 0, no: 0, maybe: 0 };
      const score = votes.yes * 2 + votes.maybe - votes.no;
      return { event, votes, score };
    });
    return scored.sort((a, b) => b.score - a.score)[0];
  }, [groupShortlist, groupVotes]);

  const cultureContent = useMemo(() => {
    const region = location || "BRISBANE";
    if (region === "GC") {
      return {
        title: "Gold Coast Culture",
        vibe: "Beach-first social energy with strong local pride.",
        etiquette: "Book ahead on weekends and respect early surf crowds.",
        safety: "Use well-lit transport zones after late events.",
        hiddenGem: "Miami lane bars and local live sets just off the main strip.",
      };
    }
    if (region === "SC") {
      return {
        title: "Sunshine Coast Culture",
        vibe: "Relaxed, community-driven, nature-connected scenes.",
        etiquette: "Casual dress is normal; arrive early for markets.",
        safety: "Plan return transport before late-night hinterland events.",
        hiddenGem: "Smaller hinterland sessions with local acoustic acts.",
      };
    }
    return {
      title: "Brisbane Culture",
      vibe: "Urban mix of river events, laneway culture, and sport nights.",
      etiquette: "Peak venues fill fast around games and Friday nights.",
      safety: "Stick to major station corridors for late exits.",
      hiddenGem: "West End micro-gigs and Fortitude Valley midweek showcases.",
    };
  }, [location]);

  return (
    <main
      className={`min-h-[200vh] transition-all duration-1000 ease-in-out flex flex-col items-center justify-start font-sans relative ${current.outsideBg}`}
    >
      <div
        className="fixed inset-0 z-0 transition-all duration-1000 opacity-60"
        style={{
          backgroundImage: current.visual,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "brightness(0.3) contrast(1.1)",
        }}
      />

      <div className="relative z-10 w-full md:max-w-[1200px] mt-0 md:mt-8 flex flex-col items-center">
        <div
          className={`absolute -inset-x-2 -top-2 h-full hidden md:block border-[16px] border-slate-100 rounded-t-[6rem] pointer-events-none shadow-[0_0_80px_rgba(0,0,0,0.5)] ${current.glow} z-50`}
        >
          <div className="absolute top-48 -left-5 w-1.5 h-20 bg-slate-200 rounded-l-md" />
          <div className="absolute top-72 -left-5 w-1.5 h-20 bg-slate-200 rounded-l-md" />
          <div className="absolute top-60 -right-5 w-1.5 h-32 bg-slate-200 rounded-r-md" />
        </div>

        <div className="relative w-full bg-black/95 min-h-screen rounded-none md:rounded-t-[5rem] border-0 md:border-t md:border-x border-white/10 flex flex-col overflow-hidden shadow-2xl text-xs md:text-sm md:mt-[2px]">
          <div className="h-[82px] md:h-[92px] bg-black/40 backdrop-blur-xl relative z-[60]">
            <div className="relative h-full mx-6 md:mx-32 pt-2 md:pt-4 flex items-center justify-center">
              <div className="flex gap-4 md:gap-10">
                {vibeList.map((v) => (
                  <button
                    key={v}
                    onClick={() => setVibe(v)}
                    className={`text-[10px] md:text-[12px] font-black uppercase tracking-widest transition-all ${
                      vibe === v
                        ? "text-white underline underline-offset-[12px] decoration-2"
                        : "text-white/20 hover:text-white"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[58%] h-px bg-white/10 md:hidden" />
              <button
                onClick={() => setShowSettings(true)}
                className="absolute right-2 md:right-8 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors p-[6px] md:p-[7px] bg-white/5 rounded-xl border border-white/10 shadow-[0_6px_20px_rgba(0,0,0,0.35)]"
                aria-label="Open vibe setup"
              >
                <Menu className="w-5 h-5 md:w-5 md:h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 relative">
            <div
              className={`h-[85vh] flex flex-col items-center justify-between p-6 md:p-16 transition-all duration-700 ${
                showEvents ? "opacity-0 -translate-y-full absolute inset-x-0" : "opacity-100"
              }`}
            >
              <div className="flex flex-col items-center w-full mt-10">
                <div
                  className={`inline-block px-4 py-1 rounded-full border mb-8 bg-white/5 ${current.accent.replace("text", "border")}`}
                >
                  <span className={`text-[10px] font-black uppercase tracking-widest ${current.accent}`}>
                    Vibe: {vibe}
                  </span>
                </div>
                <h1 className="text-[14vw] md:text-[10rem] font-black tracking-tighter italic uppercase text-center leading-[0.8] mb-10 select-none whitespace-nowrap">
                  jOY <span className={`transition-colors duration-1000 ${current.accent}`}>EVENTS</span>
                </h1>
                <p className="text-base md:text-2xl font-bold tracking-tight opacity-70 max-w-lg mx-auto leading-tight text-center text-slate-300">
                  {current.description}
                </p>
              </div>

              <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5 mb-10">
                {locationCards.map((loc) => (
                  <button
                    key={loc.id}
                    onClick={() => handleLocationSelect(loc.id)}
                    className="relative overflow-hidden bg-slate-900/70 border border-white/10 p-5 md:p-7 rounded-2xl md:rounded-[2.5rem] flex flex-col items-start gap-3 transition-all duration-300 hover:bg-slate-800 hover:border-white/25 hover:translate-y-[-4px] active:scale-[0.98] group"
                  >
                    <div className={`absolute inset-0 opacity-80 bg-gradient-to-br ${loc.glow} group-hover:opacity-100 transition-opacity`} />
                    <div className="relative z-10 flex w-full items-center justify-between">
                      <div className="rounded-xl border border-white/20 bg-black/30 p-2.5">
                        <img
                          src={loc.iconSrc}
                          alt={`${loc.label} icon`}
                          className="h-5 w-5 md:h-6 md:w-6 object-contain"
                        />
                      </div>
                      <span className="text-[9px] uppercase tracking-[0.2em] font-black text-white/70 border border-white/15 px-2 py-1 rounded-full">
                        {loc.chip}
                      </span>
                    </div>
                    <span className="relative z-10 font-black text-sm md:text-base uppercase tracking-[0.2em] text-white">
                      {loc.label}
                    </span>
                    <p className="relative z-10 text-left text-[11px] md:text-xs text-slate-200/85 leading-relaxed">
                      {loc.subtitle}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div
              className={`transition-all duration-1000 ${
                showEvents ? "opacity-100 translate-y-0" : "opacity-0 translate-y-20 h-0 overflow-hidden"
              }`}
            >
              {featuredEvent && (
                <div className="relative h-[320px] md:h-[460px] w-full overflow-hidden border-b border-white/10">
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105"
                    style={{ backgroundImage: `url(${featuredEvent.hero})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent" />
                  <div className="relative h-full flex flex-col justify-center p-8 md:p-20 max-w-3xl">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="bg-red-600 text-[9px] md:text-[10px] font-black uppercase px-2 py-1 inline-block tracking-widest">
                        Featured Event
                      </span>
                      <span
                        className={`px-2 py-1 text-[9px] md:text-[10px] font-black uppercase rounded-full ${getHotClass(
                          featuredEvent.hotScore,
                        )}`}
                      >
                        Hot Meter: {getHotLabel(featuredEvent.hotScore)}
                      </span>
                    </div>
                    <h2 className="text-4xl md:text-7xl font-black italic uppercase tracking-tighter leading-[0.85] mb-6">
                      {featuredEvent.title}
                    </h2>
                    <p className={`text-xs md:text-base font-bold uppercase tracking-widest ${current.accent}`}>
                      {featuredEvent.date} | {featuredEvent.venue}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 text-[10px] md:text-xs">
                      <span className="bg-black/60 border border-white/20 px-2 py-1 rounded-full">Source: {featuredEvent.source}</span>
                      <span className="bg-black/60 border border-white/20 px-2 py-1 rounded-full">{featuredEvent.updatedLabel}</span>
                      {featuredTrust ? (
                        <span
                          className={`border px-2 py-1 rounded-full ${getTrustClass(featuredTrust.label)}`}
                          title={featuredTrust.reason}
                        >
                          Trust {featuredTrust.score}: {featuredTrust.label}
                        </span>
                      ) : null}
                      <span className="bg-black/60 border border-white/20 px-2 py-1 rounded-full">{featuredEvent.distanceKm}km away</span>
                    </div>
                    {socialMatchOptIn ? (
                      <div className="mt-4 rounded-xl border border-white/20 bg-black/35 p-3">
                        <p className="text-[10px] uppercase tracking-[0.16em] font-black text-slate-200 mb-2">
                          Social Match (Anonymous)
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {createSocialMatches(featuredEvent).map((match) => (
                            <span
                              key={match.id}
                              className="text-[10px] uppercase tracking-[0.12em] px-2 py-1 rounded-full border border-white/20 text-slate-200"
                            >
                              {socialMatchUnlockedEvents.includes(featuredEvent.id)
                                ? `${match.alias} ${match.matchPercent}%`
                                : `Matched ${match.matchPercent}%`}
                            </span>
                          ))}
                        </div>
                        {!socialMatchUnlockedEvents.includes(featuredEvent.id) ? (
                          <button
                            onClick={() => requestSocialConnect(featuredEvent)}
                            className="mt-3 px-3 py-2 rounded-lg border border-white/25 text-[10px] font-black uppercase tracking-[0.14em] hover:bg-white/10"
                          >
                            Request Connect
                          </button>
                        ) : (
                          <p className="mt-3 text-xs text-emerald-300">Connect request recorded.</p>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              <div className="p-6 md:p-12 space-y-8">
                <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
                  <div className="bg-slate-900/70 border border-white/10 rounded-3xl p-4 md:p-6">
                    <div className="flex items-center gap-2 mb-3 text-slate-300 uppercase text-[10px] tracking-[0.2em] font-black">
                      <Compass className="w-4 h-4" />
                      Mission
                    </div>
                    <p className="text-slate-200 leading-relaxed text-sm md:text-base">
                      jOY Events helps locals and visitors feel less alone by surfacing high-trust events worth showing up for.
                      No ad clutter. No low-value noise. Just culture, connection, and momentum in SEQ.
                    </p>
                    <button
                      onClick={() => {
                        setShowVisitorQuickstart(true);
                        trackEvent("visitor_mode_start", { entry: "mission_panel" });
                      }}
                      className="mt-4 px-3 py-2 rounded-xl border border-white/20 text-xs font-black uppercase tracking-[0.14em] hover:bg-white/5"
                    >
                      Visitor Quickstart (48h)
                    </button>
                  </div>
                  <div className="bg-slate-900/70 border border-white/10 rounded-3xl p-4 md:p-6">
                    <div className="flex items-center gap-2 mb-3 text-slate-300 uppercase text-[10px] tracking-[0.2em] font-black">
                      <ShieldCheck className="w-4 h-4" />
                      Trust Protocol
                    </div>
                    <ul className="space-y-2 text-slate-300 text-xs md:text-sm">
                      <li>Source transparency on all events.</li>
                      <li>Quality-first feed ranking.</li>
                      <li>Hot Meter labels are confidence-scored signals.</li>
                    </ul>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 md:p-6 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] font-black text-slate-300">
                      Local Culture Layer
                    </p>
                    <button
                      onClick={() => {
                        const next = !showCultureLayer;
                        setShowCultureLayer(next);
                        if (next) {
                          trackEvent("culture_layer_view", { location });
                        }
                      }}
                      className={`px-3 py-2 rounded-xl border text-[10px] md:text-xs font-black uppercase tracking-[0.14em] transition-colors ${
                        showCultureLayer
                          ? "bg-blue-500/20 border-blue-400/70 text-blue-100"
                          : "bg-slate-900 border-white/15 text-slate-300"
                      }`}
                    >
                      {showCultureLayer ? "Layer On" : "Layer Off"}
                    </button>
                  </div>
                  {showCultureLayer ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-white/10 p-3">
                        <p className="text-sm font-black uppercase tracking-[0.12em] text-white">{cultureContent.title}</p>
                        <p className="text-xs text-slate-300 mt-2">{cultureContent.vibe}</p>
                        <p className="text-xs text-slate-400 mt-2">
                          <span className="font-bold text-slate-300">Etiquette:</span> {cultureContent.etiquette}
                        </p>
                        <p className="text-xs text-slate-400 mt-2">
                          <span className="font-bold text-slate-300">Safety:</span> {cultureContent.safety}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/10 p-3">
                        <p className="text-[10px] uppercase tracking-[0.14em] font-black text-slate-300">Hidden Gem</p>
                        <p className="text-sm text-slate-200 mt-2">{cultureContent.hiddenGem}</p>
                        <p className="text-xs text-slate-400 mt-3">Use this layer to feel local fast, especially if you are new in town.</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">Culture layer hidden. Toggle on anytime.</p>
                  )}
                </div>

                <div className="flex flex-col gap-4 border-b border-white/10 pb-6">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <h2 className="text-xl md:text-3xl font-black italic uppercase tracking-tighter">
                      Live Pulse: {location ? locationLabels[location] : "SEQ"} <span className={current.accent}>{vibe}</span>
                    </h2>
                    <button
                      onClick={() => setShowEvents(false)}
                      className="text-[10px] uppercase font-black text-slate-500 hover:text-white underline underline-offset-4 transition-colors"
                    >
                      Reset
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {([
                      { id: "ANY", label: "Any" },
                      { id: "NOW", label: "Now" },
                      { id: "TONIGHT", label: "Tonight" },
                      { id: "WEEKEND", label: "Weekend" },
                    ] as Array<{ id: PulseWindow | "ANY"; label: string }>).map((windowOption) => (
                      <button
                        key={windowOption.id}
                        onClick={() => {
                          setPulseWindow(windowOption.id);
                          trackEvent("city_pulse_interaction", { pulse_window: windowOption.id, location, vibe });
                        }}
                        className={`px-3 py-2 rounded-xl border text-[10px] md:text-xs font-black uppercase tracking-[0.14em] transition-colors ${
                          pulseWindow === windowOption.id
                            ? "bg-blue-500/20 border-blue-400/70 text-blue-100"
                            : "bg-slate-900 border-white/15 text-slate-300 hover:text-white"
                        }`}
                      >
                        {windowOption.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {([
                      { id: "BRISBANE", label: "Brisbane" },
                      { id: "GC", label: "Gold Coast" },
                      { id: "SC", label: "Sunshine Coast" },
                    ] as Array<{ id: Location; label: string }>).map((locOption) => (
                      <button
                        key={locOption.id}
                        onClick={() => handleLocationSelect(locOption.id)}
                        className={`px-3 py-2 rounded-xl border text-[10px] md:text-xs font-black uppercase tracking-[0.14em] transition-colors ${
                          location === locOption.id
                            ? "bg-emerald-500/20 border-emerald-400/70 text-emerald-100"
                            : "bg-slate-900 border-white/15 text-slate-300 hover:text-white"
                        }`}
                      >
                        {locOption.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {([
                      { id: "SOLO_EXPLORER", label: "Solo Explorer" },
                      { id: "DATE_NIGHT", label: "Date Night" },
                      { id: "NEW_IN_TOWN", label: "New in Town" },
                      { id: "FAMILY_DAY", label: "Family Day" },
                    ] as Array<{ id: AdaptiveMode; label: string }>).map((modeOption) => (
                      <button
                        key={modeOption.id}
                        onClick={() => applyAdaptiveMode(modeOption.id)}
                        className={`px-3 py-2 rounded-xl border text-[10px] md:text-xs font-black uppercase tracking-[0.14em] transition-colors ${
                          adaptiveMode === modeOption.id
                            ? "bg-fuchsia-500/20 border-fuchsia-400/70 text-fuchsia-100"
                            : "bg-slate-900 border-white/15 text-slate-300 hover:text-white"
                        }`}
                      >
                        {modeOption.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
                    <label className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search events, venue, suburb"
                        className="w-full bg-slate-900 border border-white/15 rounded-xl pl-10 pr-3 py-3 text-sm outline-none focus:border-white/40"
                      />
                    </label>

                    <select
                      value={dateWindow}
                      onChange={(e) => setDateWindow(e.target.value as DateWindow)}
                      className="bg-slate-900 border border-white/15 rounded-xl px-3 py-3 text-sm"
                    >
                      <option value="ANY">Any Date</option>
                      <option value="TODAY">Today</option>
                      <option value="WEEKEND">Weekend</option>
                      <option value="THIS_WEEK">This Week</option>
                    </select>

                    <select
                      value={priceBand}
                      onChange={(e) => setPriceBand(e.target.value as PriceBand)}
                      className="bg-slate-900 border border-white/15 rounded-xl px-3 py-3 text-sm"
                    >
                      <option value="ANY">Any Price</option>
                      <option value="FREE">Free</option>
                      <option value="$">$</option>
                      <option value="$$">$$</option>
                      <option value="$$$">$$$</option>
                    </select>

                    <select
                      value={energy}
                      onChange={(e) => setEnergy(e.target.value as Energy)}
                      className="bg-slate-900 border border-white/15 rounded-xl px-3 py-3 text-sm"
                    >
                      <option value="ANY">Any Energy</option>
                      <option value="LOW">Calm</option>
                      <option value="MEDIUM">Balanced</option>
                      <option value="HIGH">High Energy</option>
                    </select>

                    <select
                      value={indoorMode}
                      onChange={(e) => setIndoorMode(e.target.value as IndoorMode)}
                      className="bg-slate-900 border border-white/15 rounded-xl px-3 py-3 text-sm"
                    >
                      <option value="ANY">Indoor + Outdoor</option>
                      <option value="INDOOR">Indoor</option>
                      <option value="OUTDOOR">Outdoor</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-[10px] md:text-xs text-slate-400 uppercase tracking-[0.14em] font-bold">
                      Active radius: within {profile.radius}km
                    </div>
                    <button
                      onClick={() => {
                        const next = !nearMeNow;
                        setNearMeNow(next);
                        if (next) {
                          setDateWindow("TODAY");
                          setProfile((prev) => ({ ...prev, radius: Math.min(prev.radius, 15) }));
                        }
                        trackEvent("near_me_now_toggle", {
                          enabled: next,
                          radius_km: profile.radius,
                          location,
                          vibe,
                        });
                      }}
                      className={`px-3 py-2 rounded-xl border text-[10px] md:text-xs font-black uppercase tracking-[0.14em] transition-colors ${
                        nearMeNow
                          ? "bg-emerald-500/20 border-emerald-400/70 text-emerald-200"
                          : "bg-slate-900 border-white/15 text-slate-300 hover:text-white"
                      }`}
                    >
                      Events Near Me Now
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                    <p className="text-[10px] uppercase tracking-[0.18em] font-black text-slate-300 mb-3">
                      Tonight Pulse
                    </p>
                    <div className="space-y-2">
                      {tonightPulse.length > 0 ? (
                        tonightPulse.map((event) => (
                          <button
                            key={`tonight-${event.id}`}
                            onClick={() => setQuery(event.title)}
                            className="w-full text-left border border-white/10 rounded-xl px-3 py-2 hover:border-white/30 transition-colors"
                          >
                            <p className="text-xs font-black uppercase tracking-[0.1em] text-white truncate">
                              {event.title}
                            </p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-[0.12em]">
                              {event.date} | {event.distanceKm}km | {getHotLabel(event.hotScore)}
                            </p>
                          </button>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400">No tonight pulse yet for current filters.</p>
                      )}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                    <p className="text-[10px] uppercase tracking-[0.18em] font-black text-slate-300 mb-3">
                      Weekend Pulse
                    </p>
                    <div className="space-y-2">
                      {weekendPulse.length > 0 ? (
                        weekendPulse.map((event) => (
                          <button
                            key={`weekend-${event.id}`}
                            onClick={() => setQuery(event.title)}
                            className="w-full text-left border border-white/10 rounded-xl px-3 py-2 hover:border-white/30 transition-colors"
                          >
                            <p className="text-xs font-black uppercase tracking-[0.1em] text-white truncate">
                              {event.title}
                            </p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-[0.12em]">
                              {event.date} | {event.distanceKm}km | {getHotLabel(event.hotScore)}
                            </p>
                          </button>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400">No weekend pulse yet for current filters.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 md:p-6 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] font-black text-slate-300">
                      Fallback Recommendations
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-[0.14em]">
                      Quick pivots when plans change
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { id: "NONE", label: "Auto" },
                      { id: "SOLD_OUT", label: "Sold Out" },
                      { id: "WEATHER", label: "Weather" },
                      { id: "NEARBY", label: "Nearby" },
                    ] as Array<{ id: "NONE" | "SOLD_OUT" | "WEATHER" | "NEARBY"; label: string }>).map((modeOption) => (
                      <button
                        key={modeOption.id}
                        onClick={() => setFallbackMode(modeOption.id)}
                        className={`px-3 py-2 rounded-xl border text-[10px] md:text-xs font-black uppercase tracking-[0.14em] transition-colors ${
                          fallbackMode === modeOption.id
                            ? "bg-emerald-500/20 border-emerald-400/70 text-emerald-100"
                            : "bg-slate-900 border-white/15 text-slate-300 hover:text-white"
                        }`}
                      >
                        {modeOption.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-[0.14em] font-black text-slate-200">
                        Sold Out? Try These
                      </p>
                      {(fallbackMode === "NONE" || fallbackMode === "SOLD_OUT") && soldOutAlternatives.length > 0 ? (
                        soldOutAlternatives.map((event) => (
                          <button
                            key={`sold-${event.id}`}
                            onClick={() => {
                              setQuery(event.title);
                              trackEvent("fallback_reco_click", {
                                type: "sold_out",
                                event_id: event.id,
                              });
                            }}
                            className="w-full text-left border border-white/10 rounded-xl px-3 py-2 hover:border-white/30 transition-colors"
                          >
                            <p className="text-[11px] font-black uppercase tracking-[0.1em] text-white truncate">
                              {event.title}
                            </p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-[0.12em]">
                              Hot {event.hotScore} | {event.distanceKm}km
                            </p>
                          </button>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400">No sold-out alternatives available.</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-[0.14em] font-black text-slate-200">
                        Weather Backup (Indoor)
                      </p>
                      {(fallbackMode === "NONE" || fallbackMode === "WEATHER") && weatherAlternatives.length > 0 ? (
                        weatherAlternatives.map((event) => (
                          <button
                            key={`weather-${event.id}`}
                            onClick={() => {
                              setQuery(event.title);
                              setIndoorMode("INDOOR");
                              trackEvent("fallback_reco_click", {
                                type: "weather",
                                event_id: event.id,
                              });
                            }}
                            className="w-full text-left border border-white/10 rounded-xl px-3 py-2 hover:border-white/30 transition-colors"
                          >
                            <p className="text-[11px] font-black uppercase tracking-[0.1em] text-white truncate">
                              {event.title}
                            </p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-[0.12em]">
                              Indoor | {event.distanceKm}km
                            </p>
                          </button>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400">No indoor backups available.</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-[0.14em] font-black text-slate-200">
                        Nearby Right Now
                      </p>
                      {(fallbackMode === "NONE" || fallbackMode === "NEARBY") && nearbyAlternatives.length > 0 ? (
                        nearbyAlternatives.map((event) => (
                          <button
                            key={`nearby-${event.id}`}
                            onClick={() => {
                              setQuery(event.title);
                              trackEvent("fallback_reco_click", {
                                type: "nearby",
                                event_id: event.id,
                              });
                            }}
                            className="w-full text-left border border-white/10 rounded-xl px-3 py-2 hover:border-white/30 transition-colors"
                          >
                            <p className="text-[11px] font-black uppercase tracking-[0.1em] text-white truncate">
                              {event.title}
                            </p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-[0.12em]">
                              {event.distanceKm}km | {getHotLabel(event.hotScore)}
                            </p>
                          </button>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400">No nearby alternatives available.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 md:p-6 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] font-black text-slate-300">
                      Group Planning
                    </p>
                    <button
                      onClick={copyGroupShortlistLink}
                      className="px-3 py-2 rounded-xl border border-white/15 text-[10px] md:text-xs font-black uppercase tracking-[0.14em] text-slate-300 hover:text-white"
                    >
                      <Share2 className="inline w-3 h-3 mr-1" />
                      Copy Shortlist Link
                    </button>
                  </div>

                  {groupShortlist.length > 0 ? (
                    <div className="space-y-3">
                      {groupShortlist.map((event) => {
                        const votes = groupVotes[event.id] || { yes: 0, no: 0, maybe: 0 };
                        return (
                          <div key={`group-${event.id}`} className="rounded-xl border border-white/10 p-3">
                            <p className="text-xs font-black uppercase tracking-[0.12em] text-white">{event.title}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-[0.12em]">
                              {event.venue} | {event.distanceKm}km
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <button
                                onClick={() => castGroupVote(event.id, "yes")}
                                className="px-2 py-1 rounded-lg border border-emerald-400/60 text-emerald-200 text-[10px] font-black uppercase tracking-[0.12em]"
                              >
                                Yes ({votes.yes})
                              </button>
                              <button
                                onClick={() => castGroupVote(event.id, "maybe")}
                                className="px-2 py-1 rounded-lg border border-amber-400/60 text-amber-200 text-[10px] font-black uppercase tracking-[0.12em]"
                              >
                                Maybe ({votes.maybe})
                              </button>
                              <button
                                onClick={() => castGroupVote(event.id, "no")}
                                className="px-2 py-1 rounded-lg border border-rose-400/60 text-rose-200 text-[10px] font-black uppercase tracking-[0.12em]"
                              >
                                No ({votes.no})
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {topGroupPick ? (
                        <div className="rounded-xl border border-blue-400/50 bg-blue-500/10 p-3">
                          <p className="text-[10px] uppercase tracking-[0.14em] font-black text-blue-100">Top Group Pick</p>
                          <p className="text-sm font-black uppercase tracking-[0.1em] text-white">{topGroupPick.event.title}</p>
                          <p className="text-[10px] text-blue-200 uppercase tracking-[0.12em]">
                            Score {topGroupPick.score} | Yes {topGroupPick.votes.yes} | Maybe {topGroupPick.votes.maybe}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">Add events to build a shared shortlist.</p>
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 md:p-6 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] font-black text-slate-300">
                      Plan Builder
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={savePlanBuilder}
                        className="px-3 py-2 rounded-xl border border-white/15 text-[10px] md:text-xs font-black uppercase tracking-[0.14em] text-slate-300 hover:text-white"
                      >
                        Save Plan
                      </button>
                      <button
                        onClick={sharePlanBuilder}
                        className="px-3 py-2 rounded-xl border border-white/15 text-[10px] md:text-xs font-black uppercase tracking-[0.14em] text-slate-300 hover:text-white"
                      >
                        Share Plan
                      </button>
                    </div>
                  </div>
                  {planStops.length > 0 ? (
                    <div className="space-y-2">
                      {planStops.map((stop, index) => (
                        <div key={stop.id} className="rounded-xl border border-white/10 p-3">
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <p className="text-sm font-black uppercase tracking-[0.12em] text-white">
                              {index + 1}. {stop.title}
                            </p>
                            <button
                              onClick={() => removePlanStop(stop.id)}
                              className="text-[10px] uppercase tracking-[0.12em] text-rose-300 border border-rose-400/40 px-2 py-1 rounded-lg"
                            >
                              Remove
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-400 uppercase tracking-[0.12em]">
                            {stop.stopType} | {stop.venue}
                          </p>
                          <label className="mt-2 block">
                            <span className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Time</span>
                            <input
                              value={stop.timeLabel}
                              onChange={(e) => updatePlanStopTime(stop.id, e.target.value)}
                              className="mt-1 w-full bg-slate-900 border border-white/15 rounded-lg px-2 py-2 text-xs"
                            />
                          </label>
                        </div>
                      ))}
                      {planSavedMessage ? <p className="text-xs text-emerald-300">{planSavedMessage}</p> : null}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">No stops yet. Use Food/Event/After buttons on cards to build a route.</p>
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 md:p-6 space-y-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-[10px] uppercase tracking-[0.18em] font-black text-slate-300">
                      Notification Intents
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-[0.14em]">
                      Capture now, delivery later
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      value={notifyEmail}
                      onChange={(e) => setNotifyEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-3 text-sm outline-none focus:border-white/40"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        value={notifyRegion}
                        onChange={(e) => setNotifyRegion(e.target.value as Location | "ANY")}
                        className="bg-slate-900 border border-white/15 rounded-xl px-3 py-3 text-sm"
                      >
                        <option value="ANY">Any Region</option>
                        <option value="BRISBANE">Brisbane</option>
                        <option value="GC">Gold Coast</option>
                        <option value="SC">Sunshine Coast</option>
                      </select>
                      <select
                        value={notifyVibe}
                        onChange={(e) => setNotifyVibe(e.target.value as Vibe | "ANY")}
                        className="bg-slate-900 border border-white/15 rounded-xl px-3 py-3 text-sm"
                      >
                        <option value="ANY">Any Vibe</option>
                        <option value="DEFAULT">Default</option>
                        <option value="SPORTS">Sports</option>
                        <option value="MUSIC">Music</option>
                        <option value="CHILL">Chill</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "TONIGHT", label: "Tonight" },
                      { id: "WEEKEND", label: "Weekend" },
                      { id: "NEAR_ME", label: "Near Me" },
                      { id: "VIBE_DROPS", label: "Vibe Drops" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => toggleNotifyType(item.id)}
                        className={`px-3 py-2 rounded-xl border text-[10px] md:text-xs font-black uppercase tracking-[0.14em] transition-colors ${
                          notifyTypes.includes(item.id)
                            ? "bg-emerald-500/20 border-emerald-400/70 text-emerald-200"
                            : "bg-slate-900 border-white/15 text-slate-300 hover:text-white"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <button
                      onClick={submitNotificationIntent}
                      disabled={notifyLoading}
                      className="px-4 py-3 rounded-xl bg-white text-black text-[10px] md:text-xs font-black uppercase tracking-[0.16em] disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {notifyLoading ? (
                        <>
                          <Loader2 className="inline w-3 h-3 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Notify Me"
                      )}
                    </button>
                    {notifyMessage ? <p className="text-xs text-slate-400">{notifyMessage}</p> : null}
                  </div>
                </div>

                {loading ? (
                  <div className="h-64 flex flex-col items-center justify-center gap-4 text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    Harvesting live events...
                  </div>
                ) : (
                  <>
                    <div className="text-xs text-slate-400 uppercase tracking-[0.16em] font-bold">
                      {filteredEvents.length} matching events
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 pb-24">
                      {filteredEvents.slice(1).map((event) => (
                        <div
                          key={event.id}
                          className="bg-white rounded-3xl overflow-hidden flex flex-col group cursor-pointer border border-white/5 shadow-2xl transition-all duration-300 hover:translate-y-[-6px]"
                        >
                            <div className="h-48 md:h-72 bg-slate-800 relative overflow-hidden">
                              <img
                                src={event.hero}
                                alt={event.title}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1518173946687-a4c8a9ba332f?auto=format&fit=crop&q=80&w=2000";
                                }}
                              />
                              <div className="absolute top-4 left-4 flex items-center gap-2">
                              <span className="bg-black/90 p-2 text-[8px] font-black text-white uppercase tracking-widest border border-white/10">
                                jOY Verified
                              </span>
                              <span className={`px-2 py-1 text-[8px] font-black uppercase rounded-full ${getHotClass(event.hotScore)}`}>
                                <Flame className="inline w-3 h-3 mr-1" />
                                {getHotLabel(event.hotScore)}
                              </span>
                            </div>
                          </div>
                          <div className="p-6 md:p-8 bg-white flex flex-col gap-6">
                            <div className="space-y-2">
                              <p className="text-slate-500 text-[10px] md:text-xs font-black uppercase tracking-widest border-b border-slate-100 pb-2">
                                {event.date}
                              </p>
                              <h3 className="text-black text-xl md:text-3xl font-black leading-[0.9] uppercase italic tracking-tighter">
                                {event.title}
                              </h3>
                              <p className="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-tight truncate">
                                {event.venue}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2 text-[10px] uppercase font-bold">
                              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{event.source}</span>
                              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{event.priceBand}</span>
                              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{getEnergyLabel(event.energy)}</span>
                              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{event.indoor}</span>
                              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{event.distanceKm}km</span>
                              <span
                                className={`px-2 py-1 rounded-full border ${getTrustClass(getTrustScore(event).label)}`}
                                title={getTrustScore(event).reason}
                              >
                                Trust {getTrustScore(event).score}
                              </span>
                            </div>
                            <button
                              onClick={() => toggleSaveEvent(event)}
                              className="border border-slate-300 text-slate-700 hover:border-black hover:text-black py-3 md:py-4 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] transition-all text-center"
                            >
                              {savedEventIds.includes(event.id) ? "Saved" : "Save Event"}
                            </button>
                            <button
                              onClick={() => addToGroupShortlist(event)}
                              className="border border-slate-300 text-slate-700 hover:border-black hover:text-black py-3 md:py-4 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] transition-all text-center"
                            >
                              Add to Group List
                            </button>
                            <div className="grid grid-cols-3 gap-2">
                              <button
                                onClick={() => addToPlanBuilder(event, "FOOD")}
                                className="border border-slate-300 text-slate-700 hover:border-black hover:text-black py-2 rounded-lg text-[9px] font-black uppercase tracking-[0.14em]"
                              >
                                Food Stop
                              </button>
                              <button
                                onClick={() => addToPlanBuilder(event, "EVENT")}
                                className="border border-slate-300 text-slate-700 hover:border-black hover:text-black py-2 rounded-lg text-[9px] font-black uppercase tracking-[0.14em]"
                              >
                                Main Event
                              </button>
                              <button
                                onClick={() => addToPlanBuilder(event, "AFTER")}
                                className="border border-slate-300 text-slate-700 hover:border-black hover:text-black py-2 rounded-lg text-[9px] font-black uppercase tracking-[0.14em]"
                              >
                                After Spot
                              </button>
                            </div>
                            {socialMatchOptIn ? (
                              <div className="border border-slate-200 rounded-xl p-3 space-y-2">
                                <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.16em] text-slate-600 flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  Social Match
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {createSocialMatches(event).map((match) => (
                                    <span
                                      key={match.id}
                                      className="text-[10px] uppercase tracking-[0.12em] px-2 py-1 rounded-full border border-slate-300 text-slate-700"
                                    >
                                      {socialMatchUnlockedEvents.includes(event.id)
                                        ? `${match.alias} ${match.matchPercent}%`
                                        : `Match ${match.matchPercent}%`}
                                    </span>
                                  ))}
                                </div>
                                {!socialMatchUnlockedEvents.includes(event.id) ? (
                                  <button
                                    onClick={() => requestSocialConnect(event)}
                                    className="w-full border border-slate-300 text-slate-700 hover:border-black hover:text-black py-2 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-[0.16em]"
                                  >
                                    Request Connect
                                  </button>
                                ) : (
                                  <p className="text-[10px] text-emerald-700 font-bold">Connect request recorded.</p>
                                )}
                              </div>
                            ) : null}
                            <div className="border border-slate-200 rounded-xl p-3 space-y-2">
                              <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">
                                After You Attend
                              </p>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => submitEventFeedback(event, "matchVibe", true)}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-[0.12em] border ${
                                    feedbackByEvent[event.id]?.matchVibe === true
                                      ? "bg-emerald-500/20 border-emerald-400 text-emerald-700"
                                      : "border-slate-300 text-slate-600 hover:text-slate-900"
                                  }`}
                                >
                                  Vibe Matched
                                </button>
                                <button
                                  onClick={() => submitEventFeedback(event, "matchVibe", false)}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-[0.12em] border ${
                                    feedbackByEvent[event.id]?.matchVibe === false
                                      ? "bg-rose-500/20 border-rose-400 text-rose-700"
                                      : "border-slate-300 text-slate-600 hover:text-slate-900"
                                  }`}
                                >
                                  Not Quite
                                </button>
                                <button
                                  onClick={() => submitEventFeedback(event, "recommend", true)}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-[0.12em] border ${
                                    feedbackByEvent[event.id]?.recommend === true
                                      ? "bg-blue-500/20 border-blue-400 text-blue-700"
                                      : "border-slate-300 text-slate-600 hover:text-slate-900"
                                  }`}
                                >
                                  Recommend
                                </button>
                                <button
                                  onClick={() => submitEventFeedback(event, "recommend", false)}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-[0.12em] border ${
                                    feedbackByEvent[event.id]?.recommend === false
                                      ? "bg-amber-500/20 border-amber-400 text-amber-700"
                                      : "border-slate-300 text-slate-600 hover:text-slate-900"
                                  }`}
                                >
                                  Skip Next Time
                                </button>
                              </div>
                            </div>
                            <a
                              href={event.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() =>
                                trackEvent("event_click", {
                                  event_id: event.id,
                                  event_title: event.title,
                                  location,
                                  vibe,
                                })
                              }
                              className="bg-[#2a4d2e] hover:bg-black text-white py-3 md:py-4 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] transition-all text-center"
                            >
                              Find Tickets
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                    {filteredEvents.length <= 1 && (
                      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-slate-300">
                        No events matched those filters. Try widening your vibe setup.
                      </div>
                    )}
                  </>
                )}

                <footer className="border-t border-white/10 pt-8 pb-20 text-slate-400 text-xs md:text-sm">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <p className="font-black uppercase tracking-[0.2em] mb-2 text-slate-200">jOY Events</p>
                      <p>
                        Service-first event discovery for Brisbane, Gold Coast, and Sunshine Coast. Built for belonging,
                        not ad inventory.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p><strong className="text-slate-200">Disclaimer:</strong> Event times and availability can change.</p>
                      <p>
                        <strong className="text-slate-200">Data sources:</strong> council feeds, ticketing partners, community inputs.
                      </p>
                      <p className="text-slate-500 flex flex-wrap gap-2">
                        <Link href="/terms" className="hover:text-white underline underline-offset-2">Terms</Link>
                        <span>|</span>
                        <Link href="/privacy" className="hover:text-white underline underline-offset-2">Privacy</Link>
                        <span>|</span>
                        <span>Data Policy</span>
                        <span>|</span>
                        <span>Contact</span>
                      </p>
                    </div>
                  </div>
                </footer>
              </div>
            </div>

            {showSettings && (
              <div className="absolute inset-0 z-[90] bg-black/80 backdrop-blur-sm p-4 md:p-10">
                <div className="max-w-2xl ml-auto bg-slate-950 border border-white/10 rounded-3xl p-6 md:p-8 text-white h-full overflow-auto">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400 font-black">Vibe Setup</p>
                      <h3 className="text-2xl md:text-3xl font-black italic uppercase tracking-tight">Make jOY Yours</h3>
                    </div>
                    <button onClick={() => setShowSettings(false)} className="p-2 rounded-xl border border-white/15">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="mb-6 rounded-2xl border border-white/15 p-4 space-y-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">Free Account</p>
                    {userId ? (
                      <div className="space-y-3">
                        <p className="text-sm text-slate-200">Signed in as {userEmail || "user"}.</p>
                        <button
                          onClick={signOut}
                          className="rounded-xl border border-white/20 px-3 py-2 text-xs font-black uppercase tracking-[0.15em] hover:bg-white/5"
                        >
                          Sign Out
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <input
                          value={authEmailInput}
                          onChange={(e) => setAuthEmailInput(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full bg-slate-900 border border-white/20 rounded-xl p-3 text-sm"
                        />
                        <button
                          onClick={sendMagicLink}
                          disabled={authLoading}
                          className="rounded-xl border border-white/20 px-3 py-2 text-xs font-black uppercase tracking-[0.15em] hover:bg-white/5 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {authLoading ? (
                            <>
                              <Loader2 className="inline w-3 h-3 mr-2 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            "Send Magic Link"
                          )}
                        </button>
                      </div>
                    )}
                    {authMessage ? <p className="text-xs text-slate-400">{authMessage}</p> : null}
                  </div>

                  <div className="grid gap-3 md:grid-cols-3 mb-6">
                    <button
                      onClick={() => applyPreset("FRIDAY")}
                      className="rounded-2xl border border-white/15 p-3 text-left hover:bg-white/5"
                    >
                      <p className="font-black uppercase text-xs">Friday Night</p>
                      <p className="text-slate-400 text-xs">High energy with mates</p>
                    </button>
                    <button
                      onClick={() => applyPreset("DATE")}
                      className="rounded-2xl border border-white/15 p-3 text-left hover:bg-white/5"
                    >
                      <p className="font-black uppercase text-xs">Date Mode</p>
                      <p className="text-slate-400 text-xs">Low noise, higher quality</p>
                    </button>
                    <button
                      onClick={() => applyPreset("RESET")}
                      className="rounded-2xl border border-white/15 p-3 text-left hover:bg-white/5"
                    >
                      <p className="font-black uppercase text-xs">Sunday Reset</p>
                      <p className="text-slate-400 text-xs">Free and calming events</p>
                    </button>
                  </div>

                  <div className="space-y-5">
                    <label className="block">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black mb-2">Social Mode</p>
                      <select
                        value={profile.mode}
                        onChange={(e) => setProfile((prev) => ({ ...prev, mode: e.target.value as SettingMode }))}
                        className="w-full bg-slate-900 border border-white/20 rounded-xl p-3"
                      >
                        <option value="SOLO">Solo Explorer</option>
                        <option value="DATE">Date Night</option>
                        <option value="MATES">With Mates</option>
                        <option value="FAMILY">Family Time</option>
                      </select>
                    </label>

                    <label className="flex items-center justify-between rounded-xl border border-white/15 p-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-300 font-black">Social Match Opt-In</p>
                        <p className="text-xs text-slate-400">Show anonymous compatible attendees for events.</p>
                      </div>
                      <button
                        onClick={() => setSocialMatchOptIn((prev) => !prev)}
                        className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.14em] border transition-colors ${
                          socialMatchOptIn
                            ? "bg-emerald-500/20 border-emerald-400/70 text-emerald-100"
                            : "bg-slate-900 border-white/15 text-slate-300"
                        }`}
                      >
                        {socialMatchOptIn ? "On" : "Off"}
                      </button>
                    </label>

                    <label className="block">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black mb-2">Budget</p>
                      <select
                        value={profile.budget}
                        onChange={(e) => {
                          const next = e.target.value as PriceBand;
                          setProfile((prev) => ({ ...prev, budget: next }));
                          setPriceBand(next);
                        }}
                        className="w-full bg-slate-900 border border-white/20 rounded-xl p-3"
                      >
                        <option value="FREE">Free</option>
                        <option value="$">$</option>
                        <option value="$$">$$</option>
                        <option value="$$$">$$$</option>
                      </select>
                    </label>

                    <label className="block">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black mb-2">Energy Level</p>
                      <select
                        value={profile.energy}
                        onChange={(e) => {
                          const next = e.target.value as Energy;
                          setProfile((prev) => ({ ...prev, energy: next }));
                          setEnergy(next);
                        }}
                        className="w-full bg-slate-900 border border-white/20 rounded-xl p-3"
                      >
                        <option value="LOW">Calm</option>
                        <option value="MEDIUM">Balanced</option>
                        <option value="HIGH">High Energy</option>
                      </select>
                    </label>

                    <label className="block">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black mb-2">
                        Travel Radius ({profile.radius} km)
                      </p>
                      <input
                        type="range"
                        min={5}
                        max={60}
                        step={5}
                        value={profile.radius}
                        onChange={(e) => setProfile((prev) => ({ ...prev, radius: Number(e.target.value) }))}
                        className="w-full"
                      />
                    </label>

                    <label className="block">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black mb-2">Transport Preference</p>
                      <select
                        value={profile.transport}
                        onChange={(e) =>
                          setProfile((prev) => ({ ...prev, transport: e.target.value as PreferenceProfile["transport"] }))
                        }
                        className="w-full bg-slate-900 border border-white/20 rounded-xl p-3"
                      >
                        <option value="ANY">Any</option>
                        <option value="TRAIN">Train</option>
                        <option value="TRAM">Tram</option>
                        <option value="CAR">Car</option>
                      </select>
                    </label>
                  </div>

                  <button
                    onClick={async () => {
                      trackEvent("settings_complete", {
                        mode: profile.mode,
                        budget: profile.budget,
                        energy: profile.energy,
                        radius_km: profile.radius,
                        transport: profile.transport,
                      });
                      await persistPreferences();
                      setShowSettings(false);
                    }}
                    className="mt-8 w-full py-3 rounded-xl bg-white text-black font-black uppercase tracking-[0.2em] text-xs"
                  >
                    <SlidersHorizontal className="inline w-4 h-4 mr-2" />
                    Save Vibe Setup
                  </button>
                </div>
              </div>
            )}

            {showVisitorQuickstart && (
              <div className="absolute inset-0 z-[95] bg-black/85 backdrop-blur-sm p-4 md:p-10">
                <div className="max-w-2xl ml-auto bg-slate-950 border border-white/10 rounded-3xl p-6 md:p-8 text-white h-full overflow-auto">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400 font-black">Visitor Mode</p>
                      <h3 className="text-2xl md:text-3xl font-black italic uppercase tracking-tight">48-Hour Quickstart</h3>
                    </div>
                    <button onClick={() => setShowVisitorQuickstart(false)} className="p-2 rounded-xl border border-white/15">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black mb-2">Region</p>
                      <select
                        value={visitorRegion}
                        onChange={(e) => setVisitorRegion(e.target.value as Location)}
                        className="w-full bg-slate-900 border border-white/20 rounded-xl p-3"
                      >
                        <option value="BRISBANE">Brisbane</option>
                        <option value="GC">Gold Coast</option>
                        <option value="SC">Sunshine Coast</option>
                      </select>
                    </label>
                    <label className="block">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black mb-2">Vibe</p>
                      <select
                        value={visitorVibe}
                        onChange={(e) => setVisitorVibe(e.target.value as Vibe)}
                        className="w-full bg-slate-900 border border-white/20 rounded-xl p-3"
                      >
                        <option value="DEFAULT">Default</option>
                        <option value="SPORTS">Sports</option>
                        <option value="MUSIC">Music</option>
                        <option value="CHILL">Chill</option>
                      </select>
                    </label>
                    <label className="block">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black mb-2">Budget</p>
                      <select
                        value={visitorBudget}
                        onChange={(e) => setVisitorBudget(e.target.value as PriceBand)}
                        className="w-full bg-slate-900 border border-white/20 rounded-xl p-3"
                      >
                        <option value="ANY">Any</option>
                        <option value="FREE">Free</option>
                        <option value="$">$</option>
                        <option value="$$">$$</option>
                        <option value="$$$">$$$</option>
                      </select>
                    </label>
                    <label className="block">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black mb-2">Travel Style</p>
                      <select
                        value={visitorTravelStyle}
                        onChange={(e) => setVisitorTravelStyle(e.target.value as VisitorTravelStyle)}
                        className="w-full bg-slate-900 border border-white/20 rounded-xl p-3"
                      >
                        <option value="EXPLORE">Explore</option>
                        <option value="RELAXED">Relaxed</option>
                        <option value="SOCIAL">Social</option>
                      </select>
                    </label>
                  </div>

                  <button
                    onClick={generateVisitorPlan}
                    disabled={visitorLoading}
                    className="mt-6 w-full py-3 rounded-xl bg-white text-black font-black uppercase tracking-[0.2em] text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {visitorLoading ? (
                      <>
                        <Loader2 className="inline w-4 h-4 mr-2 animate-spin" />
                        Building Plan...
                      </>
                    ) : (
                      "Generate 48-Hour Plan"
                    )}
                  </button>

                  <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/60 p-4 space-y-2">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-300 font-black">Your Quickstart Plan</p>
                    {visitorPlan.length > 0 ? (
                      visitorPlan.map((line, idx) => (
                        <p key={`visitor-plan-${idx}`} className="text-sm text-slate-200">
                          {line}
                        </p>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400">Generate to preview your 48-hour itinerary.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
