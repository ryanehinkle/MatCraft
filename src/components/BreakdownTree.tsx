import TreeNode from "./TreeNode";
import type { BreakdownNode } from "../types/BreakdownNode";
import "./Tree.css";

type BreakdownTreeProps = {
  tree: BreakdownNode;
  roundCraftingItems: boolean;
  simplifyLargeQuantities: boolean;
};

function BreakdownTree({
  tree,
  roundCraftingItems,
  simplifyLargeQuantities,
}: BreakdownTreeProps) {
  return (
    <div className="tree-wrapper">
      <ul className="tree-root">
        <TreeNode
            node={tree}
            roundCraftingItems={roundCraftingItems}
            simplifyLargeQuantities={simplifyLargeQuantities}
            isRoot={true}
        />
      </ul>
    </div>
  );
}

export default BreakdownTree;