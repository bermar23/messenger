import { LocationData } from '@/types';

export async function getClientIP(): Promise<string> {
  try {
    // Try multiple IP detection services for reliability
    const services = [
      'https://api.ipify.org?format=json',
      'https://ipapi.co/json/',
      'https://httpbin.org/ip'
    ];

    for (const service of services) {
      try {
        const response = await fetch(service);
        const data = await response.json();
        
        // Different services return IP in different formats
        const ip = data.ip || data.origin || data.query;
        if (ip) return ip;
      } catch (error) {
        console.warn(`Failed to get IP from ${service}:`, error);
        continue;
      }
    }

    // Fallback for local development
    return 'localhost';
  } catch (error) {
    console.error('Error getting client IP:', error);
    return 'unknown';
  }
}

export async function getLocationFromIP(ip: string): Promise<LocationData> {
  try {
    // Skip location detection for localhost/local IPs
    if (ip === 'localhost' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
      return {
        country: 'Local Network',
        region: 'Local',
        city: 'Local Development',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    }

    const response = await fetch(`https://ipapi.co/${ip}/json/`);
    const data = await response.json();

    return {
      country: data.country_name,
      region: data.region,
      city: data.city,
      lat: data.latitude,
      lon: data.longitude,
      timezone: data.timezone
    };
  } catch (error) {
    console.error('Error getting location from IP:', error);
    return {
      country: 'Unknown',
      region: 'Unknown',
      city: 'Unknown',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }
}

export function generateUserId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(date);
}
