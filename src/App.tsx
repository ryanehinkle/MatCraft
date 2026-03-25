import { useMemo, useState } from "react";
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
  id: string;
  sourceName: string;
  sourceQuantity: number;
  tree: BreakdownNode | null;
};

type RawMaterialTotal = {
  itemId: string;
  quantity: number;
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

function formatBaseQuantity(
  quantity: number,
  roundCraftingItems: boolean
): number {
  if (roundCraftingItems && !Number.isInteger(quantity)) {
    return Math.ceil(quantity);
  }
  return quantity;
}

function formatSimplifiedQuantity(quantity: number, stackSize: number): string {
  if (stackSize === 1) {
    return `${quantity}`;
  }

  if (quantity <= stackSize) {
    return `${quantity}`;
  }

  const shulkerCapacity = stackSize * 27;
  const shulkers = Math.floor(quantity / shulkerCapacity);
  const afterShulkers = quantity % shulkerCapacity;
  const stacks = Math.floor(afterShulkers / stackSize);
  const remainder = afterShulkers % stackSize;

  const parts: string[] = [];

  if (shulkers > 0) {
    parts.push(`${shulkers} box${shulkers !== 1 ? "es" : ""}`);
  }

  if (stacks > 0) {
    parts.push(`${stacks} stack${stacks !== 1 ? "s" : ""}`);
  }

  if (remainder > 0) {
    parts.push(`${remainder}`);
  }

  return `${quantity}\n(${parts.join(" + ")})`;
}

function formatQuantity(
  quantity: number,
  roundCraftingItems: boolean,
  simplifyLargeQuantities: boolean,
  stackSize: number
): string {
  const baseQuantity = formatBaseQuantity(quantity, roundCraftingItems);
  const roundedMark =
    roundCraftingItems && !Number.isInteger(quantity) ? "*" : "";

  if (!simplifyLargeQuantities) {
    return `${baseQuantity}${roundedMark}`;
  }

  if (stackSize === 1) {
    return `${baseQuantity}${roundedMark}`;
  }

  return `${formatSimplifiedQuantity(baseQuantity, stackSize)}${roundedMark}`;
}

function collectRawMaterials(
  node: BreakdownNode,
  totals: Record<string, number>
): void {
  const itemData = items[node.item as keyof typeof items];

  if (!itemData || itemData.isRaw || node.children.length === 0) {
    totals[node.item] = (totals[node.item] ?? 0) + node.quantity;
    return;
  }

  for (const child of node.children) {
    collectRawMaterials(child, totals);
  }
}

function App() {
  const [breakdownResults, setBreakdownResults] = useState<BreakdownResult[]>(
    []
  );
  const [roundCraftingItems, setRoundCraftingItems] = useState(false);
  const [simplifyLargeQuantities, setSimplifyLargeQuantities] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [animatingOutId, setAnimatingOutId] = useState<string | null>(null);
  const [isRawSummaryOpen, setIsRawSummaryOpen] = useState(false);

  function handleFileSelect(file: File) {
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result;

      if (typeof text === "string") {
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

        parsed.sort((a, b) => b.quantity - a.quantity);

        const results: BreakdownResult[] = parsed.map((item, index) => {
          const itemId = getItemIdFromName(item.name);

          if (!itemId) {
            return {
              id: `${item.name}-${index}`,
              sourceName: item.name,
              sourceQuantity: item.quantity,
              tree: null,
            };
          }

          return {
            id: `${item.name}-${index}`,
            sourceName: item.name,
            sourceQuantity: item.quantity,
            tree: buildBreakdownTree(itemId, item.quantity),
          };
        });

        setCheckedItems({});
        setAnimatingOutId(null);
        setIsRawSummaryOpen(false);
        setBreakdownResults(results);
      }
    };

    reader.readAsText(file);
  }

  function handleItemCheck(resultId: string, checked: boolean) {
    if (checked) {
      setAnimatingOutId(resultId);

      window.setTimeout(() => {
        setCheckedItems((prev) => ({
          ...prev,
          [resultId]: true,
        }));
        setAnimatingOutId(null);
      }, 220);

      return;
    }

    setCheckedItems((prev) => ({
      ...prev,
      [resultId]: false,
    }));
  }

  const rawMaterialTotals = useMemo(() => {
    const totals: Record<string, number> = {};

    for (const result of breakdownResults) {
      if (result.tree) {
        collectRawMaterials(result.tree, totals);
      }
    }

    const rawItems: RawMaterialTotal[] = Object.entries(totals).map(
      ([itemId, quantity]) => ({
        itemId,
        quantity,
      })
    );

    rawItems.sort((a, b) => {
      const aDisplay = formatBaseQuantity(a.quantity, roundCraftingItems);
      const bDisplay = formatBaseQuantity(b.quantity, roundCraftingItems);
      return bDisplay - aDisplay;
    });

    return rawItems;
  }, [breakdownResults, roundCraftingItems]);

  const displayedResults = useMemo(() => {
    return [...breakdownResults].sort((a, b) => {
      const aChecked = checkedItems[a.id] ? 1 : 0;
      const bChecked = checkedItems[b.id] ? 1 : 0;

      if (aChecked !== bChecked) {
        return aChecked - bChecked;
      }

      return b.sourceQuantity - a.sourceQuantity;
    });
  }, [breakdownResults, checkedItems]);

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

            <div
              className={`raw-summary-dropdown ${
                isRawSummaryOpen ? "raw-summary-open" : ""
              }`}
            >
              <button
                type="button"
                className="raw-summary-toggle"
                onClick={() => setIsRawSummaryOpen((prev) => !prev)}
              >
                Total Raw Materials
              </button>

              <div className="raw-summary-list">
                <div className="raw-summary-list-inner">
                  <div className="raw-summary-list-content">
                    {rawMaterialTotals.map(({ itemId, quantity }) => {
                      const itemData = items[itemId as keyof typeof items];
                      const itemName = itemData?.name ?? itemId;
                      const stackSize = itemData?.stackSize ?? 64;

                      return (
                        <div key={itemId} className="raw-summary-item">
                          <div className="raw-summary-item-left">
                          <img
                            src={`/icons/${itemId}.png`}
                            alt={itemName}
                            className="tree-icon"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                            <span className="raw-summary-name">{itemName}</span>
                          </div>

                          <span className="raw-summary-quantity">
                            {formatQuantity(
                              quantity,
                              roundCraftingItems,
                              simplifyLargeQuantities,
                              stackSize
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="results-container">
              {displayedResults.map((result) => {
                const isChecked = !!checkedItems[result.id];
                const isAnimatingOut = animatingOutId === result.id;

                return (
                  <div
                    key={result.id}
                    className={`result-card ${
                      isChecked ? "result-card-complete" : ""
                    } ${isAnimatingOut ? "result-card-animating-out" : ""}`}
                  >
                    <label className="result-check-overlay">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) =>
                          handleItemCheck(result.id, e.target.checked)
                        }
                      />
                    </label>

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
                );
              })}
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