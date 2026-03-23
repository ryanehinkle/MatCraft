import { useState } from "react";

function HelpButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        className="help-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Help"
        title="Help"
      >
        ?
      </button>

      {isOpen && (
        <div className="help-panel">
          <h3>Help & Tips</h3>
          <p>
            Upload a Litematica materials CSV to generate crafting breakdown
            trees.
          </p>
          <p>
            The app reads the item name and total quantity from each CSV line.
          </p>
          <p>
            Items marked as raw stop the breakdown there. Crafted items continue
            recursively until they reach raw materials.
          </p>
          <p>
            This version currently uses exact math for quantities and shows a
            per-item breakdown tree.
          </p>
        </div>
      )}
    </>
  );
}

export default HelpButton;