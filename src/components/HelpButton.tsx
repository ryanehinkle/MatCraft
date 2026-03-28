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
            Upload a <u><a
            href="https://www.curseforge.com/minecraft/mc-mods/litematica"
            target="_blank"
            rel="noopener noreferrer"
            className="help-link"
          >
            Litematica
          </a></u> materials list CSV file to generate your crafting breakdown.
          </p>
          <p>
            To get a CSV, hold down Shift and click Save to File in Litematica.
          </p>
          <p>
            The program will generate trees for each item, sorted from highest
            quantity to lowest.
          </p>
          <p>
            Select <u>"Round Crafting Items*"</u> to round base ingredients to the
            minimum required whole number to craft.
          </p>
          <p>
            Select <u>"Simplify Large Quantities"</u> to reduce the quantity
            to either stacks or shulker boxes, whichever is smaller.
          </p>
        </div>
      )}
    </>
  );
}

export default HelpButton;