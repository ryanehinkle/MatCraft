import { useState } from "react";
import items from "./data/items.json";
import recipes from "./data/recipes.json";
import BreakdownTree from "./components/BreakdownTree";
import UploadCsv from "./components/UploadCSV";
import HelpButton from "./components/HelpButton";
import type { BreakdownNode } from "./types/BreakdownNode";

type CsvItem = {
  name: string;
  quantity: number;
};

type BreakdownResult = {
  sourceName: string;
  sourceQuantity: number;
  tree: BreakdownNode | null;
};

function getItemIdFromName(name: string): string | null {
  for (const [id, item] of Object.entries(items)) {
    if (item.name === name) {
      return id;
    }
  }
  return null;
}

function buildBreakdownTree(itemId: string, quantity: number): BreakdownNode {
  const itemData = items[itemId as keyof typeof items];

  if (!itemData) {
    return { item: itemId, quantity, children: [] };
  }

  if (itemData.isRaw) {
    return { item: itemId, quantity, children: [] };
  }

  const recipe = recipes[itemId as keyof typeof recipes];

  if (!recipe) {
    return { item: itemId, quantity, children: [] };
  }

  const multiplier = quantity / recipe.outputQuantity;

  const children = recipe.ingredients.map((ingredient) =>
    buildBreakdownTree(ingredient.item, ingredient.quantity * multiplier)
  );

  return {
    item: itemId,
    quantity,
    children,
  };
}

function App() {
  const [csvText, setCsvText] = useState("");
  const [parsedItems, setParsedItems] = useState<CsvItem[]>([]);
  const [breakdownResults, setBreakdownResults] = useState<BreakdownResult[]>([]);
  const [roundCraftingItems, setRoundCraftingItems] = useState(false);
  const [simplifyLargeQuantities, setSimplifyLargeQuantities] = useState(false);

  function handleFileSelect(file: File) {
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result;

      if (typeof text === "string") {
        setCsvText(text);

        const lines = text
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0);

        const parsed: CsvItem[] = lines.map((line) => {
          const parts = line.split(",").map((part) => part.trim());

          return {
            name: parts[0],
            quantity: Number(parts[1]),
          };
        });

        parsed.sort((a, b) => b.quantity - a.quantity); // Sort highest totals to top

        setParsedItems(parsed);

        const results: BreakdownResult[] = parsed.map((item) => {
          const itemId = getItemIdFromName(item.name);

          if (!itemId) {
            console.error("Item not found:", item.name);
            return {
              sourceName: item.name,
              sourceQuantity: item.quantity,
              tree: null,
            };
          }

          return {
            sourceName: item.name,
            sourceQuantity: item.quantity,
            tree: buildBreakdownTree(itemId, item.quantity),
          };
        });

        setBreakdownResults(results);
      }
    };

    reader.readAsText(file);
  }

  return (
    <>
      <HelpButton />

      <div
        className={
          breakdownResults.length === 0
            ? "app-container centered"
            : "app-container"
        }
      >
        <video
          src="/logo.mp4"
          autoPlay
          muted
          playsInline
          className="logo-video"
        />

        <div className="upload-container">
          <UploadCsv onFileSelect={handleFileSelect} />
        </div>

        {breakdownResults.length > 0 && (
          <>
            <div className="top-options">
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={roundCraftingItems}
                  onChange={(e) => setRoundCraftingItems(e.target.checked)}
                />
                Round crafting items*
              </label>

              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={simplifyLargeQuantities}
                  onChange={(e) => setSimplifyLargeQuantities(e.target.checked)}
                />
                Simplify large quantities
              </label>
            </div>

            <div className="results-container">
              {breakdownResults.map((result, index) => (
                <div key={index} className="result-card">
                  {result.tree ? (
                    <BreakdownTree
                      tree={result.tree}
                      roundCraftingItems={roundCraftingItems}
                      simplifyLargeQuantities={simplifyLargeQuantities}
                    />
                  ) : (
                    <div>No breakdown available</div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <footer className="footer">
        <p>[ Designed by Ryan Hinkle ]</p>
      </footer>
    </>
  );
}

export default App;