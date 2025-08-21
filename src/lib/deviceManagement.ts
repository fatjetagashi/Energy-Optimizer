// Backend device management logic and utilities

export interface Device {
  id: string;
  name: string;
  powerConsumption: number;
  icon: string;
  isActive: boolean;
  activationOrder?: number;
}

export interface DeviceTemplate {
  name: string;
  powerConsumption: number;
  icon: string;
  category: string;
}

/**
 * Smart icon mapping based on device name keywords
 */
export function getIconForDevice(name: string): string {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('server') || lowerName.includes('rack')) return 'server';
  if (lowerName.includes('laptop') || lowerName.includes('notebook')) return 'laptop';
  if (lowerName.includes('camera') || lowerName.includes('security')) return 'camera';
  if (lowerName.includes('monitor') || lowerName.includes('display')) return 'monitor';
  if (lowerName.includes('printer') || lowerName.includes('print')) return 'printer';
  if (lowerName.includes('router') || lowerName.includes('gateway')) return 'router';
  if (lowerName.includes('wifi') || lowerName.includes('wireless') || lowerName.includes('access point')) return 'wifi';
  if (lowerName.includes('phone') || lowerName.includes('mobile')) return 'smartphone';
  if (lowerName.includes('car') || lowerName.includes('vehicle') || lowerName.includes('ev charger')) return 'car';
  if (lowerName.includes('light') || lowerName.includes('lamp') || lowerName.includes('led')) return 'lightbulb';
  if (lowerName.includes('fan') || lowerName.includes('ventilator')) return 'fan';
  if (lowerName.includes('air conditioner') || lowerName.includes('cooling') || lowerName.includes('hvac') || lowerName.includes('refrigerator') || lowerName.includes('freezer')) return 'snowflake';
  if (lowerName.includes('heater') || lowerName.includes('heating')) return 'wind';
  if (lowerName.includes('cpu') || lowerName.includes('processor')) return 'cpu';
  if (lowerName.includes('hard drive') || lowerName.includes('storage') || lowerName.includes('disk')) return 'harddrive';
  if (lowerName.includes('tv') || lowerName.includes('television')) return 'tv';
  if (lowerName.includes('speaker') || lowerName.includes('audio')) return 'speaker';
  if (lowerName.includes('game') || lowerName.includes('console') || lowerName.includes('xbox') || lowerName.includes('playstation')) return 'gamepad2';
  if (lowerName.includes('database') || lowerName.includes('db')) return 'database';
  if (lowerName.includes('firewall') || lowerName.includes('security')) return 'shield';
  if (lowerName.includes('building') || lowerName.includes('facility')) return 'building';
  if (lowerName.includes('home') || lowerName.includes('house')) return 'home';
  if (lowerName.includes('tool') || lowerName.includes('equipment')) return 'wrench';
  return 'server'; // default fallback
}

/**
 * Predefined device templates for quick adding
 */
