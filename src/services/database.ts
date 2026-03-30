// Database Service - localStorage for CSV data and user preferences
const DB_PREFIX = 'weatherApp_';

export interface StoredCSV {
  id: string;
  name: string;
  data: any[];
  uploadedAt: string;
  region: string;
}

export interface UserPreferences {
  defaultRegion: string;
  isDark: boolean;
  notifications: boolean;
  lastLogin: string;
}

export const db = {
  // CSV Data Storage
  saveCSV: (file: StoredCSV): void => {
    const files = db.getAllCSV();
    files.push(file);
    localStorage.setItem(`${DB_PREFIX}csv_files`, JSON.stringify(files));
  },

  getAllCSV: (): StoredCSV[] => {
    try {
      const data = localStorage.getItem(`${DB_PREFIX}csv_files`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  deleteCSV: (id: string): void => {
    const files = db.getAllCSV().filter(f => f.id !== id);
    localStorage.setItem(`${DB_PREFIX}csv_files`, JSON.stringify(files));
  },

  getCSVById: (id: string): StoredCSV | null => {
    return db.getAllCSV().find(f => f.id === id) || null;
  },

  // User Preferences
  savePreferences: (prefs: UserPreferences): void => {
    localStorage.setItem(`${DB_PREFIX}preferences`, JSON.stringify(prefs));
  },

  getPreferences: (): UserPreferences => {
    try {
      const data = localStorage.getItem(`${DB_PREFIX}preferences`);
      return data ? JSON.parse(data) : {
        defaultRegion: 'hyderabad',
        isDark: true,
        notifications: true,
        lastLogin: new Date().toISOString(),
      };
    } catch {
      return {
        defaultRegion: 'hyderabad',
        isDark: true,
        notifications: true,
        lastLogin: new Date().toISOString(),
      };
    }
  },

  // Weather Data Cache (for offline support)
  cacheWeatherData: (regionId: string, data: any): void => {
    const cache = {
      data,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(`${DB_PREFIX}weather_${regionId}`, JSON.stringify(cache));
  },

  getCachedWeather: (regionId: string): any | null => {
    try {
      const data = localStorage.getItem(`${DB_PREFIX}weather_${regionId}`);
      if (!data) return null;
      const cache = JSON.parse(data);
      // Return cached data if less than 1 hour old
      const timestamp = new Date(cache.timestamp).getTime();
      const now = new Date().getTime();
      if (now - timestamp < 3600000) {
        return cache.data;
      }
      return null;
    } catch {
      return null;
    }
  },

  // Clear all data
  clearAll: (): void => {
    Object.keys(localStorage)
      .filter(key => key.startsWith(DB_PREFIX))
      .forEach(key => localStorage.removeItem(key));
  },

  // Get storage usage
  getStorageSize: (): number => {
    let size = 0;
    Object.keys(localStorage)
      .filter(key => key.startsWith(DB_PREFIX))
      .forEach(key => {
        size += localStorage.getItem(key)?.length || 0;
      });
    return size;
  },
};
