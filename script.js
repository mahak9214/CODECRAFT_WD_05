const cityInput = document.querySelector('.city-input');
const searchBtn = document.querySelector('.search-btn');
const unitToggleBtn = document.querySelector('.unit-toggle');
const forecastContainer = document.getElementById('forecastContainer');
const chartCanvas = document.getElementById('weatherChart');
const forecastSection = document.getElementById('forecastSection');
const suggestionsList = document.getElementById('suggestions');
const searchSound = document.getElementById('searchSound');
const loader = document.getElementById('loader');
const toastContainer = document.getElementById('toast-container');

const weatherInfoSection = document.querySelector('.weather-info');
const notFoundSection = document.querySelector('.not-found');
const searchCitySection = document.querySelector('.search-city');

const countryTxt = document.querySelector('.country-txt');
const tempTxt = document.querySelector('.temp-txt');
const conditionTxt = document.querySelector('.condition-txt');
const humidityValueTxt = document.querySelector('.humidity-value-txt');
const windValueTxt = document.querySelector('.wind-value-txt');
const weatherSummaryImg = document.querySelector('.weather-summary-img');
const currentDateTxt = document.querySelector('.current-date-txt');
const feelsLikeTxt = document.querySelector('.feelslike-value-txt');
const windDirTxt = document.querySelector('.winddir-value-txt');
const pressureTxt = document.querySelector('.pressure-value-txt');
const visibilityTxt = document.querySelector('.visibility-value-txt');
const sunriseTxt = document.querySelector('.sunrise-value-txt');
const sunsetTxt = document.querySelector('.sunset-value-txt');
const locationBtn = document.querySelector('.location-btn');
let quoteTimer; // Place this near the top of your script

const weatherQuotes = {
  Clear: [
    "Clear skies and sunshine – a perfect day to shine!",
    "The sun is smiling at you today. Enjoy it!",
    "Not a cloud in sight. Make today bright!"
  ],
  Rain: [
    "Let the rain wash away your worries.",
    "Rainy days bring inner peace and cozy vibes.",
    "Umbrella up, smile on!"
  ],
  Snow: [
    "Snowflakes are kisses from heaven.",
    "Every snowflake is a masterpiece of nature.",
    "Time to build a snowman!"
  ],
  Clouds: [
    "Even cloudy skies can’t dull your shine.",
    "Behind every cloud is a silver lining.",
    "A calm, cloudy day – perfect for reflection."
  ],
  Thunderstorm: [
    "Even the sky has its wild moments.",
    "Let the storm inspire your strength.",
    "Boom! Nature’s power is on full display."
  ],
  Drizzle: [
    "A light drizzle to freshen the soul.",
    "Just a soft whisper from the sky.",
    "The world looks gentler in a drizzle."
  ],
  Mist: [
    "A misty morning hides many wonders.",
    "Soft mist, softer thoughts.",
    "Let the fog bring calm."
  ],
  Snow: [
    "Snow is the poetry of the sky.",
    "Winter whispers in white.",
    "Let it snow, let it glow."
  ],
  Default: [
    "Whatever the weather, always bring your own sunshine.",
    "Every day has its own weather – embrace it.",
    "Nature always wears the colors of the spirit."
  ]
};


const apiKey = '82020ffbd8931aa9b79ae06245a7e485';
let currentUnit = 'metric';
let lastSearchedCity = '';
let chart;

// Toast Notification
function showToast(message, duration = 3000) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 100);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Loader Controls
function showLoader() {
  loader.style.display = 'block';
}
function hideLoader() {
  loader.style.display = 'none';
}

