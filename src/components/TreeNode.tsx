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
  recipeSwitchItemId?: string;
  recipeSwitchIndex?: number;
  recipeSwitchTotal?: number;
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

  // strip prefixes that don't affect visuals
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

function TreeNode({
  node,
  roundCraftingItems,
  simplifyLargeQuantities,
  manuallyRawItems,
  onToggleManualRaw,
  selectedRecipeIndexes,
  onCycleRecipe,
  isRoot = false,
  recipeSwitchItemId,
  recipeSwitchIndex,
  recipeSwitchTotal,
}: TreeNodeProps) {
  const itemData = items[node.item as keyof typeof items];
  const itemName = itemData?.name ?? node.item;
  const stackSize = itemData?.stackSize ?? 64;

  const isManuallyRaw = !!manuallyRawItems[node.item];
  const isClickable = !isRoot && node.children.length > 0;
  const shouldRenderChildren = node.children.length > 0 && !isManuallyRaw;

  const showRecipeSwitch =
    !!recipeSwitchItemId &&
    typeof recipeSwitchIndex === "number" &&
    typeof recipeSwitchTotal === "number" &&
    recipeSwitchTotal > 1;

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
              onCycleRecipe(recipeSwitchItemId, "prev");
            }}
            aria-label={`Previous recipe option`}
            title={`Previous recipe (${recipeSwitchIndex + 1}/${recipeSwitchTotal})`}
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
            stackSize
          )}
        </span>

        {showRecipeSwitch && (
          <button
            type="button"
            className="recipe-arrow recipe-arrow-right"
            onClick={(e) => {
              e.stopPropagation();
              onCycleRecipe(recipeSwitchItemId, "next");
            }}
            aria-label={`Next recipe option`}
            title={`Next recipe (${recipeSwitchIndex + 1}/${recipeSwitchTotal})`}
          >
            ›
          </button>
        )}
      </div>

      {shouldRenderChildren && (
        <ul>
          {node.children.map((child, index) => {
            const childRecipeOptions = getRecipeOptions(node.item);
            const parentHasAlternatives = childRecipeOptions.length > 1;
            const selectedIndex = selectedRecipeIndexes[node.item] ?? 0;

            const shouldShowSwitchOnThisChild =
              parentHasAlternatives && index === 0;

            return (
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
                recipeSwitchItemId={
                  shouldShowSwitchOnThisChild ? node.item : undefined
                }
                recipeSwitchIndex={
                  shouldShowSwitchOnThisChild ? selectedIndex : undefined
                }
                recipeSwitchTotal={
                  shouldShowSwitchOnThisChild
                    ? childRecipeOptions.length
                    : undefined
                }
              />
            );
          })}
        </ul>
      )}
    </li>
  );
}

export default TreeNode;