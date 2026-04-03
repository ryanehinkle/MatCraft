import { useEffect, useMemo, useRef, useState } from "react";
import items from "../data/items.json";

// Get icon path, removing prefixes (like waxed_ / infested_) since their icons are the same
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

// Sends selected item + quantity back to App
type ManualItemEntryProps = {
  onAddItem: (itemName: string, quantity: number) => void;
};

// Item format for dropdown
type ItemOption = {
  id: string;
  name: string;
};

function ManualItemEntry({ onAddItem }: ManualItemEntryProps) {
  const [query, setQuery] = useState(""); // current search input
  const [selectedItem, setSelectedItem] = useState<ItemOption | null>(null);
  const [quantity, setQuantity] = useState("1"); // quantity input
  const [isOpen, setIsOpen] = useState(false); // dropdown visibility

  const wrapperRef = useRef<HTMLDivElement | null>(null); // used to detect outside clicks

  // Build full list of items from items.json
  const itemOptions = useMemo<ItemOption[]>(() => {
    return Object.entries(items)
      .map(([id, item]) => ({
        id,
        name: item.name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  // Calculates how well an item matches the search query (Thanks to Josh for the bug report!)
  function getRelevancyScore(itemName: string, query: string): number {
    const name = itemName.toLowerCase(); // Item result
    const q = query.trim().toLowerCase(); // Search query

    if (!q) return 0; // Score of 0 for no query

    // Split into words for order flexibility
    const queryWords = q.split(/\s+/).filter(Boolean);
    const nameWords = name.split(/\s+/).filter(Boolean);

    // Perfect exact match ("glass" being exactly "glass")
    if (name === q) {
      return 1000;
    }

    // Phrase match ("blue glass" being within "blue glass pane")
    if (name.includes(q)) {
      return 800;
    }

    // Checks for ALL words from query existing somewhere in the item name
    const allWordsPresent = queryWords.every((word) =>
      nameWords.some((nameWord) => nameWord === word || nameWord.includes(word))
    );

    // No match if missing a word from the query
    if (!allWordsPresent) {
      return 0;
    }

    // From here, we know all query words are present in the item name,
    // so we can assign a score and adjust based on how well they match
    let score = 500;

    // Reward words appearing earlier in the name
    queryWords.forEach((word, index) => {
      const foundIndex = nameWords.findIndex(
        (nameWord) => nameWord === word || nameWord.includes(word)
      );

      if (foundIndex !== -1) {
        score += Math.max(0, 60 - foundIndex * 10);

        // Bonus if order matches (blue glass vs glass blue)
        if (foundIndex === index) {
          score += 25;
        }
      }
    });

    // Prefer item names with fewer extra words
    score += Math.max(0, 40 - (nameWords.length - queryWords.length) * 10);

    // Prefer shorter item names when query is short
    score += Math.max(0, 20 - (name.length - q.length));

    return score;
  }

  // Filter and rank items based on search query
  const filteredOptions = useMemo(() => {
    const trimmed = query.trim().toLowerCase();

    // Show default suggestions if no query
    if (!trimmed) {
      return itemOptions.slice(0, 8);
    }

    return itemOptions
      .map((item) => ({
        ...item,
        score: getRelevancyScore(item.name, trimmed),
      }))
      .filter((item) => item.score > 0) // Remove non-matches
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score; // Highest score first
        }

        return a.name.localeCompare(b.name); // Alphabetical otherwise
      })
      .slice(0, 8);
  }, [itemOptions, query]);

  // Close dropdown if clicking outside it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // When user clicks an item from dropdown
  function handleSelectItem(item: ItemOption) {
    setSelectedItem(item);
    setQuery(item.name);
    setIsOpen(false);
  }

  // Add selected item and quantity to main app
  function handleAdd() {
    const parsedQuantity = Number(quantity);

    if (!selectedItem || !Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      return;
    }

    onAddItem(selectedItem.name, parsedQuantity);

    // Reset inputs after adding
    setQuery("");
    setSelectedItem(null);
    setQuantity("1");
    setIsOpen(false);
  }

  return (
    <div className="manual-add" ref={wrapperRef}>
      <div className="manual-add-search-wrap">
        <div className={`manual-add-input-shell ${selectedItem ? "has-icon" : ""}`}>
          
          {/* Show selected item icon inside input */}
          {selectedItem && (
            <img
              src={getIconPath(selectedItem.id)}
              alt={selectedItem.name}
              className="manual-add-input-icon"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          )}

          <input
            type="text"
            className="manual-add-input"
            placeholder="Search item..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedItem(null); // Typing resets selection
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
          />
        </div>

        {/* Dropdown results */}
        {isOpen && filteredOptions.length > 0 && (
          <div className="manual-add-dropdown">
            {filteredOptions.map((item) => (
              <button
                key={item.id}
                type="button"
                className="manual-add-option"
                onClick={() => handleSelectItem(item)}
              >
                <img
                  src={getIconPath(item.id)}
                  alt={item.name}
                  className="manual-add-icon"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
                <span>{item.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quantity input */}
      <input
        type="number"
        min="1"
        step="1"
        className="manual-add-quantity"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        aria-label="Quantity"
      />

      {/* Add button */}
      <button
        type="button"
        className="manual-add-button"
        onClick={handleAdd}
      >
        Add Item
      </button>
    </div>
  );
}

export default ManualItemEntry;