// Show city suggestions
async function showSuggestions(inputValue) {
  suggestionsList.innerHTML = '';
  if (inputValue.length === 0) {
    suggestionsList.style.display = 'none';
    return;
  }

  try {
    const res = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(inputValue)}&limit=5&appid=${apiKey}`);
    const cities = await res.json();

    if (cities.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'No suggestions found';
      li.style.color = '#ccc';
      suggestionsList.appendChild(li);
      suggestionsList.style.display = 'block';
      return;
    }

    cities.forEach(city => {
      const li = document.createElement('li');
      li.textContent = `${city.name}, ${city.country}`;
      li.addEventListener('click', () => {
        cityInput.value = city.name;
        suggestionsList.style.display = 'none';
        searchBtn.click();
      });
      suggestionsList.appendChild(li);
    });
    suggestionsList.style.display = 'block';
  } catch (err) {
    console.error('Suggestion Error:', err);
  }
}

// Input Events
cityInput.addEventListener('input', () => {
  showSuggestions(cityInput.value.trim());
});
cityInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    suggestionsList.style.display = 'none';
    searchBtn.click();
  }
});
document.addEventListener('click', (e) => {
  if (!suggestionsList.contains(e.target) && e.target !== cityInput) {
    suggestionsList.style.display = 'none';
  }
});

locationBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    showToast('Geolocation not supported by this browser.');
    return;
  }

  showLoader();
  navigator.geolocation.getCurrentPosition(
    async position => {
      const { latitude, longitude } = position.coords;
      try {
        await updateWeatherByCoordinates(latitude, longitude);
      } catch (err) {
        console.error('Location error:', err);
        showToast('Failed to get weather from location');
      } finally {
        hideLoader();
      }
    },
    error => {
      console.error('Geolocation Error:', error);
      showToast('Permission denied or location unavailable');
      hideLoader();
    }
  );
});


// Button Events
searchBtn.addEventListener('click', () => {
  const city = cityInput.value.trim();
  if (city) {
    playSearchSound();
    updateWeatherInfo(city);
    cityInput.blur();
    suggestionsList.innerHTML = '';
  } else {
    showToast('Please enter a city name');
  }
});

unitToggleBtn.addEventListener('click', () => {
  currentUnit = currentUnit === 'metric' ? 'imperial' : 'metric';
  unitToggleBtn.textContent = `Switch to °${currentUnit === 'metric' ? 'F' : 'C'}`;
  if (lastSearchedCity) updateWeatherInfo(lastSearchedCity);
});

// Search sound
function playSearchSound() {
  if (searchSound) {
    searchSound.currentTime = 0;
    searchSound.play();
  }
}

// Section Display
function showDisplaySection(section) {
  [weatherInfoSection, notFoundSection, searchCitySection].forEach(
    sec => sec.style.display = 'none'
  );
  section.style.display = 'flex';
}

// Helpers
function getWeatherIcon(id) {
  if (id <= 232) return 'thunderstorm.svg';
  if (id <= 321) return 'drizzle.svg';
  if (id <= 531) return 'rain.svg';
  if (id <= 622) return 'snow.svg';
  if (id <= 781) return 'atmosphere.svg';
  if (id === 800) return 'clear.svg';
  return 'clouds.svg';
}

function getCurrentDate() {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short'
  });
}

function convertUnixToTime(unix) {
  return new Date(unix * 1000).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}


function getWindDirection(degree) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(degree / 45) % 8];
}

// Main Weather Fetch
async function updateWeatherInfo(city) {
  lastSearchedCity = city;
  showLoader();
  try {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=${currentUnit}`);
    const data = await res.json();

    if (data.cod !== 200) {
      showDisplaySection(notFoundSection);
      hideLoader();
      chartCanvas.style.display = 'none';
      forecastSection.style.display = 'none';
      showToast('City not found');
      return;
    }

    const { name, main, weather, wind, sys, visibility, timezone, coord } = data;

    countryTxt.textContent = name;
    tempTxt.textContent = `${Math.round(main.temp)} °${currentUnit === 'metric' ? 'C' : 'F'}`;
    conditionTxt.textContent = weather[0].main;
    const condition = weather[0].main;
const quotes = weatherQuotes[condition] || weatherQuotes['Default'];
const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
let quoteTimer; // Declare at top of script to manage the timer

