export const recipes = [
    // CLASSIC SLUSHIES
    {
        id: 1,
        name: "Classic Cola Slush",
        categories: ["Classic", "Non-Alcoholic"],
        description: "The timeless classic. Simple and refreshing.",
        ingredients: [
            { name: "Cola", amount: "1 Liter", baseMl: 1000, note: "Do not use Diet unless adding thickener/allulose" }
        ],
        instructions: "Pour soda into the machine. Wait 30 mins.",
        machineSetting: "Slush",
        tags: ["Easy", "Kid Friendly"]
    },
    {
        id: 2,
        name: "Blue Raspberry",
        categories: ["Classic", "Non-Alcoholic"],
        description: "The movie theater favorite.",
        ingredients: [
            { name: "Blue Raspberry Syrup", amount: "1 part", baseMl: 30 },
            { name: "Water", amount: "5 parts", baseMl: 150 }
        ],
        instructions: "Mix syrup and water. Pour into machine.",
        machineSetting: "Slush",
        tags: ["Sweet", "Vibrant"]
    },
    {
        id: 3,
        name: "Frozen Lemonade",
        categories: ["Classic", "Non-Alcoholic"],
        description: "Tart, sweet, and supremely refreshing.",
        ingredients: [
            { name: "Lemon Juice", amount: "1 cup", baseMl: 237 },
            { name: "Water", amount: "3 cups", baseMl: 710 },
            { name: "Sugar", amount: "3/4 cup", baseMl: 177, note: "Dissolve in water first" }
        ],
        instructions: "Dissolve sugar in water. Add lemon juice. Pour into machine.",
        machineSetting: "Slush",
        tags: ["Citrus", "Kid Friendly"]
    },
    {
        id: 4,
        name: "Cherry Limeade Slush",
        categories: ["Classic", "Non-Alcoholic"],
        description: "Tart lime meets sweet cherry in perfect harmony.",
        ingredients: [
            { name: "Cherry Syrup", amount: "1/2 cup", baseMl: 118 },
            { name: "Lime Juice", amount: "1/4 cup", baseMl: 59 },
            { name: "Water", amount: "3 cups", baseMl: 710 },
            { name: "Sugar", amount: "1/4 cup", baseMl: 59 }
        ],
        instructions: "Mix all ingredients until sugar dissolves. Pour into machine.",
        machineSetting: "Slush",
        tags: ["Sweet", "Tart", "Colorful"]
    },
    {
        id: 5,
        name: "Tropical Fruit Punch",
        categories: ["Classic", "Non-Alcoholic"],
        description: "A blend of tropical sunshine.",
        ingredients: [
            { name: "Orange Juice", amount: "2 cups", baseMl: 473 },
            { name: "Pineapple Juice", amount: "1 cup", baseMl: 237 },
            { name: "Strawberry Syrup", amount: "1/4 cup", baseMl: 59 }
        ],
        instructions: "Combine all ingredients. Pour into machine.",
        machineSetting: "Slush",
        tags: ["Tropical", "Fruity", "Kid Friendly"]
    },

    // SPIKED SLUSHIES
    {
        id: 6,
        name: "Frozen Margarita",
        categories: ["Spiked"],
        description: "A crowd pleaser for parties.",
        ingredients: [
            { name: "Tequila", amount: "6 oz", baseMl: 177 },
            { name: "Lime Juice", amount: "2 oz", baseMl: 59 },
            { name: "Triple Sec", amount: "2 oz", baseMl: 59 },
            { name: "Water", amount: "18 oz", baseMl: 532 }
        ],
        instructions: "Combine all ingredients. Pour into machine. Rim glasses with salt.",
        machineSetting: "Spiked Slush",
        tags: ["Alcoholic", "Party", "Classic Cocktail"]
    },
    {
        id: 7,
        name: "Piña Colada",
        categories: ["Spiked", "Creamy"],
        description: "Tropical vacation in a glass.",
        ingredients: [
            { name: "Pineapple Juice", amount: "750 ml", baseMl: 750 },
            { name: "Coconut Cream", amount: "400 ml", baseMl: 400 },
            { name: "Rum", amount: "6 oz", baseMl: 177, note: "Optional for non-alcoholic" }
        ],
        instructions: "Whisk coconut cream and juice together thoroughly. Add rum if desired.",
        machineSetting: "Frozen Cocktail",
        tags: ["Creamy", "Tropical", "Alcoholic"]
    },
    {
        id: 8,
        name: "Strawberry Daiquiri",
        categories: ["Spiked"],
        description: "Sweet, fruity, and perfectly balanced.",
        ingredients: [
            { name: "White Rum", amount: "6 oz", baseMl: 177 },
            { name: "Lime Juice", amount: "3 oz", baseMl: 89 },
            { name: "Simple Syrup", amount: "2 oz", baseMl: 59 },
            { name: "Strawberry Syrup", amount: "3 oz", baseMl: 89 },
            { name: "Water", amount: "12 oz", baseMl: 355 }
        ],
        instructions: "Combine all ingredients. Pour into machine.",
        machineSetting: "Spiked Slush",
        tags: ["Alcoholic", "Berry", "Classic Cocktail"]
    },
    {
        id: 9,
        name: "Frosé (Frozen Rosé)",
        categories: ["Spiked"],
        description: "Instagram-worthy pink perfection.",
        ingredients: [
            { name: "Rosé Wine", amount: "750 ml", baseMl: 750 },
            { name: "Strawberry Syrup", amount: "1/4 cup", baseMl: 59 },
            { name: "Lemon Juice", amount: "2 oz", baseMl: 59 }
        ],
        instructions: "Mix wine, syrup, and lemon juice. Pour into machine.",
        machineSetting: "Spiked Slush",
        tags: ["Alcoholic", "Wine", "Elegant"]
    },
    {
        id: 10,
        name: "Frozen Mojito",
        categories: ["Spiked"],
        description: "Minty, fresh, and refreshing.",
        ingredients: [
            { name: "White Rum", amount: "6 oz", baseMl: 177 },
            { name: "Lime Juice", amount: "3 oz", baseMl: 89 },
            { name: "Simple Syrup", amount: "3 oz", baseMl: 89 },
            { name: "Water", amount: "12 oz", baseMl: 355 },
            { name: "Fresh Mint", amount: "1/4 cup", baseMl: 15, note: "Muddle before adding" }
        ],
        instructions: "Muddle mint gently. Combine all ingredients. Pour into machine.",
        machineSetting: "Spiked Slush",
        tags: ["Alcoholic", "Mint", "Refreshing"]
    },
    {
        id: 11,
        name: "Dark 'n Stormy Slush",
        categories: ["Spiked"],
        description: "Rum and ginger in frozen form.",
        ingredients: [
            { name: "Dark Rum", amount: "6 oz", baseMl: 177 },
            { name: "Ginger Beer", amount: "20 oz", baseMl: 591 },
            { name: "Lime Juice", amount: "2 oz", baseMl: 59 }
        ],
        instructions: "Combine all ingredients. Pour into machine.",
        machineSetting: "Spiked Slush",
        tags: ["Alcoholic", "Spicy", "Bold"]
    },
    {
        id: 12,
        name: "Fuzzy Navel Slush",
        categories: ["Spiked"],
        description: "Peachy, sweet, and smooth.",
        ingredients: [
            { name: "Peach Schnapps", amount: "6 oz", baseMl: 177 },
            { name: "Orange Juice", amount: "16 oz", baseMl: 473 },
            { name: "Lemonade", amount: "8 oz", baseMl: 237 },
            { name: "Lemon-Lime Soda", amount: "For topping", baseMl: null }
        ],
        instructions: "Mix schnapps, OJ, and lemonade. Pour into machine. Top with soda when serving.",
        machineSetting: "Spiked Slush",
        tags: ["Alcoholic", "Fruity", "Sweet"]
    },
    {
        id: 13,
        name: "Whiskey Slush",
        categories: ["Spiked"],
        description: "A grown-up slushie with depth.",
        ingredients: [
            { name: "Whiskey", amount: "6 oz", baseMl: 177 },
            { name: "Orange Juice", amount: "8 oz", baseMl: 237 },
            { name: "Lemonade", amount: "8 oz", baseMl: 237 },
            { name: "Sweet Tea", amount: "8 oz", baseMl: 237 },
            { name: "Ginger Ale", amount: "For topping", baseMl: null }
        ],
        instructions: "Mix whiskey, OJ, lemonade, and tea. Pour into machine. Top with ginger ale when serving.",
        machineSetting: "Spiked Slush",
        tags: ["Alcoholic", "Complex", "Bold"]
    },
    {
        id: 14,
        name: "Frozen Sangria",
        categories: ["Spiked"],
        description: "Wine slushie with fruit flavors.",
        ingredients: [
            { name: "Red Wine", amount: "750 ml", baseMl: 750 },
            { name: "Orange Juice", amount: "1 cup", baseMl: 237 },
            { name: "Triple Sec", amount: "2 oz", baseMl: 59 },
            { name: "Simple Syrup", amount: "2 oz", baseMl: 59 }
        ],
        instructions: "Combine all ingredients. Pour into machine.",
        machineSetting: "Spiked Slush",
        tags: ["Alcoholic", "Wine", "Fruity"]
    },
    {
        id: 15,
        name: "Espresso Martini Slush",
        categories: ["Spiked", "Creamy"],
        description: "Caffeinated and spirited.",
        ingredients: [
            { name: "Vodka", amount: "6 oz", baseMl: 177 },
            { name: "Coffee Liqueur", amount: "3 oz", baseMl: 89 },
            { name: "Cold Brew Coffee", amount: "2 cups", baseMl: 473 },
            { name: "Simple Syrup", amount: "2 oz", baseMl: 59 }
        ],
        instructions: "Combine all ingredients. Pour into machine.",
        machineSetting: "Spiked Slush",
        tags: ["Alcoholic", "Coffee", "Energizing"]
    },

    // CREAMY SLUSHIES
    {
        id: 16,
        name: "Frozen Coffee Frappé",
        categories: ["Creamy", "Non-Alcoholic"],
        description: "Better than the coffee shop.",
        ingredients: [
            { name: "Cold Brew Coffee", amount: "3 cups", baseMl: 710 },
            { name: "Sweetened Condensed Milk", amount: "1/2 cup", baseMl: 118 },
            { name: "Milk", amount: "1 cup", baseMl: 237 }
        ],
        instructions: "Mix well. Adjust sweetness to taste before freezing.",
        machineSetting: "Frappé",
        tags: ["Caffeine", "Morning", "Sweet"]
    },
    {
        id: 17,
        name: "Caramel Frappuccino",
        categories: ["Creamy", "Non-Alcoholic"],
        description: "Starbucks-style frozen perfection.",
        ingredients: [
            { name: "Strong Coffee", amount: "12 oz", baseMl: 355, note: "Chilled" },
            { name: "Caramel Creamer", amount: "1/2 cup", baseMl: 118 },
            { name: "Milk", amount: "1/2 cup", baseMl: 118 }
        ],
        instructions: "Combine coffee, creamer, and milk. Pour into machine. Top with whipped cream and caramel.",
        machineSetting: "Frappé",
        tags: ["Caffeine", "Sweet", "Indulgent"]
    },
    {
        id: 18,
        name: "Frozen Hot Chocolate",
        categories: ["Creamy", "Non-Alcoholic"],
        description: "A chocolate lover's dream.",
        ingredients: [
            { name: "Whole Milk", amount: "2 cups", baseMl: 473 },
            { name: "Hot Cocoa Mix", amount: "1/2 cup", baseMl: 118 },
            { name: "Chocolate Syrup", amount: "1/4 cup", baseMl: 59 }
        ],
        instructions: "Mix milk, cocoa mix, and syrup until dissolved. Pour into machine. Top with whipped cream.",
        machineSetting: "Milkshake",
        tags: ["Chocolate", "Indulgent", "Kid Friendly"]
    },
    {
        id: 19,
        name: "Vanilla Milkshake Slush",
        categories: ["Creamy", "Non-Alcoholic"],
        description: "Classic creamy vanilla goodness.",
        ingredients: [
            { name: "Whole Milk", amount: "3 cups", baseMl: 710 },
            { name: "Vanilla Extract", amount: "1 tbsp", baseMl: 15 },
            { name: "Sugar", amount: "1/3 cup", baseMl: 79 },
            { name: "Heavy Cream", amount: "1/2 cup", baseMl: 118 }
        ],
        instructions: "Dissolve sugar in milk. Add vanilla and cream. Pour into machine.",
        machineSetting: "Milkshake",
        tags: ["Classic", "Creamy", "Kid Friendly"]
    },
    {
        id: 20,
        name: "Matcha Latte Frappé",
        categories: ["Creamy", "Non-Alcoholic", "Healthyish"],
        description: "Earthy green tea meets creamy indulgence.",
        ingredients: [
            { name: "Milk", amount: "2 cups", baseMl: 473, note: "Dairy or almond" },
            { name: "Matcha Powder", amount: "2 tsp", baseMl: 10 },
            { name: "Honey", amount: "3 tbsp", baseMl: 44 },
            { name: "Heavy Cream", amount: "1/4 cup", baseMl: 59 }
        ],
        instructions: "Whisk matcha with a little milk first. Add remaining ingredients. Pour into machine.",
        machineSetting: "Frappé",
        tags: ["Matcha", "Energizing", "Unique"]
    },
    {
        id: 21,
        name: "Peanut Butter Cup Shake",
        categories: ["Creamy", "Non-Alcoholic"],
        description: "Like a frozen Reese's.",
        ingredients: [
            { name: "Milk", amount: "2 cups", baseMl: 473 },
            { name: "Peanut Butter", amount: "1/3 cup", baseMl: 79 },
            { name: "Chocolate Syrup", amount: "1/4 cup", baseMl: 59 },
            { name: "Sugar", amount: "2 tbsp", baseMl: 30 }
        ],
        instructions: "Blend peanut butter with milk until smooth. Add chocolate and sugar. Pour into machine.",
        machineSetting: "Milkshake",
        tags: ["Chocolate", "Peanut Butter", "Indulgent"]
    },
    {
        id: 22,
        name: "White Russian Slush",
        categories: ["Creamy", "Spiked"],
        description: "The Dude's favorite, frozen.",
        ingredients: [
            { name: "Vodka", amount: "6 oz", baseMl: 177 },
            { name: "Coffee Liqueur", amount: "6 oz", baseMl: 177 },
            { name: "Milk", amount: "1 cup", baseMl: 237 },
            { name: "Heavy Cream", amount: "1 cup", baseMl: 237 }
        ],
        instructions: "Combine all ingredients. Pour into machine.",
        machineSetting: "Frozen Cocktail",
        tags: ["Alcoholic", "Coffee", "Creamy"]
    },

    // HEALTHYISH SLUSHIES
    {
        id: 23,
        name: "Watermelon Mint Slush",
        categories: ["Healthyish", "Non-Alcoholic", "Low Sugar"],
        description: "Hydrating and naturally sweet.",
        ingredients: [
            { name: "Watermelon Juice", amount: "3 cups", baseMl: 710, note: "Strained" },
            { name: "Lime Juice", amount: "2 oz", baseMl: 59 },
            { name: "Mint Syrup", amount: "2 tbsp", baseMl: 30 },
            { name: "Honey", amount: "2 tbsp", baseMl: 30, note: "Optional" }
        ],
        instructions: "Combine all ingredients. Pour into machine.",
        machineSetting: "Slush",
        tags: ["Healthy", "Refreshing", "Natural"]
    },
    {
        id: 24,
        name: "Strawberry Kiwi Slush",
        categories: ["Healthyish", "Non-Alcoholic"],
        description: "Vitamin C packed and delicious.",
        ingredients: [
            { name: "Strawberry Juice", amount: "2 cups", baseMl: 473 },
            { name: "Kiwi Syrup", amount: "1/2 cup", baseMl: 118 },
            { name: "Coconut Water", amount: "1 cup", baseMl: 237 },
            { name: "Lemon Juice", amount: "2 oz", baseMl: 59 }
        ],
        instructions: "Combine all ingredients. Pour into machine.",
        machineSetting: "Slush",
        tags: ["Healthy", "Fruity", "Natural"]
    },
    {
        id: 25,
        name: "Pineapple Ginger Slush",
        categories: ["Healthyish", "Non-Alcoholic"],
        description: "Tropical with a spicy kick.",
        ingredients: [
            { name: "Pineapple Juice", amount: "3 cups", baseMl: 710 },
            { name: "Ginger Juice", amount: "1 tbsp", baseMl: 15 },
            { name: "Lime Juice", amount: "2 oz", baseMl: 59 },
            { name: "Honey", amount: "2 tbsp", baseMl: 30 }
        ],
        instructions: "Combine all ingredients. Pour into machine.",
        machineSetting: "Slush",
        tags: ["Healthy", "Tropical", "Spicy"]
    },
    {
        id: 26,
        name: "Mango Passion Fruit",
        categories: ["Healthyish", "Non-Alcoholic"],
        description: "Exotic and vibrant.",
        ingredients: [
            { name: "Mango Juice", amount: "2 cups", baseMl: 473 },
            { name: "Passion Fruit Syrup", amount: "1/2 cup", baseMl: 118, note: "Seedless" },
            { name: "Orange Juice", amount: "1 cup", baseMl: 237 },
            { name: "Lime Juice", amount: "1 oz", baseMl: 30 }
        ],
        instructions: "Combine all ingredients. Pour into machine.",
        machineSetting: "Slush",
        tags: ["Healthy", "Tropical", "Exotic"]
    },
    {
        id: 28,
        name: "Blueberry Açai Slush",
        categories: ["Healthyish", "Non-Alcoholic"],
        description: "Antioxidant powerhouse.",
        ingredients: [
            { name: "Blueberry Juice", amount: "2 cups", baseMl: 473 },
            { name: "Açai Juice", amount: "1 cup", baseMl: 237 },
            { name: "Coconut Water", amount: "1 cup", baseMl: 237 },
            { name: "Honey", amount: "2 tbsp", baseMl: 30 }
        ],
        instructions: "Combine all ingredients. Pour into machine.",
        machineSetting: "Slush",
        tags: ["Healthy", "Superfood", "Berry"]
    },
    {
        id: 29,
        name: "Cucumber Lime Refresher",
        categories: ["Healthyish", "Non-Alcoholic", "Low Sugar"],
        description: "Spa day in a glass.",
        ingredients: [
            { name: "Cucumber Juice", amount: "2 cups", baseMl: 473 },
            { name: "Lime Juice", amount: "1/4 cup", baseMl: 59 },
            { name: "Coconut Water", amount: "2 cups", baseMl: 473 },
            { name: "Mint Syrup", amount: "2 tbsp", baseMl: 30 }
        ],
        instructions: "Combine all ingredients. Pour into machine.",
        machineSetting: "Slush",
        tags: ["Healthy", "Refreshing", "Light"]
    },
    {
        id: 30,
        name: "Orange Carrot Ginger",
        categories: ["Healthyish", "Non-Alcoholic"],
        description: "Immune-boosting sunshine.",
        ingredients: [
            { name: "Orange Juice", amount: "2 cups", baseMl: 473 },
            { name: "Carrot Juice", amount: "1 cup", baseMl: 237 },
            { name: "Ginger Juice", amount: "1 tbsp", baseMl: 15 },
            { name: "Honey", amount: "2 tbsp", baseMl: 30 }
        ],
        instructions: "Combine all ingredients. Pour into machine.",
        machineSetting: "Slush",
        tags: ["Healthy", "Immunity", "Energizing"]
    },

    // UNIQUE & SPECIALTY SLUSHIES
    {
        id: 31,
        name: "Butterbeer Slush",
        categories: ["Unique", "Creamy", "Non-Alcoholic"],
        description: "Straight from Hogsmeade.",
        ingredients: [
            { name: "Cream Soda", amount: "3 cups", baseMl: 710 },
            { name: "Butterscotch Syrup", amount: "1/2 cup", baseMl: 118 },
            { name: "Butter Extract", amount: "1/2 tsp", baseMl: 2.5, note: "Optional" }
        ],
        instructions: "Mix cream soda and butterscotch. Pour into machine. Top with whipped cream.",
        machineSetting: "Slush",
        tags: ["Unique", "Sweet", "Kid Friendly", "Fantasy"]
    },
    {
        id: 32,
        name: "Lavender Lemonade",
        categories: ["Unique", "Non-Alcoholic"],
        description: "Floral and sophisticated.",
        ingredients: [
            { name: "Lemonade", amount: "3 cups", baseMl: 710 },
            { name: "Lavender Syrup", amount: "1/4 cup", baseMl: 59 },
            { name: "Honey", amount: "2 tbsp", baseMl: 30 }
        ],
        instructions: "Mix lemonade, lavender syrup, and honey. Pour into machine.",
        machineSetting: "Slush",
        tags: ["Unique", "Floral", "Elegant"]
    },
    {
        id: 33,
        name: "Dragon Fruit Lychee",
        categories: ["Unique", "Non-Alcoholic"],
        description: "Visually stunning and exotic.",
        ingredients: [
            { name: "Dragon Fruit Syrup", amount: "1/2 cup", baseMl: 118 },
            { name: "Lychee Juice", amount: "2 cups", baseMl: 473 },
            { name: "Water", amount: "1 cup", baseMl: 237 },
            { name: "Rose Water", amount: "1 tsp", baseMl: 5 },
            { name: "Simple Syrup", amount: "2 oz", baseMl: 59 }
        ],
        instructions: "Combine all ingredients. Pour into machine.",
        machineSetting: "Slush",
        tags: ["Unique", "Exotic", "Floral", "Pink"]
    },
    {
        id: 34,
        name: "Thai Tea Slush",
        categories: ["Unique", "Creamy", "Non-Alcoholic"],
        description: "Creamy, spiced, and orange-hued.",
        ingredients: [
            { name: "Thai Tea", amount: "2 cups", baseMl: 473, note: "Strongly brewed and strained" },
            { name: "Sweetened Condensed Milk", amount: "1/2 cup", baseMl: 118 },
            { name: "Milk", amount: "1 cup", baseMl: 237 }
        ],
        instructions: "Mix tea, condensed milk, and milk. Pour into machine.",
        machineSetting: "Frappé",
        tags: ["Unique", "Creamy", "Spiced", "Tea"]
    },
    {
        id: 35,
        name: "Horchata Slush",
        categories: ["Unique", "Creamy", "Non-Alcoholic"],
        description: "Mexican rice drink meets frozen treat.",
        ingredients: [
            { name: "Horchata", amount: "3 cups", baseMl: 710, note: "Strained smooth" },
            { name: "Cinnamon Syrup", amount: "2 tbsp", baseMl: 30 },
            { name: "Vanilla Extract", amount: "1 tsp", baseMl: 5 }
        ],
        instructions: "Mix horchata with syrup and vanilla. Pour into machine.",
        machineSetting: "Milkshake",
        tags: ["Unique", "Creamy", "Cinnamon", "Cultural"]
    },
    {
        id: 36,
        name: "Hibiscus Berry",
        categories: ["Unique", "Healthyish", "Non-Alcoholic"],
        description: "Tart, floral, and ruby red.",
        ingredients: [
            { name: "Hibiscus Tea", amount: "2 cups", baseMl: 473, note: "Strained" },
            { name: "Mixed Berry Juice", amount: "1 cup", baseMl: 237 },
            { name: "Honey", amount: "3 tbsp", baseMl: 44 },
            { name: "Lemon Juice", amount: "1 oz", baseMl: 30 }
        ],
        instructions: "Combine all ingredients. Pour into machine.",
        machineSetting: "Slush",
        tags: ["Unique", "Tart", "Floral", "Healthy"]
    },
    {
        id: 37,
        name: "Dulce de Leche",
        categories: ["Unique", "Creamy", "Non-Alcoholic"],
        description: "Caramel heaven in frozen form.",
        ingredients: [
            { name: "Milk", amount: "2 cups", baseMl: 473 },
            { name: "Dulce de Leche Syrup", amount: "1/2 cup", baseMl: 118 },
            { name: "Heavy Cream", amount: "1/2 cup", baseMl: 118 },
            { name: "Vanilla Extract", amount: "1 tsp", baseMl: 5 }
        ],
        instructions: "Mix well with cream and vanilla. Chill then pour into machine.",
        machineSetting: "Milkshake",
        tags: ["Unique", "Caramel", "Creamy", "Indulgent"]
    },
    {
        id: 38,
        name: "Coconut Lime Mojito (Non-Alcoholic)",
        categories: ["Unique", "Non-Alcoholic"],
        description: "Tropical twist on the classic.",
        ingredients: [
            { name: "Coconut Water", amount: "2 cups", baseMl: 473 },
            { name: "Lime Juice", amount: "1/2 cup", baseMl: 118 },
            { name: "Simple Syrup", amount: "1/4 cup", baseMl: 59 },
            { name: "Mint Syrup", amount: "2 tbsp", baseMl: 30 },
            { name: "Coconut Cream", amount: "1/4 cup", baseMl: 59 }
        ],
        instructions: "Combine all ingredients. Pour into machine.",
        machineSetting: "Slush",
        tags: ["Unique", "Tropical", "Refreshing", "Mint"]
    },
    {
        id: 39,
        name: "Pumpkin Spice Latte Slush",
        categories: ["Unique", "Creamy", "Non-Alcoholic"],
        description: "Fall favorite, frozen.",
        ingredients: [
            { name: "Cold Brew Coffee", amount: "2 cups", baseMl: 473 },
            { name: "Pumpkin Spice Syrup", amount: "1/2 cup", baseMl: 118 },
            { name: "Milk", amount: "1 cup", baseMl: 237 },
            { name: "Maple Syrup", amount: "1/4 cup", baseMl: 59 }
        ],
        instructions: "Mix all ingredients well. Pour into machine.",
        machineSetting: "Frappé",
        tags: ["Unique", "Seasonal", "Coffee", "Spiced"]
    },
    {
        id: 40,
        name: "Frosted Lemonade",
        categories: ["Unique", "Creamy", "Non-Alcoholic"],
        description: "Chick-fil-A inspired creamy citrus.",
        ingredients: [
            { name: "Lemonade", amount: "2 cups", baseMl: 473 },
            { name: "Sweetened Condensed Milk", amount: "1/2 cup", baseMl: 118 },
            { name: "Heavy Cream", amount: "1/2 cup", baseMl: 118 },
            { name: "Vanilla Extract", amount: "1 tsp", baseMl: 5 }
        ],
        instructions: "Combine all ingredients. Pour into machine.",
        machineSetting: "Milkshake",
        tags: ["Unique", "Creamy", "Citrus", "Sweet"]
    },
    {
        id: 41,
        name: "Peach Bellini Slush",
        categories: ["Unique", "Spiked"],
        description: "Brunch cocktail meets frozen delight.",
        ingredients: [
            { name: "Peach Nectar", amount: "2 cups", baseMl: 473 },
            { name: "Prosecco", amount: "1 cup", baseMl: 237, note: "Or ginger ale for non-alcoholic" },
            { name: "Lemon Juice", amount: "1 oz", baseMl: 30 },
            { name: "Simple Syrup", amount: "2 oz", baseMl: 59 }
        ],
        instructions: "Mix peach nectar, prosecco (or ginger ale), lemon juice, and syrup. Pour into machine.",
        machineSetting: "Spiked Slush",
        tags: ["Unique", "Sophisticated", "Peachy", "Brunch"]
    },
    {
        id: 42,
        name: "Tamarind Chili",
        categories: ["Unique", "Non-Alcoholic"],
        description: "Sweet, sour, spicy adventure.",
        ingredients: [
            { name: "Tamarind Syrup", amount: "1/2 cup", baseMl: 118 },
            { name: "Water", amount: "3 cups", baseMl: 710 },
            { name: "Lime Juice", amount: "2 oz", baseMl: 59 },
            { name: "Chili Powder", amount: "pinch", baseMl: null, note: "Dissolved completely" }
        ],
        instructions: "Mix syrup, water, and lime. Ensure chili powder is fully dissolved. Pour into machine.",
        machineSetting: "Slush",
        tags: ["Unique", "Spicy", "Exotic", "Bold"]
    },

    // SAVORY SLUSHIES
    {
        id: 43,
        name: "Frozen Bloody Mary",
        categories: ["Savory", "Spiked", "Low Sugar"],
        description: "The ultimate brunch cocktail, frozen.",
        ingredients: [
            { name: "Tomato Juice", amount: "3 cups", baseMl: 710, note: "Strained smooth" },
            { name: "Vodka", amount: "6 oz", baseMl: 177 },
            { name: "Lemon Juice", amount: "2 oz", baseMl: 59 },
            { name: "Worcestershire Sauce", amount: "1 tbsp", baseMl: 15 },
            { name: "Hot Sauce", amount: "1 tsp", baseMl: 5 }
        ],
        instructions: "Mix all ingredients well. Pour into machine. Rim glass with celery salt.",
        machineSetting: "Spiked Slush",
        tags: ["Savory", "Alcoholic", "Spicy", "Brunch"]
    },
    {
        id: 44,
        name: "Gazpacho Slush",
        categories: ["Savory", "Healthyish", "Non-Alcoholic", "Low Sugar"],
        description: "Chilled Spanish soup transformed.",
        ingredients: [
            { name: "Tomato Juice", amount: "2 cups", baseMl: 473 },
            { name: "Cucumber Juice", amount: "1 cup", baseMl: 237 },
            { name: "Red Pepper Juice", amount: "1/2 cup", baseMl: 118 },
            { name: "Olive Oil", amount: "2 tbsp", baseMl: 30 },
            { name: "Sherry Vinegar", amount: "1 tbsp", baseMl: 15 }
        ],
        instructions: "Mix all juices, oil, and vinegar. Pour into machine.",
        machineSetting: "Slush",
        tags: ["Savory", "Healthy", "Vegetable", "Unique"]
    },
    {
        id: 45,
        name: "Pickle Juice Slush",
        categories: ["Savory", "Non-Alcoholic", "Low Sugar"],
        description: "Tangy, salty, and surprisingly refreshing.",
        ingredients: [
            { name: "Pickle Brine", amount: "2 cups", baseMl: 473, note: "Strained" },
            { name: "Water", amount: "1 cup", baseMl: 237 },
            { name: "Sugar", amount: "2 tbsp", baseMl: 30, note: "To balance acidity" },
            { name: "Lime Juice", amount: "1 oz", baseMl: 30 }
        ],
        instructions: "Mix brine, water, sugar, and lime. Pour into machine.",
        machineSetting: "Slush",
        tags: ["Savory", "Salty", "Unique", "Bold"]
    },
    {
        id: 46,
        name: "Spicy Mango Chamoy",
        categories: ["Savory", "Unique", "Non-Alcoholic"],
        description: "Sweet, salty, spicy, and tart.",
        ingredients: [
            { name: "Mango Nectar", amount: "3 cups", baseMl: 710 },
            { name: "Chamoy Sauce", amount: "1/2 cup", baseMl: 118 },
            { name: "Lime Juice", amount: "2 oz", baseMl: 59 }
        ],
        instructions: "Mix mango and lime. Pour into machine. Swirl in chamoy when serving.",
        machineSetting: "Slush",
        tags: ["Savory", "Spicy", "Sweet", "Mexican"]
    },
    {
        id: 47,
        name: "Michelada Slush",
        categories: ["Savory", "Spiked"],
        description: "Beer cocktail with a kick.",
        ingredients: [
            { name: "Light Beer", amount: "24 oz", baseMl: 710 },
            { name: "Clamato Juice", amount: "1 cup", baseMl: 237 },
            { name: "Lime Juice", amount: "1/4 cup", baseMl: 59 },
            { name: "Hot Sauce", amount: "1 tbsp", baseMl: 15 },
            { name: "Soy Sauce", amount: "1 tsp", baseMl: 5 }
        ],
        instructions: "Gently mix beer with other ingredients (watch the foam!). Pour into machine.",
        machineSetting: "Spiked Slush",
        tags: ["Savory", "Alcoholic", "Beer", "Spicy"]
    }
];
