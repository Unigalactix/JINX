const accessKey = "jinxed-unlocked-v1";

export function hasAccess() {
  return sessionStorage.getItem(accessKey) === "JINXED";
}

export function clearAccess() {
  sessionStorage.removeItem(accessKey);
}

export function createCodePrompt(onUnlock) {
  const dialog = document.createElement("dialog");
  dialog.className = "archive-code-dialog";
  dialog.setAttribute("aria-labelledby", "archive-code-title");
  dialog.innerHTML = `
    <form>
      <p class="eyebrow">Sealed archive</p>
      <h2 id="archive-code-title">Enter access code</h2>
      <label for="archive-code">Code</label>
      <input id="archive-code" name="code" type="password" autocomplete="off" required
        spellcheck="false" autocapitalize="characters" aria-describedby="archive-code-error">
      <p id="archive-code-error" role="alert"></p>
      <div class="code-actions">
        <button class="button button-primary" type="submit">Unlock</button>
        <button class="button button-secondary" type="button">Cancel</button>
      </div>
    </form>`;
  document.body.append(dialog);
  const input = dialog.querySelector("input");
  const errorMessage = dialog.querySelector('[role="alert"]');
  let opener;
  dialog.querySelector('[type="button"]').addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => {
    input.value = "";
    opener?.focus({ preventScroll: true });
  });
  dialog.querySelector("form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (input.value !== "JINXED") {
      errorMessage.textContent = "Incorrect code. Try again.";
      input.setAttribute("aria-invalid", "true");
      input.select();
      return;
    }
    try {
      sessionStorage.setItem(accessKey, "JINXED");
    } catch (error) {
      if (!(error instanceof DOMException)) throw error;
      errorMessage.textContent = "This browser cannot save the unlock for this tab. Allow session storage and try again.";
      return;
    }
    dialog.close();
    onUnlock();
  });
  return (trigger) => {
    if (dialog.open) return;
    opener = trigger;
    errorMessage.textContent = "";
    input.removeAttribute("aria-invalid");
    input.value = "";
    dialog.showModal();
    input.focus();
  };
}