function updateWeatherQuote(condition) {
  const quoteBox = document.getElementById('weatherQuote');
  const quotes = weatherQuotes[condition] || weatherQuotes['Default'];
  let currentIndex = 0;

  // Clear previous timer
  if (quoteTimer) clearInterval(quoteTimer);

  // Function to show quote
  const showNextQuote = () => {
    const quote = quotes[currentIndex];
    quoteBox.classList.remove('fade-in'); // Reset animation
    void quoteBox.offsetWidth; // Force reflow to restart animation
    quoteBox.textContent = `"${quote}"`;
    quoteBox.classList.add('fade-in');
    currentIndex = (currentIndex + 1) % quotes.length;
  };

  showNextQuote(); // Show first immediately
  quoteTimer = setInterval(showNextQuote, 8000); // Update every 8s
}


    humidityValueTxt.textContent = `${main.humidity}%`;
    windValueTxt.textContent = `${wind.speed} ${currentUnit === 'metric' ? 'm/s' : 'mph'}`;
    feelsLikeTxt.textContent = `${Math.round(main.feels_like)} °${currentUnit === 'metric' ? 'C' : 'F'}`;
    windDirTxt.textContent = getWindDirection(wind.deg);
    pressureTxt.textContent = `${main.pressure} hPa`;
    visibilityTxt.textContent = `${visibility / 1000} km`;
    sunriseTxt.textContent = convertUnixToTime(sys.sunrise, timezone);
    sunsetTxt.textContent = convertUnixToTime(sys.sunset, timezone);
    currentDateTxt.textContent = getCurrentDate();
    weatherSummaryImg.src = `assets/assets/weather/${getWeatherIcon(weather[0].id)}`;

    await updateForecastChart(coord.lat, coord.lon);
    await updateWeeklyForecast(coord.lat, coord.lon);

    chartCanvas.style.display = 'block';
    forecastSection.style.display = 'block';
    showDisplaySection(weatherInfoSection);
    showToast(`Weather updated for ${name}`);
    updateWeatherQuote(weather[0].main);

  } catch (err) {
    console.error('Weather fetch error:', err);
    showDisplaySection(notFoundSection);
    showToast('Failed to fetch weather data');
  } finally {
    hideLoader();
  }
}

