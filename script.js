/* script.js
   WeatherAPI.com version — using environment variable
   Sign up free: https://www.weatherapi.com/
   On Vercel, set API_KEY in Project Settings → Environment Variables
*/

const API_KEY = process.env.API_KEY || ""; // <-- pulled from environment
const unitsKey = "wf_units";
const lastCityKey = "wf_last_city";

const selectors = {
  cityInput: document.getElementById("cityInput"),
  searchBtn: document.getElementById("searchBtn"),
  locBtn: document.getElementById("locBtn"),
  cBtn: document.getElementById("cBtn"),
  fBtn: document.getElementById("fBtn"),
  backdrop: document.getElementById("backdrop"),
  icon: document.getElementById("icon"),
  temp: document.getElementById("temp"),
  desc: document.getElementById("desc"),
  city: document.getElementById("city"),
  humidity: document.getElementById("humidity"),
  wind: document.getElementById("wind"),
  feels: document.getElementById("feels"),
  forecast: document.getElementById("forecast"),
};

let units = localStorage.getItem(unitsKey) || "metric";
updateUnitButtons();

selectors.searchBtn.addEventListener("click", searchCity);
selectors.cityInput.addEventListener("keyup", e => { if (e.key === "Enter") searchCity(); });
selectors.locBtn.addEventListener("click", useGeolocation);
selectors.cBtn.addEventListener("click", () => setUnits("metric"));
selectors.fBtn.addEventListener("click", () => setUnits("imperial"));

function setUnits(u) {
  units = u;
  localStorage.setItem(unitsKey, units);
  updateUnitButtons();
  const last = localStorage.getItem(lastCityKey);
  if (last) fetchWeather(last);
}

function updateUnitButtons() {
  if (units === "metric") {
    selectors.cBtn.classList.add("active");
    selectors.fBtn.classList.remove("active");
  } else {
    selectors.fBtn.classList.add("active");
    selectors.cBtn.classList.remove("active");
  }
}

function showLoading() {
  selectors.city.textContent = "Loading...";
  selectors.temp.textContent = "--";
  selectors.desc.textContent = "";
  selectors.forecast.innerHTML = "";
}

function searchCity() {
  const q = selectors.cityInput.value.trim();
  if (!q) return;
  localStorage.setItem(lastCityKey, q);
  fetchWeather(q);
}

function useGeolocation() {
  if (!navigator.geolocation) {
    alert("Geolocation not supported");
    return;
  }
  showLoading();
  navigator.geolocation.getCurrentPosition(async pos => {
    const { latitude, longitude } = pos.coords;
    await fetchWeather(`${latitude},${longitude}`);
  }, err => {
    alert("Couldn't get your location: " + err.message);
  }, { enableHighAccuracy: true, timeout: 10000 });
}

async function fetchWeather(query) {
  try {
    if (!API_KEY) {
      throw new Error("API key missing. Set API_KEY in environment variables.");
    }
    showLoading();
    const res = await fetch(`https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${encodeURIComponent(query)}&days=5&aqi=no`);
    if (!res.ok) throw new Error("City not found");
    const data = await res.json();
    renderCurrent(data);
    renderForecast(data.forecast.forecastday);
  } catch (err) {
    handleError(err);
  }
}

function renderCurrent(d) {
  const isMetric = (units === "metric");
  const temp = Math.round(isMetric ? d.current.temp_c : d.current.temp_f);
  const feelsLike = Math.round(isMetric ? d.current.feelslike_c : d.current.feelslike_f);

  selectors.city.textContent = `${d.location.name}, ${d.location.country}`;
  selectors.temp.textContent = `${temp}°${isMetric ? "C" : "F"}`;
  selectors.desc.textContent = d.current.condition.text;
  selectors.humidity.textContent = d.current.humidity;
  selectors.wind.textContent = isMetric ? d.current.wind_kph : d.current.wind_mph;
  selectors.feels.textContent = feelsLike;
  selectors.icon.textContent = mapIconToEmoji(d.current.condition.code, d.current.condition.text);

  const condition = d.current.condition.text.toLowerCase();
  selectors.backdrop.className = "backdrop";
  if (condition.includes("cloud")) selectors.backdrop.classList.add("cloudy");
  else if (condition.includes("rain") || condition.includes("drizzle") || condition.includes("thunder")) selectors.backdrop.classList.add("rainy");
  else if (condition.includes("snow")) selectors.backdrop.classList.add("snowy");
  else selectors.backdrop.classList.add("sunny");
}

function renderForecast(days) {
  selectors.forecast.innerHTML = "";
  days.forEach(day => {
    const d = new Date(day.date);
    const dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
    const isMetric = (units === "metric");
    const temp = Math.round(isMetric ? day.day.avgtemp_c : day.day.avgtemp_f);

    const node = document.createElement("div");
    node.className = "day";
    node.innerHTML = `
      <div class="small">${dayName}</div>
      <div style="font-size:26px">${mapIconToEmoji(day.day.condition.code, day.day.condition.text)}</div>
      <div class="tempSmall">${temp}°</div>
      <div class="small" style="margin-top:6px;color:var(--muted);text-transform:capitalize">${day.day.condition.text}</div>
    `;
    selectors.forecast.appendChild(node);
  });
}

function mapIconToEmoji(code, text) {
  const t = text.toLowerCase();
  if (t.includes("sun") || t.includes("clear")) return "☀️";
  if (t.includes("partly")) return "🌤️";
  if (t.includes("cloud")) return "☁️";
  if (t.includes("rain") || t.includes("drizzle")) return "🌧️";
  if (t.includes("thunder")) return "⛈️";
  if (t.includes("snow")) return "❄️";
  if (t.includes("fog") || t.includes("mist") || t.includes("haze")) return "🌫️";
  return "🌤️";
}

function handleError(e) {
  console.error(e);
  selectors.city.textContent = "Not found";
  selectors.temp.textContent = "--";
  selectors.desc.textContent = e.message || "Error";
  selectors.forecast.innerHTML = `<div class="small">${e.message || "Could not load weather"}</div>`;
}

(function init() {
  if (!API_KEY) {
    selectors.city.textContent = "API key not set.";
    selectors.desc.textContent = "Set API_KEY in Vercel environment variables.";
    return;
  }
  const last = localStorage.getItem(lastCityKey);
  if (last) {
    selectors.cityInput.value = last;
    fetchWeather(last);
  } else if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      fetchWeather(`${pos.coords.latitude},${pos.coords.longitude}`);
    }, () => { });
  }
})();

