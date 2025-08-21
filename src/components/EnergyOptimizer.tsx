import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Progress } from '@/components/ui/progress.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Switch } from '@/components/ui/switch.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { Server, Laptop, Camera, Plus, Play, Pause, RotateCcw, Trash2, Edit, Zap, Monitor, Printer, Wifi, Cpu, HardDrive, Router, Smartphone, Car, Lightbulb, Wind, Snowflake, Home, Building, Wrench, Globe, Database, Shield, Speaker, Gamepad2, Tv, Fan, ChevronLeft, ChevronRight, Ambulance, Battery, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip.tsx';
import { useToast } from '@/hooks/use-toast.ts';

// Import backend logic

import {
  type Device,
  deviceTemplates,
  getDevicesByCategory,
  createDeviceFromTemplate,
  createCustomDevice,
  updateDevicePower,
  toggleDeviceActive,
  removeDevice,
  resetDevicePowerToDefault,
  calculateTotalPowerConsumption,
  getActiveDevices,
  getIconForDevice
} from '@/lib/deviceManagement.ts';

type EnergyDistItem = { deviceId: string; allocatedEnergy: number; runtime: number };

interface OptimizationResult {
  totalRuntime: number;
  simultaneousRuntime: number;
  optimizedRuntime: number;
  efficiencyGain: number;
  energyDistribution: EnergyDistItem[];
}


const EnergyOptimizer: React.FC = () => {
  const [batteryCapacity, setBatteryCapacity] = useState<number>(20);
  const [batteryCapacities, setBatteryCapacities] = useState<number[]>([20]);
  const [isAdvancedBatteryMode, setIsAdvancedBatteryMode] = useState<boolean>(true); // Default to Advanced Mode
  const [batteries, setBatteries] = useState<{ id: string; capacity: number }[]>([
    { id: '1', capacity: 20 }
  ]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [optimizedMode, setOptimizedMode] = useState<boolean>(false); // false = Simultaneous Mode (default)
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentRuntime, setCurrentRuntime] = useState<number>(0);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [customDeviceName, setCustomDeviceName] = useState<string>('');
  const [customDevicePower, setCustomDevicePower] = useState<number>(1.0);
  const [isCustomDialogOpen, setIsCustomDialogOpen] = useState<boolean>(false);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState<number>(0);
  const [editingDevice, setEditingDevice] = useState<string | null>(null);
  const [editingPower, setEditingPower] = useState<number>(0);
  const [desiredRuntime, setDesiredRuntime] = useState<number>(12);
  const [feasibilityResult, setFeasibilityResult] = useState<string | null>(null);
  const [minimumDesiredRuntime, setMinimumDesiredRuntime] = useState<number>(4);
  const { toast } = useToast();

  // shto pranë state-ve ekzistuese
const [priorityMode, setPriorityMode] = useState<boolean>(false);

const formatHours = (hours: number) =>
  (Math.round(hours * 100) / 100).toFixed(2).replace(".", ",") + "h";


  // Battery management functions
  const totalBatteryCapacity = batteries.reduce((sum, battery) => sum + (battery.capacity || 0), 0);
  // Use the correct capacity depending on mode
  const effectiveCapacity = isAdvancedBatteryMode ? totalBatteryCapacity : batteryCapacity;

  
  const handleBatteryModeSwitch = (isAdvanced: boolean) => {
    setIsAdvancedBatteryMode(isAdvanced);
    
    if (isAdvanced) {
      // Switch to advanced: convert simple capacity to single battery
      setBatteries([{ id: '1', capacity: batteryCapacity }]);
      setBatteryCapacities([batteryCapacity]);
    } else {
      // Switch to simple: use total of all batteries
      setBatteryCapacity(totalBatteryCapacity);
      setBatteryCapacities([totalBatteryCapacity]);
    }
  };

  const handleSimpleBatteryCapacityChange = (capacity: number) => {
    setBatteryCapacity(capacity);
    setBatteryCapacities([capacity]);
  };

  const handleBatteryCapacityChange = (id: string, capacity: number) => {
    const updatedBatteries = batteries.map(battery =>
      battery.id === id ? { ...battery, capacity } : battery
    );
    setBatteries(updatedBatteries);
    
    const capacities = updatedBatteries
      .map(b => b.capacity)
      .filter(c => c > 0);
    setBatteryCapacities(capacities);
    
    // Update legacy batteryCapacity for compatibility
    setBatteryCapacity(updatedBatteries.reduce((sum, b) => sum + b.capacity, 0));
  };

  const addBattery = () => {
    const newId = (Math.max(...batteries.map(b => parseInt(b.id))) + 1).toString();
    const newBatteries = [...batteries, { id: newId, capacity: 10 }];
    setBatteries(newBatteries);
    
    const capacities = newBatteries
      .map(b => b.capacity)
      .filter(c => c > 0);
    setBatteryCapacities(capacities);
    setBatteryCapacity(newBatteries.reduce((sum, b) => sum + b.capacity, 0));
  };

  const removeBattery = (id: string) => {
    if (batteries.length <= 1) return;
    
    const updatedBatteries = batteries.filter(battery => battery.id !== id);
    setBatteries(updatedBatteries);
    
    const capacities = updatedBatteries
      .map(b => b.capacity)
      .filter(c => c > 0);
    setBatteryCapacities(capacities);
    setBatteryCapacity(updatedBatteries.reduce((sum, b) => sum + b.capacity, 0));
  };

  // Icon mapping is now handled by backend deviceManagement module

  const deviceIcons: Record<string, React.ReactNode> = {
    server: <Server className="h-4 w-4" />,
    laptop: <Laptop className="h-4 w-4" />, 
    camera: <Camera className="h-4 w-4" />,
    monitor: <Monitor className="h-4 w-4" />,
    printer: <Printer className="h-4 w-4" />,
    router: <Router className="h-4 w-4" />,
    wifi: <Wifi className="h-4 w-4" />,
    smartphone: <Smartphone className="h-4 w-4" />,
    car: <Car className="h-4 w-4" />,
    lightbulb: <Lightbulb className="h-4 w-4" />,
    fan: <Fan className="h-4 w-4" />,
    snowflake: <Snowflake className="h-4 w-4" />,
    wind: <Wind className="h-4 w-4" />,
    cpu: <Cpu className="h-4 w-4" />,
    harddrive: <HardDrive className="h-4 w-4" />,
    tv: <Tv className="h-4 w-4" />,
    speaker: <Speaker className="h-4 w-4" />,
    gamepad2: <Gamepad2 className="h-4 w-4" />,
    database: <Database className="h-4 w-4" />,
    shield: <Shield className="h-4 w-4" />,
    building: <Building className="h-4 w-4" />,
    home: <Home className="h-4 w-4" />,
    wrench: <Wrench className="h-4 w-4" />,
    globe: <Globe className="h-4 w-4" />,
    ambulance: <Ambulance className="h-4 w-4" />
  };

  // Device templates are now imported from backend deviceManagement module
//const [priorityMode, setPriorityMode] = useState(false);
//const [minimumDesiredRuntime, setMinimumDesiredRuntime] = useState<number>(0);

function buildPayload() {
  if (priorityMode) {
    return {
      mode: "priority",
      devices,
      minDesiredRuntime: minimumDesiredRuntime,
      priorityOrder: devices.filter(d => d.isActive).map(d => d.id),
      ...(isAdvancedBatteryMode
        ? { batteries: batteryCapacities }
        : { batteryCapacity })
    };
  }

  // payload normal (Simultaneous / Optimized LC2141)
  return {
    devices,
    optimizedMode,
    mode: isAdvancedBatteryMode ? "advanced" : "simple",
    ...(isAdvancedBatteryMode
      ? { batteries: batteryCapacities }
      : { batteryCapacity })
  };
}



const runOptimization = useCallback(async () => {
  const payload = buildPayload();
  console.log("Payload sent:", payload);
  const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/optimize-energy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data: OptimizationResult = await response.json();
  console.log("RES ←", data);
  return data;
}, [devices, optimizedMode, isAdvancedBatteryMode, batteryCapacity, batteryCapacities, priorityMode, minimumDesiredRuntime]);


/* Duplicate runOptimization removed to resolve identifier conflict. */

  const addCustomDevice = () => {
    if (!customDeviceName.trim()) {
      toast({
        title: "Device name required",
        description: "Please enter a device name.",
        variant: "destructive"
      });
      return;
    }

    const newDevice = createCustomDevice(customDeviceName, customDevicePower);
    setDevices(prev => [...prev, newDevice]);
    setCustomDeviceName('');
    setCustomDevicePower(1.0);
    setIsCustomDialogOpen(false);
    
    toast({
      title: "Custom Device Added",
      description: `${customDeviceName} has been added with ${customDevicePower} kWh consumption.`
    });
  };

  const addDevice = (template: typeof deviceTemplates[0]) => {
    const newDevice = createDeviceFromTemplate(template);
    setDevices(prev => [...prev, newDevice]);
    toast({
      title: "Device Added",
      description: `${template.name} has been added to your configuration.`
    });
  };

  const handleRemoveDevice = (id: string) => {
  const updatedDevices = removeDevice(devices, id);
  setDevices(updatedDevices);

  if (updatedDevices.length === 0) {
    setOptimizationResult(null); // Fshi rezultatet kur nuk ka paisje
  }

  toast({
    title: "Device Removed",
    description: "Device has been removed from your configuration."
  });
};


  const handleToggleDevice = (id: string) => {
    setDevices(prev => toggleDeviceActive(prev, id));
  };

  const startEditingDevice = (id: string, currentPower: number) => {
    setEditingDevice(id);
    setEditingPower(currentPower);
  };

  const saveDevicePower = (id: string) => {
    setDevices(prev => updateDevicePower(prev, id, editingPower));
    setEditingDevice(null);
    toast({
      title: "Power Updated",
      description: "Device power consumption has been updated."
    });
  };

  const resetDevicePower = (id: string) => {
    setDevices(prev => resetDevicePowerToDefault(prev, id));
    toast({
      title: "Power Reset",
      description: "Device power consumption has been reset to default."
    });
  };

  const startSimulation = async () => {
  const result = await runOptimization();
  if (!result) return;

  setOptimizationResult(result);
  setIsRunning(true);
  setCurrentRuntime(0);

  if (priorityMode) {
    toast({
      title: "Priority Mode Simulation Started",
      description: `Target Runtime: ${minimumDesiredRuntime} hours – Checking feasibility...`
    });
  } else if (optimizedMode) {
    toast({
      title: "Optimized Mode Simulation Started",
      description: "Optimized energy distribution algorithm is running."
    });
  } else {
    toast({
      title: "Simultaneous Mode Simulation Started",
      description: "All devices running simultaneously until battery depletes."
    });
  }
};



  const stopSimulation = () => {
    setIsRunning(false);
    setCurrentRuntime(0);
    toast({
      title: "Simulation Stopped",
      description: "Energy simulation has been stopped."
    });
  };

  // Runtime timer effect
 useEffect(() => {
   let rafId: number | null = null;
   let last = performance.now();

   const tick = () => {
     const now = performance.now();
     const deltaMs = now - last;
     last = now;

    setCurrentRuntime(prev => {
  if (!optimizationResult) return prev;
  const next = prev + (deltaMs / 3600000); // ms -> orë
  if (next >= maxRuntime) {
    setIsRunning(false);
    toast({
      title: "Simulation Complete",
      description: "All devices have finished running based on available energy."
    });
    return maxRuntime;
  }
  return next;
});


     rafId = requestAnimationFrame(tick);
   };

   if (isRunning && optimizationResult) {
     last = performance.now();
     rafId = requestAnimationFrame(tick);
   }
   return () => { if (rafId) cancelAnimationFrame(rafId); };
 }, [isRunning, optimizationResult, optimizedMode, toast]);

  // Recalculate optimization when relevant data changes
 useEffect(() => {
  let cancel = false;
  const modeSnapshot = optimizedMode;

  const recalc = async () => {
    const hasEnergy = isAdvancedBatteryMode
      ? batteryCapacities.some(c => c > 0)
      : batteryCapacity > 0;

    if (devices.length > 0 && hasEnergy) {
      const result = await runOptimization();
      if (!cancel && result && optimizedMode === modeSnapshot) {
        setOptimizationResult(result);
      }
    } else {
      setOptimizationResult(null);
    }
  };

  recalc();
  return () => { cancel = true; };
}, [devices, batteryCapacity, batteryCapacities, isAdvancedBatteryMode, optimizedMode]); // ← pa runOptimization

useEffect(() => {
  const hasEnergy = isAdvancedBatteryMode
    ? batteryCapacities.some(c => c > 0)
    : batteryCapacity > 0;

  if (devices.length > 0 && hasEnergy) {
    runOptimization().then(setOptimizationResult);
  }
  // s'ka nevojë të fusësh runOptimization në deps, vetëm çfarë përdor këtu
}, [optimizedMode, devices.length, isAdvancedBatteryMode, batteryCapacity, batteryCapacities]);
 

const activeDevices = getActiveDevices(devices);
  const totalPowerConsumption = calculateTotalPowerConsumption(devices);

  // ── Utils për kohë ─────────────────────────────────────
const formatClock = (hours: number) => {
  if (!isFinite(hours) || hours <= 0) hours = 0;
  const totalSeconds = Math.round(hours * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

// ── Derivime për UI (një burim e vërtetë) ──────────────
const isSimple = !isAdvancedBatteryMode;

const sim = optimizationResult?.simultaneousRuntime ?? 0;
// Në Simple: optimized == simultaneous (by design); në Advanced: merre nga BE
const opt = priorityMode
  ? (optimizationResult?.optimizedRuntime ?? sim)   // MAX device runtime
  : (!isAdvancedBatteryMode
      ? sim
      : (optimizationResult?.optimizedRuntime ?? sim));
const delta = Math.max(0, opt - sim);
const gainPct = isSimple ? 0 : (optimizationResult?.efficiencyGain ?? 0);

// Max runtime që po e përdor për progresin dhe “Maximum Runtime”
const maxRuntime =
  optimizationResult
    ? (optimizedMode ? optimizationResult.optimizedRuntime
                     : optimizationResult.simultaneousRuntime)
    : 0;

// Përqindja e progresit (me guard + clamp)
const progressPct = Math.max(
  0,
  Math.min(100, (currentRuntime / (maxRuntime || 1e-9)) * 100)
);


// Rreshtat për tabelën per-device
const distRows = (optimizationResult?.energyDistribution ?? []).map(d => {
  const device = devices.find(x => x.id === d.deviceId);
  return {
    id: d.deviceId,
    name: device?.name ?? d.deviceId,
    icon: device?.icon ?? "server",
    simH: sim,
    optH: isSimple ? sim : d.runtime
  };
});



  
  // Calculate battery percentage for color coding
  const currentEnergyUsed = optimizationResult
  ? optimizationResult.energyDistribution.reduce((sum, d) => sum + d.allocatedEnergy, 0)
  : 0;

  const batteryPercentage = effectiveCapacity > 0
  ? Math.max(0, ((effectiveCapacity - currentEnergyUsed) / effectiveCapacity) * 100)
  : 100;

  // Get battery color based on percentage (updated thresholds)
  const getBatteryColor = (percentage: number) => {
    if (percentage >= 60) return 'text-green-500';
    if (percentage >= 30) return 'text-yellow-500';
    return 'text-red-500';
  };
  
  // Check feasibility for desired runtime
  const checkFeasibility = () => {
  if (activeDevices.length === 0) {
    setFeasibilityResult("❌ No active devices to check");
    return;
  }

  const totalPowerNeeded = totalPowerConsumption * desiredRuntime;
  const maxPossibleRuntime = effectiveCapacity / totalPowerConsumption;

  if (totalPowerNeeded <= effectiveCapacity) {
    setFeasibilityResult(`✅ Batteries can support devices for ${desiredRuntime}h`);
  } else {
    setFeasibilityResult(`❌ Only ${maxPossibleRuntime.toFixed(1)}h supported – reduce device load or add battery`);
  }
};

  // Group devices by category
  const devicesByCategory = getDevicesByCategory();

  const categoryNames = Object.keys(devicesByCategory);
  const currentCategory = categoryNames[currentCategoryIndex];
  const currentCategoryDevices = devicesByCategory[currentCategory] || [];

  const nextCategory = () => {
    setCurrentCategoryIndex((prev) => (prev + 1) % categoryNames.length);
  };

  const prevCategory = () => {
    setCurrentCategoryIndex((prev) => (prev - 1 + categoryNames.length) % categoryNames.length);
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-energy flex items-center justify-center">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-energy bg-clip-text text-transparent">
                  Energy Runtime Optimizer
                </h1>
                <p className="text-muted-foreground">
                  Maximize device runtime through intelligent energy distribution
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Device Management - Equal Width with Shadow */}
            <Card className="lg:col-span-1 shadow-lg border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-energy-blue" />
                  Device Management
                </CardTitle>
                <CardDescription>Add and configure your devices</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Quick Add Devices - With Pagination */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Quick Add Devices</Label>
                    <Dialog open={isCustomDialogOpen} onOpenChange={setIsCustomDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Custom Device
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Add Custom Device</DialogTitle>
                          <DialogDescription>
                            Create a custom device with specific power consumption
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="custom-name" className="text-right">
                              Name
                            </Label>
                            <Input
                              id="custom-name"
                              value={customDeviceName}
                              onChange={(e) => setCustomDeviceName(e.target.value)}
                              placeholder="e.g., 3D Printer"
                              className="col-span-3"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="custom-power" className="text-right">
                              Power (kWh)
                            </Label>
                            <Input
                              id="custom-power"
                              type="number"
                              value={customDevicePower}
                              onChange={(e) => setCustomDevicePower(Number(e.target.value))}
                              min="0"
                              step="0.1"
                              className="col-span-3"
                            />
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Smart icon will be auto-selected based on device name
                          </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={addCustomDevice}>Add Device</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  {/* Category Navigation */}
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={prevCategory}
                      disabled={categoryNames.length <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-center">
                      <h4 className="text-sm font-medium">{currentCategory}</h4>
                      <p className="text-xs text-muted-foreground">
                        {currentCategoryIndex + 1} of {categoryNames.length}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={nextCategory}
                      disabled={categoryNames.length <= 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Compact Device Grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {currentCategoryDevices.map((device, index) => (
                      <Button
                        key={`${currentCategory}-${index}`}
                        variant="outline"
                        onClick={() => addDevice(device)}
                        className="justify-start gap-2 h-16 p-2"
                      >
                        {deviceIcons[device.icon]}
                        <div className="text-left">
                          <div className="font-medium text-xs">{device.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {device.powerConsumption} kWh
                          </div>
                        </div>
                      </Button>
                    ))}
                   </div>
                </div>
                
                {/* Desired Runtime Section */}
                <Separator className="my-4" />
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    ⏳ Desired Runtime
                  </Label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="runtime" className="w-24 text-sm">Hours Needed</Label>
                      <Input
                        id="runtime"
                        type="number"
                        value={desiredRuntime}
                        onChange={(e) => setDesiredRuntime(Number(e.target.value))}
                        placeholder="e.g. 12"
                        min="0"
                        step="0.5"
                        className="flex-1"
                      />
                      <Button 
                        onClick={checkFeasibility}
                        variant="outline"
                        size="sm"
                        disabled={activeDevices.length === 0}
                      >
                        Check Feasibility
                      </Button>
                    </div>
                    {feasibilityResult && (
                      <div className="p-3 bg-background rounded-lg border shadow-sm">
                        <p className="text-sm font-medium">{feasibilityResult}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Battery Configuration - Equal Width */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Battery className="h-5 w-5 text-energy-blue" />
                  Battery Configuration
                </CardTitle>
                <CardDescription>Configure your energy storage capacity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Mode Toggle */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">Input Mode</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Use Advanced Mode to maximize efficiency using intelligent battery distribution algorithms.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">🔧 Simple</span>
                      <Switch
                        checked={isAdvancedBatteryMode}
                        onCheckedChange={handleBatteryModeSwitch}
                      />
                      <span className="text-sm text-muted-foreground">⚡ Advanced</span>
                    </div>
                  </div>
                  
                  <Badge variant={isAdvancedBatteryMode ? "default" : "secondary"} className="w-fit">
                    {isAdvancedBatteryMode ? "Advanced Mode (Recommended)" : "Simple Mode"}
                  </Badge>
                </div>

                <Separator />

                {/* Simple Mode */}
                {!isAdvancedBatteryMode && (
                  <div className="space-y-3">
                    <Label htmlFor="simple-battery-capacity">Total Battery Capacity (kWh)</Label>
                    <Input
                      id="simple-battery-capacity"
                      type="number"
                      value={batteryCapacity}
                      onChange={(e) => handleSimpleBatteryCapacityChange(Number(e.target.value))}
                      min="0"
                      step="0.1"
                      placeholder="Enter total battery capacity"
                    />
                    <p className="text-sm text-muted-foreground">
                      Enter the total capacity of all your batteries combined.
                    </p>
                  </div>
                )}

                {/* Advanced Mode */}
                {isAdvancedBatteryMode && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Individual Batteries</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addBattery}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Battery
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {batteries.map((battery, index) => (
                        <div key={battery.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                          <div className="flex items-center gap-2 flex-1">
                            <Battery className="h-4 w-4 text-energy-blue" />
                            <Label className="text-sm font-medium min-w-0">
                              Battery {index + 1}:
                            </Label>
                            <Input
                              type="number"
                              value={battery.capacity}
                              onChange={(e) => handleBatteryCapacityChange(battery.id, Number(e.target.value))}
                              min="0"
                              step="0.1"
                              className="w-24"
                              placeholder="0"
                            />
                            <span className="text-sm text-muted-foreground">kWh</span>
                          </div>
                          {batteries.length > 1 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeBattery(battery.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Remove this battery</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Total Display */}
                    <div className="p-3 rounded-lg bg-muted/50 border">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium flex items-center gap-2">
                          <Tooltip>
                            <TooltipTrigger>
                              <Battery className={`h-5 w-5 ${getBatteryColor(batteryPercentage)}`} />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{batteryPercentage.toFixed(1)}% of battery remaining</p>
                            </TooltipContent>
                          </Tooltip>
                          Total Capacity:
                        </span>
                        <span className="text-lg font-bold text-energy-blue">
                          {totalBatteryCapacity.toFixed(1)} kWh
                        </span>
                      </div>
                    </div>

                    {/* Validation Message */}
                    {!batteries.some(b => b.capacity > 0) && (
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                        <p className="text-sm text-destructive">
                          At least one battery must have a positive capacity value.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <Separator />
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center justify-between">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>Execution Mode</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Simultaneous: All devices run together<br/>Optimized: Priority-based energy distribution</p>
                        </TooltipContent>
                      </Tooltip>
                      <Switch
  checked={optimizedMode}
  onCheckedChange={(checked) => {
    setOptimizedMode(checked);
    if (checked) setPriorityMode(false);     // <-- ekskluzivitet
  }}
/>
                    </Label>
                    <div className="text-sm text-muted-foreground">
                      {optimizedMode ? 'Optimized Priority Mode' : 'Simultaneous Mode'}
                    </div>
                  </div>

                  <div className="space-y-2">
  <Label className="flex items-center justify-between">
    <span>Priority Mode</span>
     <Switch
  checked={priorityMode}
  onCheckedChange={(checked) => {
    setPriorityMode(checked);
    if (checked) setOptimizedMode(false);    // <-- ekskluzivitet
  }}
/>
  </Label>
  <div className="text-sm text-muted-foreground">
    {priorityMode
      ? "Priority Mode active (min runtime required)"
      : "Priority Mode inactive"}
  </div>
</div>

                  
                  {/* Priority Mode - Minimum Desired Runtime */}
                  {priorityMode && (
                    <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="priority-runtime" className="text-sm">Minimum Desired Runtime</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>The minimum number of hours you need the system to operate. The algorithm will check if this is feasible with the available battery capacity.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          id="priority-runtime"
                          type="number"
                          value={minimumDesiredRuntime}
                          onChange={(e) => setMinimumDesiredRuntime(Number(e.target.value))}
                          placeholder="e.g., 4"
                          min="0"
                          step="0.5"
                          className="flex-1"
                        />
                        <span className="text-sm text-muted-foreground">hours</span>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Power Draw:</span>
                    <span className="font-mono">{totalPowerConsumption.toFixed(1)} kWh</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Active Devices:</span>
                    <span className="font-mono">{activeDevices.length}</span>
                  </div>
                </div>

                <Separator />

                {/* Current Devices - Moved here */}
                <div className="space-y-3">
                  <Label>Current Devices ({devices.length})</Label>
                  {devices.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <Server className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No devices configured</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {devices.map((device) => (
                        <div
                          key={device.id}
                          className={`flex items-center justify-between p-2 border rounded-lg transition-all duration-200 hover:scale-[1.02] ${
                            device.isActive ? 'bg-energy-blue/5 border-energy-blue/20' : 'bg-muted/30'
                          }`}
                        >
                           <div className="flex items-center gap-2">
                             <Switch
                               checked={device.isActive}
                               onCheckedChange={() => handleToggleDevice(device.id)}
                             />
                             {deviceIcons[device.icon]}
                             <div>
                               <div className="font-medium text-sm">{device.name}</div>
                               {editingDevice === device.id ? (
                                 <div className="flex items-center gap-1">
                                   <Input
                                     type="number"
                                     value={editingPower}
                                     onChange={(e) => setEditingPower(Number(e.target.value))}
                                     min="0"
                                     step="0.1"
                                     className="h-5 w-16 text-xs"
                                   />
                                   <span className="text-xs">kWh</span>
                                 </div>
                               ) : (
                                 <div className="text-xs text-muted-foreground">
                                   {device.powerConsumption} kWh
                                 </div>
                               )}
                             </div>
                           </div>
                           <div className="flex items-center gap-1">
                             <Badge variant={device.isActive ? "default" : "secondary"} className="text-xs px-1">
                               {device.isActive ? 'Active' : 'Inactive'}
                             </Badge>
                             {editingDevice === device.id ? (
                               <>
                                 <Tooltip>
                                   <TooltipTrigger asChild>
                                     <Button
                                       variant="ghost"
                                       size="sm"
                                       onClick={() => saveDevicePower(device.id)}
                                       className="h-6 w-6 p-0"
                                     >
                                       <Play className="h-3 w-3" />
                                     </Button>
                                   </TooltipTrigger>
                                   <TooltipContent>
                                     <p>Save changes</p>
                                   </TooltipContent>
                                 </Tooltip>
                                 <Tooltip>
                                   <TooltipTrigger asChild>
                                     <Button
                                       variant="ghost"
                                       size="sm"
                                       onClick={() => setEditingDevice(null)}
                                       className="h-6 w-6 p-0"
                                     >
                                       <Pause className="h-3 w-3" />
                                     </Button>
                                   </TooltipTrigger>
                                   <TooltipContent>
                                     <p>Cancel</p>
                                   </TooltipContent>
                                 </Tooltip>
                               </>
                             ) : (
                               <>
                                 <Tooltip>
                                   <TooltipTrigger asChild>
                                     <Button
                                       variant="ghost"
                                       size="sm"
                                       onClick={() => startEditingDevice(device.id, device.powerConsumption)}
                                       className="h-6 w-6 p-0"
                                     >
                                       <Edit className="h-3 w-3" />
                                     </Button>
                                   </TooltipTrigger>
                                   <TooltipContent>
                                     <p>Edit power consumption</p>
                                   </TooltipContent>
                                 </Tooltip>
                                 <Tooltip>
                                   <TooltipTrigger asChild>
                                     <Button
                                       variant="ghost"
                                       size="sm"
                                       onClick={() => resetDevicePower(device.id)}
                                       className="h-6 w-6 p-0"
                                     >
                                       <RotateCcw className="h-3 w-3" />
                                     </Button>
                                   </TooltipTrigger>
                                   <TooltipContent>
                                     <p>Reset to default</p>
                                   </TooltipContent>
                                 </Tooltip>
                                 <Tooltip>
                                   <TooltipTrigger asChild>
                                     <Button
                                       variant="ghost"
                                       size="sm"
                                       onClick={() => handleRemoveDevice(device.id)}
                                       className="h-6 w-6 p-0"
                                     >
                                       <Trash2 className="h-3 w-3" />
                                     </Button>
                                   </TooltipTrigger>
                                   <TooltipContent>
                                     <p>Remove device</p>
                                   </TooltipContent>
                                 </Tooltip>
                               </>
                             )}
                           </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Runtime Monitor */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5 text-energy-green" />
                  Runtime Monitor
                </CardTitle>
                <CardDescription>Real-time energy simulation status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Button
                    onClick={startSimulation}
                    disabled={activeDevices.length === 0 || isRunning}
                    className="bg-gradient-power hover:shadow-glow-primary"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Simulation
                  </Button>
                  <Button
                    variant="outline"
                    onClick={stopSimulation}
                    disabled={!isRunning}
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Stop
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCurrentRuntime(0);
                      setIsRunning(false);
                    }}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                </div>

                {optimizationResult && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="text-center p-4 border rounded-lg">
  <div className="text-2xl font-bold text-energy-blue">
    {formatClock(currentRuntime)}
  </div>
  <div className="text-sm text-muted-foreground">Current Runtime</div>
</div>


<div className="text-center p-4 border rounded-lg">
  <div className="text-2xl font-bold text-energy-green">
     {formatClock(opt)}
  </div>
  <div className="text-sm text-muted-foreground">Maximum Runtime</div>
</div>

<div className="text-center p-4 border rounded-lg">
  <Tooltip>
    <TooltipTrigger asChild>
      <div className="text-2xl font-bold text-energy-yellow">
        {optimizationResult.efficiencyGain.toFixed(1)}%
      </div>
    </TooltipTrigger>
    <TooltipContent>
      <p>Percentage improvement using optimized algorithm</p>
    </TooltipContent>
  </Tooltip>
  <div className="text-sm text-muted-foreground">Efficiency Gain</div>
</div>
    
  
                    </div>

                   <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{progressPct.toFixed(2)}%</span>
                   </div>
                  <Progress value={progressPct} className="h-3" />
                  </div>
                  </div>
                )}
              </CardContent>
            </Card>


            {/* Optimization Results */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-energy-green" />
                  Optimization Results
                </CardTitle>
                <CardDescription>Algorithm performance comparison</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {optimizationResult ? (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">{priorityMode ? "Min guaranteed runtime:" : "Simultaneous :"}</span>
                        <span className="font-mono text-energy-blue">
                          {formatClock(sim)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">{priorityMode ? "Maximum device runtime: " : "Optimized (LeetCode 2141):"}</span>
                        <span className="font-mono text-energy-green">
                          {formatClock(opt)}
                        </span>
                      </div>
                      {!priorityMode && (
                      <div className="flex justify-between items-center font-medium">
                        <span className="text-sm">Time Gained:</span>
                        <span className="font-mono text-energy-yellow">
                          {formatClock(delta)}
                        </span>
                      </div>
                      )}

                    </div>

                    <Separator />

                    <div className="space-y-2">
  <Label className="text-sm">Energy Distribution (per device)</Label>

  <div className="grid grid-cols-3 px-2 py-1 text-xs text-muted-foreground">
    <span>Device</span>
    <span className="text-right">Simul.</span>
    <span className="text-right">Optimized</span>
  </div>

  {optimizationResult.energyDistribution.map((dist) => {
    const device = devices.find(d => d.id === dist.deviceId);
    if (!device) return null;

    const sim = optimizationResult.simultaneousRuntime; // baseline i njëjtë për të gjitha
    const opt = dist.runtime;                           // runtime i optimizuar për pajisjen

    return (
      <div key={dist.deviceId} className="grid grid-cols-3 items-center px-2 py-1 text-xs">
        <div className="flex items-center gap-1">
          {deviceIcons[device.icon]}
          <span>{device.name}</span>
        </div>
<span className="font-mono text-right">{formatClock(sim)}</span>
<span className="font-mono text-right">{formatClock(opt)}</span>
      </div>
    );
  })}
</div>

                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Zap className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p>Add devices to see optimization results</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default EnergyOptimizer;