export const deviceTemplates: DeviceTemplate[] = [
  // IT Equipment
  { name: 'Main Server', powerConsumption: 2.5, icon: 'server', category: 'IT Equipment' },
  { name: 'Backup Server', powerConsumption: 1.8, icon: 'server', category: 'IT Equipment' },
  { name: 'Work Laptop', powerConsumption: 0.5, icon: 'laptop', category: 'IT Equipment' },
  { name: 'Gaming Laptop', powerConsumption: 1.2, icon: 'laptop', category: 'IT Equipment' },
  { name: 'Desktop Monitor', powerConsumption: 0.15, icon: 'monitor', category: 'IT Equipment' },
  { name: 'Laser Printer', powerConsumption: 0.8, icon: 'printer', category: 'IT Equipment' },
  
  // Networking
  { name: 'WiFi Router', powerConsumption: 0.12, icon: 'router', category: 'Networking' },
  { name: 'Access Point', powerConsumption: 0.08, icon: 'wifi', category: 'Networking' },
  { name: 'Network Switch', powerConsumption: 0.3, icon: 'globe', category: 'Networking' },
  
  // Security & Monitoring
  { name: 'Security Camera', powerConsumption: 0.3, icon: 'camera', category: 'Security' },
  { name: 'IP Camera System', powerConsumption: 0.6, icon: 'shield', category: 'Security' },
  
  // Appliances & HVAC
  { name: 'LED Lighting System', powerConsumption: 0.2, icon: 'lightbulb', category: 'Appliances' },
  { name: 'Desk Fan', powerConsumption: 0.05, icon: 'fan', category: 'Appliances' },
  { name: 'Small Refrigerator', powerConsumption: 1.5, icon: 'snowflake', category: 'Appliances' },
  { name: 'Space Heater', powerConsumption: 1.8, icon: 'wind', category: 'Appliances' },
  
  // Entertainment
  { name: 'Smart TV 55"', powerConsumption: 0.15, icon: 'tv', category: 'Entertainment' },
  { name: 'Sound System', powerConsumption: 0.3, icon: 'speaker', category: 'Entertainment' },
  { name: 'Gaming Console', powerConsumption: 0.18, icon: 'gamepad2', category: 'Entertainment' },
  
  // Mobile & Charging
  { name: 'Phone Charging Station', powerConsumption: 0.025, icon: 'smartphone', category: 'Mobile' },
  { name: 'EV Charger', powerConsumption: 7.2, icon: 'car', category: 'Mobile' },
  
  // Medical Devices
  { name: 'Respirator', powerConsumption: 2.0, icon: 'ambulance', category: 'Medical' },
  { name: 'EKG Machine', powerConsumption: 1.2, icon: 'monitor', category: 'Medical' },
  { name: 'Portable Ultrasound', powerConsumption: 1.5, icon: 'camera', category: 'Medical' },
  { name: 'Medical Tablet', powerConsumption: 0.7, icon: 'laptop', category: 'Medical' },
  { name: 'IV Infusion Pump', powerConsumption: 0.9, icon: 'wrench', category: 'Medical' },
  { name: 'Oxygen Concentrator', powerConsumption: 2.3, icon: 'wind', category: 'Medical' }
];

/**
 * Create a new device from a template
 */
export function createDeviceFromTemplate(template: DeviceTemplate): Device {
  return {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    name: template.name,
    powerConsumption: template.powerConsumption,
    icon: template.icon,
    isActive: true
  };
}

/**
 * Create a custom device
 */
export function createCustomDevice(name: string, powerConsumption: number): Device {
  return {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    name: name.trim(),
    powerConsumption,
    icon: getIconForDevice(name),
    isActive: true
  };
}

/**
 * Update device power consumption
 */
export function updateDevicePower(devices: Device[], deviceId: string, newPower: number): Device[] {
  return devices.map(device => 
    device.id === deviceId 
      ? { ...device, powerConsumption: newPower }
      : device
  );
}

/**
 * Toggle device active state
 */
let activationCounter = 0;

export function toggleDeviceActive(devices: Device[], deviceId: string): Device[] {
  return devices.map(device => {
    if (device.id === deviceId) {
      const isActivating = !device.isActive;
      return {
        ...device,
        isActive: isActivating,
        activationOrder: isActivating ? ++activationCounter : undefined
      };
    }
    return device;
  });
}


/**
 * Remove device from list
 */
export function removeDevice(devices: Device[], deviceId: string): Device[] {
  return devices.filter(device => device.id !== deviceId);
}

/**
 * Get devices grouped by category
 */
export function getDevicesByCategory(): Record<string, DeviceTemplate[]> {
  return deviceTemplates.reduce((acc, device) => {
    if (!acc[device.category]) {
      acc[device.category] = [];
    }
    acc[device.category].push(device);
    return acc;
  }, {} as Record<string, DeviceTemplate[]>);
}

/**
 * Reset device power to original template value
 */
export function resetDevicePowerToDefault(devices: Device[], deviceId: string): Device[] {
  return devices.map(device => {
    if (device.id === deviceId) {
      const originalTemplate = deviceTemplates.find(template => template.name === device.name);
      if (originalTemplate) {
        return { ...device, powerConsumption: originalTemplate.powerConsumption };
      }
    }
    return device;
  });
}

/**
 * Calculate total power consumption of active devices
 */
export function calculateTotalPowerConsumption(devices: Device[]): number {
  return devices
    .filter(device => device.isActive)
    .reduce((total, device) => total + device.powerConsumption, 0);
}

/**
 * Get active devices only
 */
export function getActiveDevices(devices: Device[]): Device[] {
  return devices.filter(device => device.isActive);
}