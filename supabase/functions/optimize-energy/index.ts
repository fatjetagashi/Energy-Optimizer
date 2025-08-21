import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

/**
 * Dy baseline të qarta:
 *  - Advanced:
 *    - Simultaneous (NAIVE): përdor vetëm N bateritë më të mëdha, një për çdo pajisje — s’ka leveling/extra
 *    - Optimized (LC 2141): përdor të gjitha bateritë (extra) për max equal concurrent time
 *  - Simple: pishinë e vetme energjie (kWh) → t = E_total / ΣP
 *
 * Rezultati:
 *  - Advanced (kur ka bateri ekstra): optimized > simultaneous → efficiencyGain > 0
 *  - Simple (pool i vetëm): optimized == simultaneous → efficiencyGain = 0
 *
 * + Priority Mode:
 *  - Garanton minDesiredRuntime për çdo pajisje nëse ka energji të mjaftueshme
 *  - Ndar tepricën proporcionalisht sipas prioriteteve (renditjes së pajisjeve)
 */

interface Device {
  id: string;
  name: string;
  powerConsumption: number; // kW
  isActive: boolean;
  activationOrder?: number;
}

interface OptimizationRequest {
  devices: Device[];
  optimizedMode: boolean;           // false => baseline; true => optimized (LC)
  mode: "simple" | "advanced";
  batteryCapacity?: number;         // simple (kWh)
  batteries?: number[];             // advanced (kWh)
}

interface EnergyAllocation {
  deviceId: string;
  allocatedEnergy: number;          // kWh
  runtime: number;                  // orë
}

interface OptimizationResult {
  totalRuntime: number;             
  simultaneousRuntime: number;
  optimizedRuntime: number;
  efficiencyGain: number;           // %
  energyDistribution: EnergyAllocation[];
  simultaneousDeviceHours?: number;
  optimizedDeviceHours?: number;
}

// -------- PRIORITY MODE ----------
type PriorityStrategy = "proportional"; 
interface PriorityPayload {
  mode: "priority";
  devices: Device[];
  minDesiredRuntime: number;        
  priorityOrder?: string[];         // lista e device.id sipas prioritetit (nga më i larti te më i ulti)
  // energjia: njëra ose tjetra
  batteries?: number[];             // advanced input
  batteryCapacity?: number;         // simple input (pool)
  strategy?: PriorityStrategy;      // default: "proportional"
}

type AnyRequest = OptimizationRequest | PriorityPayload;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

// ---------------- Helpers ----------------
const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);
const round2 = (x: number) => Math.round(x * 100) / 100;

// LeetCode 2141 (Binary Search): max equal concurrent time (float)
function maxEqualConcurrentTimeFloat(n: number, arr: number[], eps = 1e-6): number {
  if (n <= 0 || arr.length === 0) return 0;
  const total = sum(arr);
  let lo = 0, hi = total / n; 
  while (hi - lo > eps) {
    const mid = (lo + hi) / 2;
    let can = 0;
    for (const b of arr) can += Math.min(b, mid);
    if (can + 1e-12 >= n * mid) lo = mid; else hi = mid;
  }
  return lo;
}

function getEffectiveCapacity(req: OptimizationRequest): number {
  if (req.mode === "advanced") return sum(Array.isArray(req.batteries) ? req.batteries : []);
  return Number(req.batteryCapacity) || 0;
}

// ---------------- SIMPLE MODE  ----------------
// t = E_total / ΣP
function buildSimplePoolResult(devices: Device[], capacityKWh: number): OptimizationResult {
  const active = devices.filter(d => d.isActive);
  if (active.length === 0 || capacityKWh <= 0) {
    return { totalRuntime: 0, simultaneousRuntime: 0, optimizedRuntime: 0, efficiencyGain: 0, energyDistribution: [] };
  }

  const totalPowerKW = sum(active.map(d => d.powerConsumption));
  const t = totalPowerKW > 0 ? capacityKWh / totalPowerKW : 0;

  const energyDistribution: EnergyAllocation[] = active.map(d => ({
    deviceId: d.id,
    allocatedEnergy: d.powerConsumption * t,
    runtime: t,
  }));

  // Simple: optimized == simultaneous
  return {
    totalRuntime: t,
    simultaneousRuntime: t,
    optimizedRuntime: t,
    efficiencyGain: 0,
    energyDistribution,
    simultaneousDeviceHours: t * active.length,
    optimizedDeviceHours: t * active.length,
  };
}

