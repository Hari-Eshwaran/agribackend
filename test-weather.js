// Test script for weather API
const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3002/api';

async function testWeather() {
    try {
        console.log('Testing current weather...');

        const currentResponse = await fetch(`${API_BASE_URL}/weather/current?city=Delhi&lat=28.6139&lng=77.2090`);
        const currentData = await currentResponse.json();
        console.log('Current weather response:', JSON.stringify(currentData, null, 2));

        console.log('\nTesting weather forecast...');

        const forecastResponse = await fetch(`${API_BASE_URL}/weather/forecast?city=Delhi&days=3`);
        const forecastData = await forecastResponse.json();
        console.log('Forecast response:', JSON.stringify(forecastData, null, 2));

        console.log('\nTesting weather alerts...');

        const alertsResponse = await fetch(`${API_BASE_URL}/weather/alerts?city=Delhi`);
        const alertsData = await alertsResponse.json();
        console.log('Alerts response:', JSON.stringify(alertsData, null, 2));

    } catch (error) {
        console.error('Weather test error:', error);
    }
}

testWeather();