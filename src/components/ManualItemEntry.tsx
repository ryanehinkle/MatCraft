import { useEffect, useMemo, useRef, useState } from "react";
import items from "../data/items.json";

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

type ManualItemEntryProps = {
  onAddItem: (itemName: string, quantity: number) => void;
};

type ItemOption = {
  id: string;
  name: string;
};

function ManualItemEntry({ onAddItem }: ManualItemEntryProps) {
  const [query, setQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<ItemOption | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [isOpen, setIsOpen] = useState(false);

  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const itemOptions = useMemo<ItemOption[]>(() => {
    return Object.entries(items)
      .map(([id, item]) => ({
        id,
        name: item.name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const filteredOptions = useMemo(() => {
    const trimmed = query.trim().toLowerCase();

    if (!trimmed) {
      return itemOptions.slice(0, 8);
    }

    return itemOptions
      .filter((item) => item.name.toLowerCase().includes(trimmed))
      .slice(0, 8);
  }, [itemOptions, query]);

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
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  function handleSelectItem(item: ItemOption) {
    setSelectedItem(item);
    setQuery(item.name);
    setIsOpen(false);
  }

  function handleAdd() {
    const parsedQuantity = Number(quantity);

    if (
      !selectedItem ||
      !Number.isFinite(parsedQuantity) ||
      parsedQuantity <= 0
    ) {
      return;
    }

    onAddItem(selectedItem.name, parsedQuantity);

    setQuery("");
    setSelectedItem(null);
    setQuantity("1");
    setIsOpen(false);
  }

  return (
    <div className="manual-add" ref={wrapperRef}>
      <div className="manual-add-search-wrap">
        <div className={`manual-add-input-shell ${selectedItem ? "has-icon" : ""}`}>
          {selectedItem && (
            <img
              src={getIconPath(selectedItem.id)}
              alt={selectedItem.name}
              className="manual-add-input-icon"
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                img.style.display = "none";
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
              setSelectedItem(null);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
          />
        </div>

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
                    const img = e.currentTarget as HTMLImageElement;
                    img.style.display = "none";
                  }}
                />
                <span>{item.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <input
        type="number"
        min="1"
        step="1"
        className="manual-add-quantity"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        aria-label="Quantity"
      />

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