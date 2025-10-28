// Test script for authentication API
const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3002/api';

async function testAuth() {
    try {
        console.log('Testing user registration...');

        const registerResponse = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: 'Test User',
                email: 'test@example.com',
                password: 'password123'
            }),
        });

        const registerData = await registerResponse.json();
        console.log('Registration response:', registerData);

        if (registerResponse.ok) {
            console.log('Testing login...');

            const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: 'test@example.com',
                    password: 'password123'
                }),
            });

            const loginData = await loginResponse.json();
            console.log('Login response:', loginData);

            if (loginResponse.ok) {
                console.log('Testing get current user...');

                const meResponse = await fetch(`${API_BASE_URL}/auth/me`, {
                    headers: {
                        'Authorization': `Bearer ${loginData.accessToken}`,
                    },
                });

                const meData = await meResponse.json();
                console.log('Me response:', meData);
            }
        }
    } catch (error) {
        console.error('Test error:', error);
    }
}

testAuth();