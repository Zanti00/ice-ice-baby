import { useEffect, useState, useRef, useCallback } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export interface PlayerPresence {
  presenceKey: string;
  nickname: string;
  elapsedTime: number;
  clickCount: number;
}

// ---------------------------------------------------------------------------
// TRUE SINGLETON — One channel per browser tab, created once, never destroyed
// until the tab closes. StrictMode mounts/unmounts never touch the channel.
// ---------------------------------------------------------------------------
let singleton: RealtimeChannel | null = null;
const listeners = new Set<() => void>();

function getChannel(): RealtimeChannel {
  // If the channel exists and hasn't closed, reuse it
  if (singleton && singleton.state !== "closed") return singleton;

  // If it errored/closed, remove it before creating a new one
  if (singleton) supabase.removeChannel(singleton);

  singleton = supabase.channel("ice-lobby");

  singleton
    .on("presence", { event: "sync" }, () => {
      // Notify every mounted component
      listeners.forEach((fn) => fn());
    })
    .on("presence", { event: "join" }, () => {
      listeners.forEach((fn) => fn());
    })
    .on("presence", { event: "leave" }, () => {
      listeners.forEach((fn) => fn());
    })
    .subscribe((status) => {
      console.log("[Presence] channel status:", status);
      // On first join, flush state to all listeners
      if (status === "SUBSCRIBED") {
        listeners.forEach((fn) => fn());
      }
    });

  return singleton;
}

// Stable insertion-order list of nicknames.
// New players are appended; departed players are removed.
// This order never changes for existing players, so cards stay in place.
const joinOrder: string[] = [];

function readPlayers(): PlayerPresence[] {
  if (!singleton) return [];
  const state = singleton.presenceState();

  // Flatten all presence slots and deduplicate by nickname (pick highest elapsedTime)
  const byNickname = new Map<string, PlayerPresence>();
  for (const key in state) {
    const arr = state[key] as any[];
    if (!arr || arr.length === 0) continue;
    const p = arr[arr.length - 1]; // latest entry for this slot
    const nickname: string = p.nickname ?? "Anonymous";
    const existing = byNickname.get(nickname);
    if (!existing || (p.elapsedTime ?? 0) > existing.elapsedTime) {
      byNickname.set(nickname, {
        presenceKey: key,
        nickname,
        elapsedTime: p.elapsedTime ?? 0,
        clickCount: p.clickCount ?? 0,
      });
    }
  }

  // Append any brand-new nicknames to the stable join order
  for (const nickname of byNickname.keys()) {
    if (!joinOrder.includes(nickname)) {
      joinOrder.push(nickname);
    }
  }

  // Remove nicknames that are no longer present
  for (let i = joinOrder.length - 1; i >= 0; i--) {
    if (!byNickname.has(joinOrder[i])) {
      joinOrder.splice(i, 1);
    }
  }

  // Return players sorted by their stable join-order index
  return joinOrder
    .map((nickname) => byNickname.get(nickname)!)
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function usePresence(_channelName: string) {
  const [players, setPlayers] = useState<PlayerPresence[]>([]);

  const lastTrackRef = useRef(0);
  const pendingRef = useRef<Omit<PlayerPresence, "presenceKey"> | null>(null);
  const timerRef = useRef<number | null>(null);
  const retryRef = useRef<number | null>(null);

  useEffect(() => {
    const ch = getChannel();

    const onSync = () => setPlayers(readPlayers());
    listeners.add(onSync);

    // If channel is already live, populate state immediately
    if (ch.state === "joined") onSync();

    return () => {
      // ONLY remove the listener — never destroy the singleton channel.
      // Destroying it kills the channel for all other mounted components.
      listeners.delete(onSync);
    };
  }, []);

  const doTrack = useCallback((payload: Omit<PlayerPresence, "presenceKey">) => {
    const ch = getChannel();
    if (ch.state !== "joined") {
      // Channel not ready yet — retry in 150 ms
      if (retryRef.current) clearTimeout(retryRef.current);
      retryRef.current = window.setTimeout(() => doTrack(payload), 150);
      return;
    }
    ch.track(payload)
      .then(() => { lastTrackRef.current = Date.now(); })
      .catch(console.error);
  }, []);

  const track = useCallback((payload: Omit<PlayerPresence, "presenceKey">) => {
    pendingRef.current = payload;

    const now = Date.now();
    const gap = now - lastTrackRef.current;

    if (gap >= 300) {
      // Enough time has passed — fire immediately
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      doTrack(payload);
    } else if (!timerRef.current) {
      // Too soon — schedule a send for when the cooldown expires
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        if (pendingRef.current) doTrack(pendingRef.current);
      }, 300 - gap);
    }
    // If a timer is already pending, pendingRef will hold the latest payload
    // and the timer will send it when it fires.
  }, [doTrack]);

  const untrack = useCallback(async () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null; }
    pendingRef.current = null;
    const ch = getChannel();
    if (ch.state === "joined") {
      await ch.untrack().catch(() => {});
    }
  }, []);

  return { players, track, untrack };
}
