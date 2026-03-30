// Weather API Service - OpenWeatherMap Integration
const API_KEY = 'YOUR_API_KEY'; // User should replace with their OpenWeatherMap API key
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

export interface WeatherData {
  temp: number;
  humidity: number;
  rainfall: number;
  windSpeed: number;
  description: string;
  icon: string;
}

export const fetchCurrentWeather = async (lat: number, lon: number): Promise<WeatherData> => {
  try {
    // For demo purposes, return simulated data if no API key
    if (API_KEY === 'YOUR_API_KEY') {
      return generateSimulatedWeather(lat, lon);
    }

    const response = await fetch(
      `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
    );
    
    if (!response.ok) throw new Error('Weather data fetch failed');
    
    const data = await response.json();
    return {
      temp: Math.round(data.main.temp),
      humidity: data.main.humidity,
      rainfall: data.rain ? data.rain['1h'] || 0 : 0,
      windSpeed: data.wind.speed,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
    };
  } catch (error) {
    console.error('Error fetching weather:', error);
    return generateSimulatedWeather(lat, lon);
  }
};

export const fetchForecast = async (lat: number, lon: number) => {
  try {
    if (API_KEY === 'YOUR_API_KEY') {
      return generateSimulatedForecast(lat, lon);
    }

    const response = await fetch(
      `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
    );
    
    if (!response.ok) throw new Error('Forecast fetch failed');
    
    const data = await response.json();
    return data.list.slice(0, 7).map((item: any, index: number) => ({
      day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(item.dt * 1000).getDay()],
      temp: Math.round(item.main.temp),
      humidity: item.main.humidity,
      rainfall: item.rain ? item.rain['3h'] || 0 : 0,
    }));
  } catch (error) {
    console.error('Error fetching forecast:', error);
    return generateSimulatedForecast(lat, lon);
  }
};

// Simulated data generators (fallback when API key not available)
function generateSimulatedWeather(lat: number, lon: number): WeatherData {
  const baseTemp = lat < 20 ? 30 : lat < 25 ? 28 : 32;
  return {
    temp: baseTemp + Math.round(Math.random() * 5 - 2.5),
    humidity: 60 + Math.round(Math.random() * 20),
    rainfall: Math.random() > 0.7 ? Math.round(Math.random() * 10) : 0,
    windSpeed: Math.round(Math.random() * 15 + 5),
    description: ['Clear sky', 'Few clouds', 'Scattered clouds', 'Light rain'][Math.floor(Math.random() * 4)],
    icon: '01d',
  };
}

function generateSimulatedForecast(lat: number, lon: number) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date().getDay();
  const baseTemp = lat < 20 ? 30 : lat < 25 ? 28 : 32;
  
  return days.map((day, i) => ({
    day: days[(today + i) % 7],
    temp: Math.round(baseTemp + Math.sin(i * 0.5) * 3 + Math.random() * 2),
    humidity: Math.round(65 + Math.sin(i * 0.3) * 10 + Math.random() * 5),
    rainfall: Math.round(Math.max(0, 5 + Math.sin(i * 0.4) * 5 + Math.random() * 3)),
  }));
}

// CSV Parsing Utility
export const parseCSV = (csvText: string): any[] => {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj: any = {};
    headers.forEach((header, index) => {
      const value = values[index]?.trim();
      obj[header] = isNaN(Number(value)) ? value : Number(value);
    });
    return obj;
  });
};
