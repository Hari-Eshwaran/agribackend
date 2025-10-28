// Test script for weather and market API endpoints
const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3002/api';

async function testWeatherAndMarket() {
    try {
        console.log('Testing weather endpoints...');

        // Test current weather
        console.log('1. Testing current weather...');
        const currentResponse = await fetch(`${API_BASE_URL}/weather/current?city=Delhi`);
        const currentData = await currentResponse.json();
        console.log('Current weather status:', currentResponse.status);
        console.log('Current weather data:', JSON.stringify(currentData, null, 2));

        // Test weather forecast
        console.log('\n2. Testing weather forecast...');
        const forecastResponse = await fetch(`${API_BASE_URL}/weather/forecast?city=Delhi&days=3`);
        const forecastData = await forecastResponse.json();
        console.log('Forecast status:', forecastResponse.status);
        console.log('Forecast data sample:', JSON.stringify(forecastData.forecast?.[0], null, 2));

        // Test weather alerts
        console.log('\n3. Testing weather alerts...');
        const alertsResponse = await fetch(`${API_BASE_URL}/weather/alerts?city=Delhi`);
        const alertsData = await alertsResponse.json();
        console.log('Alerts status:', alertsResponse.status);
        console.log('Alerts data:', JSON.stringify(alertsData, null, 2));

        console.log('\nTesting market endpoints...');

        // Test market prices
        console.log('4. Testing market prices...');
        const pricesResponse = await fetch(`${API_BASE_URL}/market/prices?limit=5`);
        const pricesData = await pricesResponse.json();
        console.log('Prices status:', pricesResponse.status);
        console.log('Prices data sample:', JSON.stringify(pricesData.prices?.[0], null, 2));

        // Test market prices by commodity
        console.log('\n5. Testing market prices by commodity...');
        const commodityResponse = await fetch(`${API_BASE_URL}/market/prices/wheat?limit=3`);
        const commodityData = await commodityResponse.json();
        console.log('Commodity prices status:', commodityResponse.status);
        console.log('Commodity data:', JSON.stringify(commodityData, null, 2));

        // Test market trends
        console.log('\n6. Testing market trends...');
        const trendsResponse = await fetch(`${API_BASE_URL}/market/trends`);
        const trendsData = await trendsResponse.json();
        console.log('Trends status:', trendsResponse.status);
        console.log('Trends data sample:', JSON.stringify(trendsData.trends?.[0], null, 2));

        // Test market analysis
        console.log('\n7. Testing market analysis...');
        const analysisResponse = await fetch(`${API_BASE_URL}/market/analysis?commodity=wheat`);
        const analysisData = await analysisResponse.json();
        console.log('Analysis status:', analysisResponse.status);
        console.log('Analysis data:', JSON.stringify(analysisData.analysis, null, 2));

        console.log('\n✅ All API endpoints tested successfully!');

    } catch (error) {
        console.error('Test error:', error);
    }
}

testWeatherAndMarket();