import items from "../data/items.json";
import type { BreakdownNode } from "../types/BreakdownNode";
import "./Tree.css";

type TreeNodeProps = {
    node: BreakdownNode;
    roundCraftingItems: boolean;
    simplifyLargeQuantities: boolean;
    isRoot?: boolean;
  };

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

function TreeNode({
  node,
  roundCraftingItems,
  simplifyLargeQuantities,
  isRoot = false,
}: TreeNodeProps) {
  const itemData = items[node.item as keyof typeof items];
  const itemName = itemData?.name ?? node.item;
  const stackSize = itemData?.stackSize ?? 64;

  return (
    <li>
      <div className={`tree-node-box ${isRoot ? "root-node" : ""}`}>
        {itemData?.icon && (
          <img
            src={itemData.icon}
            alt={itemName}
            className="tree-icon"
          />
        )}
        {itemName} -{" "}
        {formatQuantity(
          node.quantity,
          roundCraftingItems,
          simplifyLargeQuantities,
          stackSize
        )}
      </div>

      {node.children.length > 0 && (
        <ul>
          {node.children.map((child, index) => (
            <TreeNode
                key={index}
                node={child}
                roundCraftingItems={roundCraftingItems}
                simplifyLargeQuantities={simplifyLargeQuantities}
                isRoot={false}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default TreeNode;