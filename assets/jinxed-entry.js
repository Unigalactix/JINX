import { createCodePrompt } from "./jinxed-access.js";

const logo = document.querySelector(".site-header .wordmark");
const prompt = createCodePrompt(() => window.location.assign("./jinxed.html"));
logo.addEventListener("dblclick", (event) => {
  event.preventDefault();
  prompt(logo);
});
logo.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.shiftKey) {
    event.preventDefault();
    prompt(logo);
  }
});

// Touch browsers may consume double-taps as zoom instead of emitting dblclick.
let lastTap = null;
logo.addEventListener("pointerup", (event) => {
  if (event.pointerType !== "touch") return;
  if (lastTap !== null && event.timeStamp - lastTap < 400) {
    lastTap = null;
    prompt(logo);
  } else {
    lastTap = event.timeStamp;
  }
});
