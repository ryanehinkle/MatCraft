import { useState } from "react";

type HelpSectionProps = {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

function HelpSection({
  title,
  children,
  defaultOpen = false,
}: HelpSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="help-section">
      <button
        type="button"
        className={`help-section-toggle ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span>{title}</span>
        <span className="help-section-arrow">{isOpen ? "▾" : "▸"}</span>
      </button>

      {isOpen && <div className="help-section-content">{children}</div>}
    </div>
  );
}

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

          <HelpSection title="Getting Started" defaultOpen={true}>
            <p>
              Upload a{" "}
              <u>
                <a
                  href="https://www.curseforge.com/minecraft/mc-mods/litematica"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="help-link"
                >
                  Litematica
                </a>
              </u>{" "}
              materials list CSV file to generate your crafting tree, or enter them
              in manually.
            </p>

            <p>
              To get a CSV, hold down Shift and click Save to File in
              Litematica.
            </p>

            <p>
              The program will generate trees for each item, sorted from highest
              quantity to lowest.
            </p>
          </HelpSection>

          <HelpSection title="Core Features">
            <p>
              You can manually add items using the search bar next to the upload
              button. Select an item, set a quantity, and add it to your list.
            </p>

            <p>
              Items can have multiple crafting recipes. Use the arrows on an
              item to cycle through different crafting options.
            </p>

            <p>
              Raw is subjective. If you have access to a material without the need
              for crafting, you can click on it to treat
              that item as a base material. This will update the whole list.
            </p>
          </HelpSection>

          <HelpSection title="Tracking Progress">
            <p>
              Mark items as collected using the checkboxes. Checked items will
              move to the bottom but still show in the total raw material
              summary.
            </p>

            <p>
              The <u>Total Raw Materials</u> section combines all required base
              materials across every item.
            </p>

            <p>
              You can export the total raw materials list as a CSV file for easy
              reference or sharing.
            </p>
          </HelpSection>

          <HelpSection title="Options">
            <p>
              Select <u>"Round Crafting Items*"</u> to round base ingredients to
              the minimum required whole number to craft.
            </p>

            <p>
              Select <u>"Simplify Large Quantities"</u> to reduce the quantity
              to either stacks or shulker boxes, whichever is smaller.
            </p>
          </HelpSection>

          <HelpSection title="Notes">
            <p>
              Some items may have multiple valid crafting paths (for example
              dyes or wood variants), so results may change depending on the
              selected recipe.
            </p>
          </HelpSection>
        </div>
      )}
    </>
  );
}

export default HelpButton;