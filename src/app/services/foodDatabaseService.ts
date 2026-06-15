// ============================================================
// Fit Tracker PRO — Food Database Service
// NEW FEATURE: Open Food Facts barcode lookup (free, 3M+ products)
// Falls back to local COMMON_FOODS on network failure.
// ============================================================

export interface FoodDBItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sodium?: number;
  servingSize?: string;
  barcode?: string;
}

// ─── Local fallback food database ────────────────────────────────────────────
export const COMMON_FOODS: FoodDBItem[] = [
  { name: 'Banana',                  calories: 89,  protein: 1.1, carbs: 23,  fat: 0.3, fiber: 2.6 },
  { name: 'Egg (boiled)',            calories: 68,  protein: 6,   carbs: 0.6, fat: 4.8 },
  { name: 'Chicken Breast (100g)',   calories: 165, protein: 31,  carbs: 0,   fat: 3.6 },
  { name: 'Brown Rice (100g)',       calories: 216, protein: 4.5, carbs: 45,  fat: 1.6, fiber: 3.5 },
  { name: 'Oatmeal (1 cup)',         calories: 154, protein: 5,   carbs: 27,  fat: 2.6, fiber: 4 },
  { name: 'Greek Yogurt (150g)',     calories: 100, protein: 17,  carbs: 6,   fat: 0.7 },
  { name: 'Almonds (30g)',           calories: 173, protein: 6,   carbs: 6,   fat: 15,  fiber: 3.3 },
  { name: 'Salmon (100g)',           calories: 208, protein: 20,  carbs: 0,   fat: 13 },
  { name: 'Avocado (half)',          calories: 120, protein: 1.5, carbs: 6,   fat: 11,  fiber: 4 },
  { name: 'Whole Milk (250ml)',      calories: 149, protein: 8,   carbs: 12,  fat: 8 },
  { name: 'Sweet Potato (100g)',     calories: 86,  protein: 1.6, carbs: 20,  fat: 0.1, fiber: 3 },
  { name: 'Broccoli (100g)',         calories: 34,  protein: 2.8, carbs: 7,   fat: 0.4, fiber: 2.6 },
  { name: 'Protein Shake',           calories: 120, protein: 25,  carbs: 5,   fat: 2 },
  { name: 'Orange',                  calories: 62,  protein: 1.2, carbs: 15,  fat: 0.2, fiber: 3.1 },
  { name: 'White Rice (100g)',       calories: 130, protein: 2.7, carbs: 28,  fat: 0.3 },
  { name: 'Peanut Butter (2 tbsp)', calories: 188, protein: 8,   carbs: 6,   fat: 16 },
  { name: 'Whole Wheat Bread',       calories: 69,  protein: 3.5, carbs: 12,  fat: 1,   fiber: 1.9 },
  { name: 'Tuna (100g)',             calories: 116, protein: 26,  carbs: 0,   fat: 1 },
  { name: 'Apple',                   calories: 95,  protein: 0.5, carbs: 25,  fat: 0.3, fiber: 4.4 },
  { name: 'Cottage Cheese (100g)',   calories: 98,  protein: 11,  carbs: 3.4, fat: 4.3 },
  { name: 'Lentils cooked (100g)',   calories: 116, protein: 9,   carbs: 20,  fat: 0.4, fiber: 7.9 },
  { name: 'Spinach (100g)',          calories: 23,  protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2 },
  { name: 'Blueberries (100g)',      calories: 57,  protein: 0.7, carbs: 14,  fat: 0.3, fiber: 2.4 },
  { name: 'Cheddar Cheese (30g)',    calories: 120, protein: 7.4, carbs: 0.2, fat: 9.9 },
  { name: 'Ground Beef (100g)',      calories: 215, protein: 26,  carbs: 0,   fat: 12 },
  { name: 'Quinoa cooked (100g)',    calories: 120, protein: 4.4, carbs: 22,  fat: 1.9, fiber: 2.8 },
  { name: 'Olive Oil (1 tbsp)',      calories: 119, protein: 0,   carbs: 0,   fat: 13.5 },
  { name: 'Whole Egg',               calories: 78,  protein: 6,   carbs: 0.6, fat: 5 },
  { name: 'Coffee (black)',          calories: 2,   protein: 0.3, carbs: 0,   fat: 0 },
  { name: 'Green Tea',               calories: 2,   protein: 0,   carbs: 0.5, fat: 0 },
];

// ─── Open Food Facts barcode lookup ──────────────────────────────────────────
export async function lookupBarcode(barcode: string): Promise<FoodDBItem | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;

    const p = data.product;
    const n = p.nutriments || {};
    const name = p.product_name_en || p.product_name || 'Unknown Product';

    return {
      name,
      calories: Math.round(n['energy-kcal_100g'] || n['energy-kcal'] || 0),
      protein:  Math.round((n.proteins_100g   || 0) * 10) / 10,
      carbs:    Math.round((n.carbohydrates_100g || 0) * 10) / 10,
      fat:      Math.round((n.fat_100g          || 0) * 10) / 10,
      fiber:    Math.round((n.fiber_100g         || 0) * 10) / 10,
      sodium:   Math.round((n.sodium_100g        || 0) * 1000) / 10, // mg
      servingSize: p.serving_size || '100g',
      barcode,
    };
  } catch {
    return null;
  }
}

// ─── Text search in local DB ──────────────────────────────────────────────────
export function searchFoods(query: string): FoodDBItem[] {
  if (!query.trim()) return COMMON_FOODS.slice(0, 10);
  const q = query.toLowerCase();
  return COMMON_FOODS.filter(f => f.name.toLowerCase().includes(q)).slice(0, 12);
}
