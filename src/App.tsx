import { useMemo, useState } from "react";
import items from "./data/items.json";
import recipes from "./data/recipes.json";
import BreakdownTree from "./components/BreakdownTree";
import UploadCsv from "./components/UploadCSV";
import HelpButton from "./components/HelpButton";
import type { BreakdownNode } from "./types/BreakdownNode";
import ContactButton from "./components/ContactButton";

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

type RecipeIngredient = {
  item: string;
  quantity: number;
};

type RecipeOption = {
  outputQuantity: number;
  ingredients: RecipeIngredient[];
};

type RecipeEntry = RecipeOption & {
  alternatives?: RecipeOption[];
};

function getItemIdFromName(name: string): string | null {
  for (const [id, item] of Object.entries(items)) {
    if (item.name === name) {
      return id;
    }
  }
  return null;
}

function getIconPath(itemId: string): string {
  let iconItemId = itemId;

  // strip prefixes that don't affect visuals
  if (iconItemId.startsWith("waxed_")) {
    iconItemId = iconItemId.replace(/^waxed_/, "");
  }

  if (iconItemId.startsWith("infested_")) {
    iconItemId = iconItemId.replace(/^infested_/, "");
  }

  return `/icons/${iconItemId}.png`;
}

function getRecipeOptions(itemId: string): RecipeOption[] {
  const recipeEntry = recipes[itemId as keyof typeof recipes] as
    | RecipeEntry
    | undefined;

  if (!recipeEntry) {
    return [];
  }

  return [
    {
      outputQuantity: recipeEntry.outputQuantity,
      ingredients: recipeEntry.ingredients,
    },
    ...(recipeEntry.alternatives ?? []),
  ];
}

function buildBreakdownTree(
  itemId: string,
  quantity: number,
  selectedRecipeIndexes: Record<string, number>
): BreakdownNode {
  const itemData = items[itemId as keyof typeof items];

  if (!itemData) {
    return { item: itemId, quantity, children: [] };
  }

  if (itemData.isRaw) {
    return { item: itemId, quantity, children: [] };
  }

  const recipeOptions = getRecipeOptions(itemId);

  if (recipeOptions.length === 0) {
    return { item: itemId, quantity, children: [] };
  }

  const selectedIndex = selectedRecipeIndexes[itemId] ?? 0;
  const recipe = recipeOptions[selectedIndex] ?? recipeOptions[0];

  if (!recipe || recipe.ingredients.length === 0) {
    return { item: itemId, quantity, children: [] };
  }

  const multiplier = quantity / recipe.outputQuantity;

  const children = recipe.ingredients.map((ingredient) =>
    buildBreakdownTree(
      ingredient.item,
      ingredient.quantity * multiplier,
      selectedRecipeIndexes
    )
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
    return `${Number(baseQuantity.toFixed(2))}${roundedMark}`;
  }

  if (stackSize === 1) {
    return `${Number(baseQuantity.toFixed(2))}${roundedMark}`;
  }

  return `${formatSimplifiedQuantity(baseQuantity, stackSize)}${roundedMark}`;
}

function collectRawMaterials(
  node: BreakdownNode,
  totals: Record<string, number>,
  manuallyRawItems: Record<string, boolean>
): void {
  const itemData = items[node.item as keyof typeof items];
  const isManuallyRaw = !!manuallyRawItems[node.item];

  if (
    !itemData ||
    itemData.isRaw ||
    isManuallyRaw ||
    node.children.length === 0
  ) {
    totals[node.item] = (totals[node.item] ?? 0) + node.quantity;
    return;
  }

  for (const child of node.children) {
    collectRawMaterials(child, totals, manuallyRawItems);
  }
}

