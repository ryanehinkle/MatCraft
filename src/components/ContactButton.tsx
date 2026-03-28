import { useState } from "react";

function ContactButton() {
  const [open, setOpen] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [messageType, setMessageType] = useState("");
  const [message, setMessage] = useState("");

  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  const ACCESS_KEY = "bc2fea35-eec0-4921-a575-c48c2c29fc01";

  async function handleSend() {
    if (!message.trim() || !messageType || status !== "idle") return;

    setStatus("sending");

    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          access_key: ACCESS_KEY,
          name: name || "Anonymous",
          email: email || "Not provided",
          message: message,
          subject: `MatCraft - ${messageType}`,
          type: messageType,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setStatus("sent");

        // reset fields
        setName("");
        setEmail("");
        setMessage("");
        setMessageType("");

        setTimeout(() => setStatus("idle"), 1800);
      } else {
        throw new Error("Failed");
      }
    } catch (err) {
      setStatus("idle");
      alert("Something went wrong. Try again.");
    }
  }

  return (
    <>
      <button
        className="contact-button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Contact"
        title="Contact"
      >
        ✉
      </button>

      {open && (
        <div className="contact-panel">
          <h3>Drop a Message!</h3>

          <form
            className="contact-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <input
              type="text"
              placeholder="Name (Optional)"
              className="contact-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              type="email"
              placeholder="Email (Optional)"
              className="contact-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {/* Message Type Dropdown */}
            <select
              className={`contact-select ${messageType ? "has-value" : ""}`}
              value={messageType}
              onChange={(e) => setMessageType(e.target.value)}
              required
            >
              <option value="" disabled hidden>
                Message Type
              </option>
              <option value="General">General</option>
              <option value="Suggestion">Suggestion</option>
              <option value="Bug Report">Bug Report</option>
            </select>

            <textarea
              placeholder="Message"
              className="contact-textarea"
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            <button
              type="submit"
              className={`contact-submit contact-submit-${status}`}
              disabled={status !== "idle"}
            >
              <span className="contact-submit-text">
                {status === "idle" && "Send"}
                {status === "sending" && "Sending..."}
                {status === "sent" && "Sent ✓"}
              </span>
            </button>
          </form>
        </div>
      )}
    </>
  );
}

export default ContactButton;