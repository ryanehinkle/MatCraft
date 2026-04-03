import { useEffect, useRef } from "react";
import TreeNode from "./TreeNode";
import type { BreakdownNode } from "../types/BreakdownNode";
import "./Tree.css";

type BreakdownTreeProps = {
  tree: BreakdownNode;
  roundCraftingItems: boolean;
  simplifyLargeQuantities: boolean;
  manuallyRawItems: Record<string, boolean>;
  onToggleManualRaw: (itemId: string) => void;
  selectedRecipeIndexes: Record<string, number>;
  onCycleRecipe: (itemId: string, direction: "prev" | "next") => void;
};

function BreakdownTree({
  tree,
  roundCraftingItems,
  simplifyLargeQuantities,
  manuallyRawItems,
  onToggleManualRaw,
  selectedRecipeIndexes,
  onCycleRecipe,
}: BreakdownTreeProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    // Wait until layout is ready
    requestAnimationFrame(() => {
      const scrollWidth = wrapper.scrollWidth;
      const clientWidth = wrapper.clientWidth;

      if (scrollWidth > clientWidth) {
        wrapper.scrollLeft = (scrollWidth - clientWidth) / 2;
      }
    });
  }, [tree, selectedRecipeIndexes, manuallyRawItems]);

  return (
    <div className="tree-wrapper" ref={wrapperRef}>
      <ul className="tree-root">
        <TreeNode
          node={tree}
          roundCraftingItems={roundCraftingItems}
          simplifyLargeQuantities={simplifyLargeQuantities}
          manuallyRawItems={manuallyRawItems}
          onToggleManualRaw={onToggleManualRaw}
          selectedRecipeIndexes={selectedRecipeIndexes}
          onCycleRecipe={onCycleRecipe}
          isRoot={true}
        />
      </ul>
    </div>
  );
}

export default BreakdownTree;