// ---------------- ADVANCED: Simultaneous baseline NAIV ----------------
// Merr vetëm N bateritë më të mëdha, një për çdo pajisje (pa “extra”).
function buildAdvancedNaiveSimultaneousResult(devices: Device[], batteriesKWh: number[]): OptimizationResult {
  const active = devices.filter(d => d.isActive);
  const n = active.length;
  if (n === 0 || batteriesKWh.length === 0) {
    return { totalRuntime: 0, simultaneousRuntime: 0, optimizedRuntime: 0, efficiencyGain: 0, energyDistribution: [] };
  }

  // Rendit zbritës sipas fuqisë
  const orderByPowerDesc = active
    .map((d, idx) => ({ idx, p: d.powerConsumption }))
    .sort((a, b) => b.p - a.p);

  const powersDesc = orderByPowerDesc.map(x => x.p);

  // Mer top-N bateritë, zbritës
  const topDesc = [...batteriesKWh].sort((a, b) => b - a).slice(0, n);
  if (topDesc.length < n) {
    return { totalRuntime: 0, simultaneousRuntime: 0, optimizedRuntime: 0, efficiencyGain: 0, energyDistribution: [] };
  }

  // Bottleneck
  let t = Infinity;
  for (let i = 0; i < n; i++) {
    const pi = powersDesc[i] || Number.EPSILON;
    t = Math.min(t, topDesc[i] / pi);
  }
  if (!isFinite(t)) t = 0;

  const energyDistribution: EnergyAllocation[] = orderByPowerDesc.map(({ idx, p }) => ({
    deviceId: active[idx].id,
    allocatedEnergy: p * t,
    runtime: t,
  }));

  return {
    totalRuntime: t,
    simultaneousRuntime: t,
    optimizedRuntime: t,
    efficiencyGain: 0,
    energyDistribution,
    simultaneousDeviceHours: t * n,
    optimizedDeviceHours: t * n,
  };
}


// ---------------- ADVANCED: Optimized (LeetCode 2141) ----------------
// Përdor të gjitha bateritë si "extra" dhe nivelizon runtime-in për të gjitha pajisjet.
function buildAdvancedLeetCodeResult(devices: Device[], batteriesKWh: number[]): OptimizationResult {
  const active = devices.filter(d => d.isActive);
  const n = active.length;
  if (n === 0 || batteriesKWh.length === 0) {
    return { totalRuntime: 0, simultaneousRuntime: 0, optimizedRuntime: 0, efficiencyGain: 0, energyDistribution: [] };
  }

  const totalPowerKW = sum(active.map(d => d.powerConsumption));
  const avgPowerPerDeviceKW = totalPowerKW / n;

  // kWh -> "device-hours" 
  const batteriesInDeviceHours = batteriesKWh.map(E => E / (avgPowerPerDeviceKW || Number.EPSILON));

  // t_LC = max equal concurrent time
  const t = maxEqualConcurrentTimeFloat(n, batteriesInDeviceHours);

  const energyDistribution: EnergyAllocation[] = active.map(d => ({
    deviceId: d.id,
    allocatedEnergy: d.powerConsumption * t,
    runtime: t,
  }));

  return {
    totalRuntime: t,
    simultaneousRuntime: t,
    optimizedRuntime: t,
    efficiencyGain: 0, // baseline = simultaneous
    energyDistribution,
    simultaneousDeviceHours: t * n,
    optimizedDeviceHours: t * n,
  };
}