// Draw Forecast Chart
async function updateForecastChart(lat, lon) {
  try {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${currentUnit}`);
    const data = await res.json();

    const dayMap = {};
    data.list.forEach(item => {
      const dateStr = item.dt_txt.split(' ')[0];
      if (!dayMap[dateStr]) dayMap[dateStr] = [];
      dayMap[dateStr].push(item);
    });

    const labels = [], temps = [];
    const todayStr = new Date().toISOString().split('T')[0];
    const keys = Object.keys(dayMap).filter(k => k !== todayStr).slice(0, 5);

    keys.forEach(key => {
      const dailyData = dayMap[key];
      const mid = Math.floor(dailyData.length / 2);
      const forecast = dailyData[mid];
      const date = new Date(forecast.dt_txt);
      labels.push(date.toLocaleDateString('en-GB', { weekday: 'short' }));
      temps.push(forecast.main.temp);
    });

    if (chart) chart.destroy();

    chart = new Chart(chartCanvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: `Forecast (°${currentUnit === 'metric' ? 'C' : 'F'})`,
          data: temps,
          backgroundColor: 'rgba(255,255,255,0.2)',
          borderColor: 'white',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        plugins: { legend: { labels: { color: 'white' } } },
        scales: {
          x: { ticks: { color: 'white' } },
          y: { ticks: { color: 'white' } }
        }
      }
    });
  } catch (err) {
    console.error('Chart error:', err);
  }
}

// Weekly Forecast
async function updateWeeklyForecast(lat, lon) {
  try {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${currentUnit}`);
    const data = await res.json();

    forecastContainer.innerHTML = '';

    const dailyGroups = {};
    data.list.forEach(item => {
      const date = item.dt_txt.split(' ')[0];
      if (!dailyGroups[date]) dailyGroups[date] = [];
      dailyGroups[date].push(item);
    });

    const today = new Date().toISOString().split('T')[0];
    const keys = Object.keys(dailyGroups).filter(d => d !== today).slice(0, 5);

    keys.forEach(date => {
      const dayData = dailyGroups[date];
      const midIndex = Math.floor(dayData.length / 2);
      const forecast = dayData[midIndex];

      const dayName = new Date(date).toLocaleDateString('en-GB', { weekday: 'short' });
      const icon = getWeatherIcon(forecast.weather[0].id);
      const temp = Math.round(forecast.main.temp);

      const card = document.createElement('div');
      card.className = 'forecast-day';
      card.innerHTML = `
        <h4>${dayName}</h4>
        <img src="assets/assets/weather/${icon}" alt="${forecast.weather[0].main}" />
        <span><strong>${temp} °${currentUnit === 'metric' ? 'C' : 'F'}</strong></span>
        <span>${forecast.weather[0].main}</span>
      `;
      forecastContainer.appendChild(card);
    });
  } catch (err) {
    console.error('Forecast error:', err);
  }
}
async function getCityFromCoordinates(lat, lon) {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`
    );
    const data = await res.json();
    return data.length > 0 ? data[0].name : null;
  } catch (err) {
    console.error('Reverse geocoding failed:', err);
    return null;
  }
}
async function updateWeatherByCoordinates(lat, lon) {
  showLoader();
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${currentUnit}`
    );
    const data = await res.json();

    if (data.cod !== 200) {
      showDisplaySection(notFoundSection);
      showToast('Location weather not found');
      chartCanvas.style.display = 'none';
      forecastSection.style.display = 'none';
      return;
    }

    lastSearchedCity = data.name;
    cityInput.value = data.name;

    // Populate weather UI (same as updateWeatherInfo)
    const { name, main, weather, wind, sys, visibility, timezone, coord } = data;

    countryTxt.textContent = name;
    tempTxt.textContent = `${Math.round(main.temp)} °${currentUnit === 'metric' ? 'C' : 'F'}`;
    conditionTxt.textContent = weather[0].main;
    humidityValueTxt.textContent = `${main.humidity}%`;
    windValueTxt.textContent = `${wind.speed} ${currentUnit === 'metric' ? 'm/s' : 'mph'}`;
    feelsLikeTxt.textContent = `${Math.round(main.feels_like)} °${currentUnit === 'metric' ? 'C' : 'F'}`;
    windDirTxt.textContent = getWindDirection(wind.deg);
    pressureTxt.textContent = main.pressure ? `${main.pressure} hPa` : '--';
    visibilityTxt.textContent = visibility ? `${(visibility / 1000).toFixed(1)} km` : '--';
    sunriseTxt.textContent = convertUnixToTime(sys.sunrise);
sunsetTxt.textContent = convertUnixToTime(sys.sunset);
    currentDateTxt.textContent = getCurrentDate();
    weatherSummaryImg.src = `assets/assets/weather/${getWeatherIcon(weather[0].id)}`;

    await updateForecastChart(coord.lat, coord.lon);
    await updateWeeklyForecast(coord.lat, coord.lon);
    updateWeatherQuote(weather[0].main);

    chartCanvas.style.display = 'block';
    forecastSection.style.display = 'block';
    showDisplaySection(weatherInfoSection);
    showToast(`Weather based on your location`);
  } catch (err) {
    console.error('Location Weather Error:', err);
    showDisplaySection(notFoundSection);
    showToast('Failed to fetch weather from location');
  } finally {
    hideLoader();
  }
}
window.addEventListener('load', () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        updateWeatherByCoordinates(latitude, longitude);
      },
      err => {
        console.warn('Location permission denied.');
      }
    );
  }
});

