const mongoose = require('mongoose');
const { Product, User } = require('../models/index');
require('dotenv').config();

const sampleProducts = [
    // Fruits
    {
        name: "Premium Apples",
        category: "seeds",
        price: 120,
        unit: "kg",
        rating: 4.8,
        stock: 500,
        organic: true,
        description: "Fresh red apples from Kashmir valleys",
        discount: 10,
        location: {
            address: "Kashmir Valley",
            city: "Srinagar",
            state: "Jammu and Kashmir",
            pincode: "190001"
        }
    },
    {
        name: "Alphonso Mangoes",
        category: "seeds",
        price: 280,
        unit: "kg",
        rating: 4.9,
        stock: 300,
        organic: true,
        description: "King of mangoes - Premium Alphonso variety",
        discount: 0,
        location: {
            address: "Ratnagiri Farms",
            city: "Ratnagiri",
            state: "Maharashtra",
            pincode: "415612"
        }
    },

    // Vegetables
    {
        name: "Premium Tomatoes",
        category: "seeds",
        price: 45,
        unit: "kg",
        rating: 4.7,
        stock: 800,
        organic: true,
        description: "Vine-ripened organic tomatoes",
        discount: 0,
        location: {
            address: "Green Valley Farm",
            city: "Ludhiana",
            state: "Punjab",
            pincode: "141001"
        }
    },
    {
        name: "Organic Carrots",
        category: "seeds",
        price: 55,
        unit: "kg",
        rating: 4.6,
        stock: 600,
        organic: true,
        description: "Sweet and crunchy organic carrots",
        discount: 0,
        location: {
            address: "Organic Harvest",
            city: "Gurgaon",
            state: "Haryana",
            pincode: "122001"
        }
    },

    // Fertilizers
    {
        name: "NPK Fertilizer 19:19:19",
        category: "fertilizers",
        price: 850,
        unit: "50kg bag",
        rating: 4.6,
        stock: 200,
        organic: false,
        description: "Balanced NPK fertilizer for all crops",
        discount: 8,
        location: {
            address: "AgriCorp Ltd",
            city: "Hisar",
            state: "Haryana",
            pincode: "125001"
        }
    },
    {
        name: "Organic Compost",
        category: "fertilizers",
        price: 450,
        unit: "50kg bag",
        rating: 4.8,
        stock: 150,
        organic: true,
        description: "Rich organic compost made from cow dung",
        discount: 12,
        location: {
            address: "EcoFarm Solutions",
            city: "Bangalore",
            state: "Karnataka",
            pincode: "560001"
        }
    },

    // Seeds
    {
        name: "Wheat Seeds (HD-3086)",
        category: "seeds",
        price: 1200,
        unit: "quintal",
        rating: 4.9,
        stock: 100,
        organic: false,
        description: "High yielding drought resistant wheat variety",
        discount: 5,
        location: {
            address: "SeedTech Ltd",
            city: "Jaipur",
            state: "Rajasthan",
            pincode: "302001"
        }
    },
    {
        name: "Tomato Seeds (Hybrid)",
        category: "seeds",
        price: 450,
        unit: "100g packet",
        rating: 4.5,
        stock: 500,
        organic: false,
        description: "Disease resistant hybrid tomato seeds",
        discount: 10,
        location: {
            address: "VegSeed Co",
            city: "Bangalore",
            state: "Karnataka",
            pincode: "560001"
        }
    },

    // Equipment
    {
        name: "Garden Hose 50ft",
        category: "equipment",
        price: 1250,
        unit: "piece",
        rating: 4.4,
        stock: 75,
        organic: false,
        description: "Heavy duty garden hose with spray nozzle",
        discount: 20,
        location: {
            address: "AgriTools",
            city: "Delhi",
            state: "Delhi",
            pincode: "110001"
        }
    },
    {
        name: "Hand Pruning Shears",
        category: "equipment",
        price: 350,
        unit: "piece",
        rating: 4.6,
        stock: 200,
        organic: false,
        description: "Sharp steel pruning shears for garden use",
        discount: 0,
        location: {
            address: "FarmTools Ltd",
            city: "Ludhiana",
            state: "Punjab",
            pincode: "141001"
        }
    }
];

async function seedProducts() {
    try {
        // Connect to MongoDB
        if (process.env.MONGODB_URI) {
            await mongoose.connect(process.env.MONGODB_URI);
            console.log('✅ Connected to MongoDB');
        } else {
            console.log('❌ No MONGODB_URI provided');
            return;
        }

        // Find a farmer user to assign as seller
        const farmer = await User.findOne({ role: 'farmer' });
        if (!farmer) {
            console.log('❌ No farmer user found. Please create a farmer user first.');
            return;
        }

        console.log(`📦 Seeding ${sampleProducts.length} products for farmer: ${farmer.name}`);

        // Clear existing products
        await Product.deleteMany({});
        console.log('🗑️  Cleared existing products');

        // Add seller to each product and create them
        const productsWithSeller = sampleProducts.map(product => ({
            ...product,
            seller: farmer._id
        }));

        const createdProducts = await Product.insertMany(productsWithSeller);
        console.log(`✅ Successfully seeded ${createdProducts.length} products`);

        // Disconnect from MongoDB
        await mongoose.disconnect();
        console.log('📪 Disconnected from MongoDB');

    } catch (error) {
        console.error('❌ Error seeding products:', error);
        process.exit(1);
    }
}

// Run the seed function
seedProducts();