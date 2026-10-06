// Node-RED 5 defaults the editor appearance to "light" when the browser has no
// saved choice. Seed "auto" (follow OS) instead; an explicit user choice in
// User Settings > View > Appearance is kept.
try {
  if (localStorage.getItem("view-dark-theme") === null) {
    localStorage.setItem("view-dark-theme", "auto");
  }
} catch (err) {}