// ---------------- PRIORITY: Proportional ----------------
// 1) Garanto minDesiredRuntime për çdo pajisje (nëse e lejon energjia totale).
// 2) Shpërndaj tepricën proporcionalisht sipas peshave të dalë nga priorityOrder.
function buildPriorityProportional(
  devices: Device[],
  totalEnergyKWh: number,
  minDesiredRuntimeH: number,
  priorityOrder?: string[],
): OptimizationResult {
  const active = devices.filter(d => d.isActive);
  const n = active.length;
  if (n === 0 || totalEnergyKWh <= 0 || minDesiredRuntimeH < 0) {
    return { totalRuntime: 0, simultaneousRuntime: 0, optimizedRuntime: 0, efficiencyGain: 0, energyDistribution: [] };
  }

  // 1) Energji bazë për minimumin e kërkuar
  const baseEnergies = active.map(d => d.powerConsumption * minDesiredRuntimeH); 
  const E_min = baseEnergies.reduce((a, b) => a + b, 0);

  // Nëse energjia totale është më e vogël se minimumi i kërkuar, rregullo bazën
  if (totalEnergyKWh + 1e-9 < E_min) {
    const scale = totalEnergyKWh / (E_min || Number.EPSILON);
    const energyDistribution = active.map((d, i) => {
      const e = baseEnergies[i] * scale;
      return {
        deviceId: d.id,
        allocatedEnergy: e,
        runtime: e / (d.powerConsumption || Number.EPSILON),
      };
    });
    const minRuntimeAchieved = Math.min(...energyDistribution.map(x => x.runtime));
    const totalDH = energyDistribution.reduce((a, e) => a + e.runtime, 0);
    return {
      totalRuntime: totalDH / n,
      simultaneousRuntime: minRuntimeAchieved,
      optimizedRuntime: totalDH / n,
      efficiencyGain: 0,
      energyDistribution,
      simultaneousDeviceHours: minRuntimeAchieved * n,
      optimizedDeviceHours: totalDH,
    };
  }

  // 2) Kemi minimumin: aloko bazën dhe llogarit tepricën
  const allocation = active.map((_, i) => baseEnergies[i]); // kWh
  let E_leftover = totalEnergyKWh - E_min;                   // kWh

  // 3) Pesha sipas priorityOrder (default: rendi i listës aktive)
  //    Krijo mapa vetëm për pajisjet aktive
  const activeIds = new Set(active.map(d => d.id));
  const order = (priorityOrder && priorityOrder.length)
    ? priorityOrder.filter(id => activeIds.has(id))
    : active.map(d => d.id);

  // Pesha lineare: n, n-1, ..., 1
  const weightMap = new Map<string, number>();
  for (let i = 0; i < order.length; i++) {
    const id = order[i];
    const w = (order.length - i);
    weightMap.set(id, w);
  }
  const weights = active.map(d => weightMap.get(d.id) ?? 1);

  // 4) ***SHPRËNDARJE NË ORË*** (jo në kWh)
  //     E_leftover = Σ (deltaHours_i * P_i)  ku deltaHours_i = K * weight_i
  //     => E_leftover = K * Σ (weight_i * P_i)  ->  K = E_leftover / denom
  const denom = active.reduce(
    (acc, d, i) => acc + (weights[i] * (d.powerConsumption || Number.EPSILON)),
    0
  ) || 1;

  if (E_leftover > 0) {
    const K = E_leftover / denom; // koeficient orësh për njësi peshe
    for (let i = 0; i < n; i++) {
      const Pi = active[i].powerConsumption || Number.EPSILON;
      const deltaHours = K * weights[i];   // orë shtesë për pajisjen i
      const energyAdd  = deltaHours * Pi;  // kWh që i shtohen asaj pajisjeje
      allocation[i]   += energyAdd;
    }
    E_leftover = 0; // u shpërnda
  }

  // 5) Kthe rezultatet
    const energyDistribution = active.map((d, i) => ({
    deviceId: d.id,
    allocatedEnergy: allocation[i],
    runtime: allocation[i] / (d.powerConsumption || Number.EPSILON),
  }));

  const runtimes = energyDistribution.map(e => e.runtime);
  const minRuntime = Math.min(...runtimes);     // garancia (min)
  const maxRuntime = Math.max(...runtimes);     // maksimumi (që kërkon ti)
  const totalDH   = runtimes.reduce((a,b)=>a+b,0);
  const avgRuntime = totalDH / n;

  return {
    // në Priority do të përdorim maksimumin si "optimized"/"total"
    totalRuntime: maxRuntime,
    simultaneousRuntime: minRuntime,
    optimizedRuntime: maxRuntime,
    efficiencyGain: 0,
    energyDistribution,
    simultaneousDeviceHours: minRuntime * n,
    optimizedDeviceHours: totalDH, // ruajmë sum device-hours
  };
}

