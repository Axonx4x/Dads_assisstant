import { WeatherData } from '../types';

export const getWeather = async (lat: number, lon: number): Promise<WeatherData | null> => {
  // Fail fast if offline
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return null;
  }

  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data && data.current_weather) {
      return {
        temperature: data.current_weather.temperature,
        weatherCode: data.current_weather.weathercode,
      };
    }
    return null;
  } catch (error) {
    // return null gracefully on network error (Failed to fetch)
    return null;
  }
};

export const getWeatherDescription = (code: number): string => {
  // Simple mapping for Open-Meteo WMO codes
  if (code === 0) return 'Clear sky';
  if (code >= 1 && code <= 3) return 'Partly cloudy';
  if (code >= 45 && code <= 48) return 'Foggy';
  if (code >= 51 && code <= 55) return 'Drizzle';
  if (code >= 61 && code <= 65) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Cloudy';
};