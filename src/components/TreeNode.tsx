import items from "../data/items.json";
import recipes from "../data/recipes.json";
import type { BreakdownNode } from "../types/BreakdownNode";
import "./Tree.css";

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

type TreeNodeProps = {
  node: BreakdownNode;
  roundCraftingItems: boolean;
  simplifyLargeQuantities: boolean;
  manuallyRawItems: Record<string, boolean>;
  onToggleManualRaw: (itemId: string) => void;
  selectedRecipeIndexes: Record<string, number>;
  onCycleRecipe: (itemId: string, direction: "prev" | "next") => void;
  isRoot?: boolean;
};

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

function getIconPath(itemId: string): string {
  let iconItemId = itemId;

  if (iconItemId.startsWith("waxed_")) {
    iconItemId = iconItemId.replace(/^waxed_/, "");
  }

  if (iconItemId.startsWith("infested_")) {
    iconItemId = iconItemId.replace(/^infested_/, "");
  }

  return `/icons/${iconItemId}.png`;
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
  stackSize: number,
  forceMinimumCraft = false
): string {
  const baseQuantity = formatBaseQuantity(quantity, roundCraftingItems);

  let markers = "";
  if (forceMinimumCraft) {
    markers += "^";
  }
  if (roundCraftingItems && !Number.isInteger(quantity)) {
    markers += "*";
  }

  if (!simplifyLargeQuantities) {
    return `${Number(baseQuantity.toFixed(2))}${markers}`;
  }

  if (stackSize === 1) {
    return `${Number(baseQuantity.toFixed(2))}${markers}`;
  }

  return `${formatSimplifiedQuantity(baseQuantity, stackSize)}${markers}`;
}

function TreeNode({
  node,
  roundCraftingItems,
  simplifyLargeQuantities,
  manuallyRawItems,
  onToggleManualRaw,
  selectedRecipeIndexes,
  onCycleRecipe,
  isRoot = false,
}: TreeNodeProps) {
  const itemData = items[node.item as keyof typeof items];
  const itemName = itemData?.name ?? node.item;
  const stackSize = itemData?.stackSize ?? 64;

  const isManuallyRaw = !!manuallyRawItems[node.item];
  const isClickable = !isRoot && node.children.length > 0;
  const shouldRenderChildren = node.children.length > 0 && !isManuallyRaw;

  const recipeOptions = getRecipeOptions(node.item);
  const selectedIndex = selectedRecipeIndexes[node.item] ?? 0;
  const recipe = recipeOptions[selectedIndex] ?? recipeOptions[0];
  const showRecipeSwitch = recipeOptions.length > 1 && !isManuallyRaw;
  const forceMinimumCraft =
    !!recipe &&
    recipe.outputQuantity > 0 &&
    node.children.length > 0 &&
    node.quantity < recipe.outputQuantity;

  return (
    <li>
      <div
        className={`tree-node-box ${isRoot ? "root-node" : ""} ${
          isClickable ? "clickable-leaf-node" : ""
        } ${isManuallyRaw ? "manual-raw-node" : ""}`}
        onClick={() => {
          if (isClickable) {
            onToggleManualRaw(node.item);
          }
        }}
        title={
          isClickable
            ? isManuallyRaw
              ? "Click to revert this item to normal"
              : "Click to mark this item as raw"
            : undefined
        }
      >
        {showRecipeSwitch && (
          <button
            type="button"
            className="recipe-arrow recipe-arrow-left"
            onClick={(e) => {
              e.stopPropagation();
              onCycleRecipe(node.item, "prev");
            }}
            aria-label="Previous recipe option"
            title={`Previous recipe (${selectedIndex + 1}/${recipeOptions.length})`}
          >
            ‹
          </button>
        )}

        <img
          src={getIconPath(node.item)}
          alt={itemName}
          className="tree-icon"
          onError={(e) => {
            console.warn(`Missing tree icon: ${getIconPath(node.item)}`);
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />

        <span className="tree-node-text">
          {itemName} -{" "}
          {formatQuantity(
            node.quantity,
            roundCraftingItems,
            simplifyLargeQuantities,
            stackSize,
            forceMinimumCraft
          )}
        </span>

        {showRecipeSwitch && (
          <button
            type="button"
            className="recipe-arrow recipe-arrow-right"
            onClick={(e) => {
              e.stopPropagation();
              onCycleRecipe(node.item, "next");
            }}
            aria-label="Next recipe option"
            title={`Next recipe (${selectedIndex + 1}/${recipeOptions.length})`}
          >
            ›
          </button>
        )}
      </div>

      {shouldRenderChildren && (
        <ul>
          {node.children.map((child, index) => (
            <TreeNode
              key={index}
              node={child}
              roundCraftingItems={roundCraftingItems}
              simplifyLargeQuantities={simplifyLargeQuantities}
              manuallyRawItems={manuallyRawItems}
              onToggleManualRaw={onToggleManualRaw}
              selectedRecipeIndexes={selectedRecipeIndexes}
              onCycleRecipe={onCycleRecipe}
              isRoot={false}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default TreeNode;