function App() {
  const [parsedItems, setParsedItems] = useState<CsvItem[]>([]);
  const [roundCraftingItems, setRoundCraftingItems] = useState(true);
  const [simplifyLargeQuantities, setSimplifyLargeQuantities] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [animatingOutId, setAnimatingOutId] = useState<string | null>(null);
  const [isRawSummaryOpen, setIsRawSummaryOpen] = useState(false);
  const [checkedRawItems, setCheckedRawItems] = useState<
    Record<string, boolean>
  >({});
  const [animatingRawOutId, setAnimatingRawOutId] = useState<string | null>(
    null
  );
  const [manuallyRawItems, setManuallyRawItems] = useState<
    Record<string, boolean>
  >({});
  const [selectedRecipeIndexes, setSelectedRecipeIndexes] = useState<
    Record<string, number>
  >({});

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

        setCheckedRawItems({});
        setAnimatingRawOutId(null);
        setCheckedItems({});
        setAnimatingOutId(null);
        setIsRawSummaryOpen(false);
        setManuallyRawItems({});
        setSelectedRecipeIndexes({});
        setParsedItems(parsed);
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

  function handleRawItemCheck(itemId: string, checked: boolean) {
    if (checked) {
      setAnimatingRawOutId(itemId);

      window.setTimeout(() => {
        setCheckedRawItems((prev) => ({
          ...prev,
          [itemId]: true,
        }));
        setAnimatingRawOutId(null);
      }, 220);

      return;
    }

    setCheckedRawItems((prev) => ({
      ...prev,
      [itemId]: false,
    }));
  }

  function handleToggleManualRaw(itemId: string) {
    setManuallyRawItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  }

  function handleCycleRecipe(itemId: string, direction: "prev" | "next") {
    const recipeOptions = getRecipeOptions(itemId);

    if (recipeOptions.length <= 1) {
      return;
    }

    setSelectedRecipeIndexes((prev) => {
      const currentIndex = prev[itemId] ?? 0;

      const nextIndex =
        direction === "next"
          ? (currentIndex + 1) % recipeOptions.length
          : (currentIndex - 1 + recipeOptions.length) % recipeOptions.length;

      return {
        ...prev,
        [itemId]: nextIndex,
      };
    });
  }

  const breakdownResults = useMemo<BreakdownResult[]>(() => {
    return parsedItems.map((item, index) => {
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
        tree: buildBreakdownTree(
          itemId,
          item.quantity,
          selectedRecipeIndexes
        ),
      };
    });
  }, [parsedItems, selectedRecipeIndexes]);

  const rawMaterialTotals = useMemo(() => {
    const totals: Record<string, number> = {};

    for (const result of breakdownResults) {
      if (result.tree) {
        collectRawMaterials(result.tree, totals, manuallyRawItems);
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
  }, [breakdownResults, roundCraftingItems, manuallyRawItems]);

  const displayedRawMaterialTotals = useMemo(() => {
    return [...rawMaterialTotals].sort((a, b) => {
      const aChecked = checkedRawItems[a.itemId] ? 1 : 0;
      const bChecked = checkedRawItems[b.itemId] ? 1 : 0;

      if (aChecked !== bChecked) {
        return aChecked - bChecked;
      }

      const aDisplay = formatBaseQuantity(a.quantity, roundCraftingItems);
      const bDisplay = formatBaseQuantity(b.quantity, roundCraftingItems);
      return bDisplay - aDisplay;
    });
  }, [rawMaterialTotals, checkedRawItems, roundCraftingItems]);

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
      <ContactButton />

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
                    {displayedRawMaterialTotals.map(({ itemId, quantity }) => {
                      const itemData = items[itemId as keyof typeof items];
                      const itemName = itemData?.name ?? itemId;
                      const stackSize = itemData?.stackSize ?? 64;
                      const isChecked = !!checkedRawItems[itemId];
                      const isAnimatingOut = animatingRawOutId === itemId;

                      return (
                        <div
                          key={itemId}
                          className={`raw-summary-item ${
                            isChecked ? "raw-summary-item-complete" : ""
                          } ${
                            isAnimatingOut
                              ? "raw-summary-item-animating-out"
                              : ""
                          }`}
                        >
                          <div className="raw-summary-item-left">
                            <label className="raw-summary-check-inline">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) =>
                                  handleRawItemCheck(itemId, e.target.checked)
                                }
                              />
                            </label>

                            <img
                              src={getIconPath(itemId)}
                              alt={itemName}
                              className="tree-icon"
                              onError={(e) => {
                                console.warn(`Missing icon: ${getIconPath(itemId)}`);

                                const img = e.currentTarget as HTMLImageElement;
                                img.style.display = "none";
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
                        manuallyRawItems={manuallyRawItems}
                        onToggleManualRaw={handleToggleManualRaw}
                        selectedRecipeIndexes={selectedRecipeIndexes}
                        onCycleRecipe={handleCycleRecipe}
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