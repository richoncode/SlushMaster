# SlushMaster5000 Specification & Research

## Research Findings: Personal Slush Machine Guidelines

### 1. Sugar Content (Brix)
*   **Critical Rule**: Sugar is the anti-freeze agent. Too little sugar = solid ice block (bad). Too much sugar = won't freeze (runny).
*   **Ideal Range**: 13% - 15% Brix (Sugar content).
*   **Minimum**: 4% sugar is the absolute minimum for the Ninja Slushi to operate safely.
*   **Maximum**: Above 15-18% may result in a soft/wet slush.
*   **Sugar Substitutes**: Allulose is recommended for sugar-free options as it mimics sugar's freezing properties better than Erythritol or Stevia.

### 2. Alcohol Content (ABV)
*   **Freezing Impact**: Alcohol lowers freezing point significantly.
*   **Ideal Range**: 2.8% - 8% ABV for best texture.
*   **Maximum**: ~16% ABV is the upper limit for most machines before it simply won't freeze.
*   **Ratio**: A common safe ratio is 1 part spirit (40% ABV) to 5 parts mixer, or ~4oz spirit per 24oz total volume.

### 3. Machine Constraints (Ninja Slushi)
*   **Capacity**: Min 16oz (473ml) - Max 64oz (1.9L).
*   **Prohibited Ingredients**: No ice, no frozen fruit, no pulp (clogs the auger).
*   **Presets**: Slush, Spiked Slush, Frappé, Milkshake, Frozen Juice.

---

## Application Specification

### App Name
**SlushMaster5000**

### Core Value Proposition
A companion app for slushie machine owners to find safe recipes and calculate if their custom mixes will slush perfectly without breaking their machine.

### Key Features

#### 1. The "Slushometer" (Calculator)
*   **Input**:
    *   Liquid Volume (oz/ml)
    *   Sugar Amount (g/cups) or Syrup Type
    *   Alcohol Volume & ABV
*   **Output**:
    *   **Brix Score**: Estimated sugar percentage.
    *   **ABV Score**: Estimated alcohol percentage.
    *   **Verdict**: "Perfect Slush", "Ice Block Risk" (Needs more sugar/alcohol), "Wont Freeze" (Too much alcohol/sugar).
    *   **Fix It**: Suggestions (e.g., "Add 2oz water" or "Add 1 tbsp sugar").

#### 2. Recipe Database
*   **Categories**:
    *   **Classics**: Cola Slush, Blue Raspberry.
    *   **Spiked**: Frozen Margarita, Piña Colada, Frosé.
    *   **Creamy**: Coffee Frappé, Chocolate Milkshake.
    *   **Healthyish**: Fruit Juice Slushes (pulp-free).
*   **Format**: Ingredients list, "Slush Safe" badge, Machine Setting recommendation.

#### 3. My Slushies
*   Save custom recipes.
*   Notes on texture/results (e.g., "Froze in 20 mins").

#### 4. Ingredient Filter (Pantry Mode)
*   **Input**: User enters ingredients they have (e.g., "Cola", "Rum").
*   **Logic**: Show recipes that contain *at least one* of the entered ingredients (or maybe *all*? "Might be able to make" suggests broad matching, but "What can I make with X" usually implies X is the main ingredient).
*   **Refined Logic**:
    *   Allow multiple search terms.
    *   Filter recipes where *any* of the recipe's ingredients match *any* of the user's terms.
    *   **Synonym Matching**: Map common terms (e.g., "Coke" -> "Cola", "Soda" -> "Pop").
    *   Highlight matching recipes.

### User Flow
1.  **Home**: Quick access to "Slushometer" and "Trending Recipes".
2.  **Calculator**: Simple form -> Result Gauge.
3.  **Recipe Detail**: Ingredients -> "Scale Recipe" (16oz, 32oz, 64oz).
4.  **Recipe List**: Search bar at top -> "Filter by Ingredient".

### Technical Considerations
*   **Platform**: Web App (PWA capable).
*   **Tech Stack**:
    *   Frontend: React (Vite) + Tailwind CSS.
    *   State: LocalStorage for "My Slushies" (MVP).
    *   Logic: Javascript math for Brix/ABV calculations.