// ---------------- HTTP handler ----------------
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const raw = await req.text();
    console.log("🟢 Received raw body:", raw);
    if (!raw || raw.trim() === "") {
      return new Response(JSON.stringify({ error: "Empty body" }), { status: 400, headers: CORS });
    }

    const body: AnyRequest = JSON.parse(raw) as AnyRequest;

    // -------- PRIORITY MODE --------
    if ((body as PriorityPayload).mode === "priority") {
      const p = body as PriorityPayload;

      const totalEnergy = (Array.isArray(p.batteries) && p.batteries.length > 0)
        ? sum(p.batteries)
        : (Number(p.batteryCapacity) || 0);

      const res = buildPriorityProportional(
        p.devices,
        totalEnergy,
        Number(p.minDesiredRuntime) || 0,
        p.priorityOrder,
      );

      return new Response(JSON.stringify(res), { headers: CORS });
    }

    // -------- SIMPLE / ADVANCED MODES --------
    const { devices, optimizedMode, mode, batteries } = body as OptimizationRequest;

    const capacity = getEffectiveCapacity(body as OptimizationRequest);
    const active = devices.filter(d => d.isActive);
    if (active.length === 0 || capacity <= 0) {
      return new Response(JSON.stringify({
        totalRuntime: 0,
        simultaneousRuntime: 0,
        optimizedRuntime: 0,
        efficiencyGain: 0,
        energyDistribution: [],
      }), { headers: CORS });
    }

    // SIMPLE: pishinë e vetme (nuk pritet gain)
    if (mode === "simple") {
      const cap = Number((body as OptimizationRequest).batteryCapacity) || 0;
      const sim = buildSimplePoolResult(devices, cap);
      return new Response(JSON.stringify({
        ...sim,
        optimizedRuntime: sim.simultaneousRuntime,
        efficiencyGain: 0
      }), { headers: CORS });
    }

    // ADVANCED: bateri të ndara
    if (!Array.isArray(batteries) || batteries.length === 0) {
      return new Response(JSON.stringify({
        totalRuntime: 0,
        simultaneousRuntime: 0,
        optimizedRuntime: 0,
        efficiencyGain: 0,
        energyDistribution: [],
      }), { headers: CORS });
    }

    if (!optimizedMode) {
      // SIMULTANEOUS = baseline naiv (vetëm N bateritë më të mëdha)
      const simRes = buildAdvancedNaiveSimultaneousResult(devices, batteries);
      return new Response(JSON.stringify(simRes), { headers: CORS });
    } else {
      // OPTIMIZED = LeetCode 2141 — krahasuar me baseline naiv
      const simRes = buildAdvancedNaiveSimultaneousResult(devices, batteries);
      const lcRes  = buildAdvancedLeetCodeResult(devices, batteries);

      const sim = simRes.simultaneousRuntime;
      const opt = lcRes.optimizedRuntime;

      const gainPct = sim > 0 ? ((opt - sim) / sim) * 100 : 0;

      const out: OptimizationResult = {
        totalRuntime: opt,
        simultaneousRuntime: sim,
        optimizedRuntime: opt,
        efficiencyGain: round2(Math.max(0, gainPct)),
        energyDistribution: lcRes.energyDistribution,
        simultaneousDeviceHours: simRes.simultaneousDeviceHours,
        optimizedDeviceHours: lcRes.optimizedDeviceHours,
      };

      return new Response(JSON.stringify(out), { headers: CORS });
    }

  } catch (err) {
    console.error("❌ Optimization error:", err);
    return new Response(JSON.stringify({
      error: "Internal server error",
      details: err instanceof Error ? err.message : "Unknown error",
    }), { status: 500, headers: CORS });
  }
});
