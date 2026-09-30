// Run before React and the stylesheet to avoid a flash of the wrong theme.
(() => {
  let theme = "dark";
  try {
    if (localStorage.getItem("git-graffiti-theme") === "light") theme = "light";
  } catch {}
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
})();
