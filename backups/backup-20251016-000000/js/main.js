document.addEventListener("DOMContentLoaded", () => {
  console.log("Level Up Life started!");

  const navButtons = document.querySelectorAll(".nav-btn");
  let currentPage = "dashboard";
  const pageOrder = ["dashboard", "activities", "reflections", "milestones", "settings"];

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("hx-get") || "";
      const page = target.split("/").pop().replace(".html", "");
      const app = document.getElementById("app");
      const currentIndex = pageOrder.indexOf(currentPage);
      const newIndex = pageOrder.indexOf(page);
      app.dataset.direction = newIndex > currentIndex ? "forward" : "back";

      currentPage = page;
      navButtons.forEach(b => b.classList.replace("text-green-400", "text-gray-400"));
      btn.classList.replace("text-gray-400", "text-green-400");
    });
  });

  document.body.addEventListener("htmx:afterSwap", () => {
    const app = document.getElementById("app");
    app.classList.add("translate-x-0");
    if (document.querySelector("[data-user-name]")) {
      loadDashboardData();
      wireActivityButton();
    }
    if (document.getElementById("activitiesList")) loadActivities();
  });

  if (document.querySelector("[data-user-name]")) {
    loadDashboardData();
    wireActivityButton();
  }
});

nfunction loadDashboardData() {
  const user = Storage.load();

  document.querySelectorAll("[data-attr]").forEach((el) => {
    const attr = el.dataset.attr;
    const xpBar = el.querySelector("[data-xp-bar]");
    const xpText = el.querySelector("[data-xp-text]");
    const levelText = el.querySelector("[data-level]");
    const attrData = user.attributes[attr];
    if (!attrData) return;

    const nextLevelXP = attrData.level * 200;
    const progress = Math.min((attrData.xp / nextLevelXP) * 100, 100);
    animateXPBar(xpBar, progress);
    xpText.textContent = `${attrData.xp} / ${nextLevelXP} XP`;

    const prevLevel = parseInt(levelText.dataset.prevLevel || 0);
    if (attrData.level > prevLevel) showLevelUpBadge(attr, attrData.level);
    levelText.dataset.prevLevel = attrData.level;
    levelText.textContent = `Lv ${attrData.level}`;

    if (attrData.sub) {
      for (const [subKey, subXP] of Object.entries(attrData.sub)) {
        const span = el.querySelector(`[data-sub='${subKey}']`);
        if (span) span.textContent = `${subXP} XP`;
      }
    }
  });

  const nameEl = document.querySelector("[data-user-name]");
  const totalXP = document.querySelector("[data-total-xp]");
  const streakEl = document.querySelector("[data-streak]");
  if (nameEl) nameEl.textContent = user.name;
  if (totalXP) totalXP.textContent = `${user.totalXP.toLocaleString()} XP`;
  if (streakEl) streakEl.textContent = `🔥 ${user.streak}-day streak`;

  wireSubAttributeToggles();
}

nfunction animateXPBar(element, targetWidth) {
  const currentWidth = parseFloat(element.style.width) || 0;
  const duration = 700;
  const frameRate = 1000 / 60;
  const totalFrames = duration / frameRate;
  const delta = targetWidth - currentWidth;
  let frame = 0;
  const easeOutQuad = (t) => t * (2 - t);

  const interval = setInterval(() => {
    frame++;
    const progress = easeOutQuad(frame / totalFrames);
    const newWidth = currentWidth + delta * progress;
    element.style.width = `${newWidth}%`;
    if (frame >= totalFrames) clearInterval(interval);
  }, frameRate);
}

nfunction showLevelUpBadge(attribute, newLevel) {
  const attrCard = document.querySelector(`[data-attr='${attribute}']`);
  if (!attrCard) return;
  if (attrCard.querySelector(".level-up-badge")) return;

  const badge = document.createElement("div");
  badge.className = "level-up-badge";
  badge.innerHTML = `⭐ Level Up! <span class="text-sm text-gray-200">Lv ${newLevel}</span>`;
  attrCard.appendChild(badge);

  attrCard.classList.add("level-up-pulse");
  setTimeout(() => {
    attrCard.classList.remove("level-up-pulse");
    badge.remove();
  }, 1800);
}

nfunction wireSubAttributeToggles() {
  const STORAGE_KEY = "openSubAttrs";
  let openSubAttrs = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

  document.querySelectorAll(".toggle-subattr").forEach((el) => {
    el.addEventListener("click", () => {
      const parent = el.closest("[data-attr]");
      const attr = parent.dataset.attr;
      const subSection = parent.querySelector(".sub-attr");
      if (!subSection) return;
      const isOpen = !subSection.classList.contains("hidden");
      subSection.classList.toggle("hidden");
      if (isOpen) openSubAttrs = openSubAttrs.filter(a => a !== attr);
      else openSubAttrs.push(attr);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(openSubAttrs));
    });
  });

  openSubAttrs.forEach(attr => {
    const el = document.querySelector(`[data-attr='${attr}'] .sub-attr`);
    if (el) el.classList.remove("hidden");
  });
}

// ✅ Activity Browser
function loadActivities() {
  const list = document.getElementById("activitiesList");
  const search = document.getElementById("activitySearch");
  const catContainer = document.getElementById("categoryFilters");
  const tagContainer = document.getElementById("tagFilters");

  fetch("data/activities.json")
    .then(res => res.json())
    .then(activities => {
      const userFavs = Storage.getCustomActivities();
      let activeCategory = null;
      let activeTags = new Set();

      // Build unique categories
      const categories = [...new Set(activities.map(a => a.category))];
      catContainer.innerHTML = categories
        .map(cat => `<button class="cat-btn px-3 py-1 rounded-full bg-gray-800 text-gray-300 hover:bg-green-600 hover:text-white">${cat}</button>`)
        .join("");

      // Render Function
      function render() {
        const filterText = search.value.toLowerCase();
        const filtered = activities.filter(a => {
          const matchesCategory = !activeCategory || a.category === activeCategory;
          const matchesText = a.name.toLowerCase().includes(filterText);
          const matchesTags = activeTags.size === 0 || a.tags.some(tag => activeTags.has(tag));
          return matchesCategory && matchesText && matchesTags;
        });

        list.innerHTML = "";
        filtered.forEach((act) => {
          const isFav = userFavs.includes(act.id);
          const card = document.createElement("div");
          card.className = `p-3 rounded-xl bg-gray-900 border ${
            isFav ? "border-green-500" : "border-gray-800"
          } shadow-sm flex justify-between items-center`;
          card.innerHTML = `
            <div>
              <p class="text-gray-200 font-medium">${act.name}</p>
              <p class="text-xs text-gray-400">${act.tags.join(", ")}</p>
            </div>
            <button data-activity-id="${act.id}" class="text-sm ${
              isFav ? "text-green-400" : "text-gray-500"
            } hover:text-green-400">${isFav ? "★" : "☆"}</button>
          `;
          list.appendChild(card);
        });

        // Build Tag Filters dynamically
        const visibleTags = new Set();
        activities.forEach(a => {
          if (!activeCategory || a.category === activeCategory) {
            a.tags.forEach(tag => visibleTags.add(tag));
          }
        });

        tagContainer.innerHTML = "";
        [...visibleTags].forEach(tag => {
          const isActive = activeTags.has(tag);
          const btn = document.createElement("button");
          btn.textContent = tag;
          btn.className = `px-2 py-1 text-xs rounded-full ${
            isActive ? "bg-green-600 text-white" : "bg-gray-800 text-gray-300"
          } hover:bg-green-500 hover:text-white`;
          btn.addEventListener("click", () => {
            if (isActive) activeTags.delete(tag);
            else activeTags.add(tag);
            render();
          });
          tagContainer.appendChild(btn);
        });
      }

      // Category click
      catContainer.addEventListener("click", (e) => {
        if (e.target.classList.contains("cat-btn")) {
          activeCategory = e.target.textContent === activeCategory ? null : e.target.textContent;
          catContainer.querySelectorAll(".cat-btn").forEach(btn =>
            btn.classList.toggle("bg-green-600", btn.textContent === activeCategory)
          );
          render();
        }
      });

      search.addEventListener("input", render);

      // Favorite star toggles
      list.addEventListener("click", (e) => {
        if (e.target.matches("button[data-activity-id]")) {
          const id = e.target.dataset.activityId;
          if (userFavs.includes(id)) Storage.removeCustomActivity(id);
          else Storage.addCustomActivity(id);
          const updatedFavs = Storage.getCustomActivities();
          userFavs.splice(0, userFavs.length, ...updatedFavs);
          render();
        }
      });

      render();
    });
}


// ✅ Log Activity Modal
function wireActivityButton() {
  const logBtn = document.getElementById("logFitness");
  if (!logBtn) return;
  logBtn.addEventListener("click", () => {
    fetch("partials/activity_form.html")
      .then(res => res.text())
      .then(html => {
        document.body.insertAdjacentHTML("beforeend", html);
        initActivityForm();
      });
  });
}

function initActivityForm() {
  const overlay = document.getElementById("activityFormOverlay");
  const closeBtn = document.getElementById("closeActivityForm");
  const activitySelect = document.getElementById("activitySelect");
  const timeSelect = document.getElementById("timeSelect");
  const xpPreview = document.getElementById("xpPreview");
  const form = document.getElementById("activityForm");

  closeBtn.addEventListener("click", () => overlay.remove());

  fetch("data/activities.json")
    .then(res => res.json())
    .then(activities => {
      const userFavs = Storage.getCustomActivities();
      const filtered = userFavs.length ? activities.filter(a => userFavs.includes(a.id)) : activities;
      activitySelect.innerHTML = "";
      filtered.forEach((act) => {
        const opt = document.createElement("option");
        opt.value = act.id;
        opt.textContent = act.name;
        activitySelect.appendChild(opt);
      });
    });

  function updateXPPreview() {
    const minutes = parseInt(timeSelect.value, 10);
    const xp = Math.round(minutes * 1.6);
    xpPreview.textContent = xp;
  }

  timeSelect.addEventListener("change", updateXPPreview);
  updateXPPreview();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const activityId = activitySelect.value;
    const minutes = parseInt(timeSelect.value, 10);

    fetch("data/activities.json")
      .then(res => res.json())
      .then(activities => {
        const activityData = activities.find(a => a.id === activityId);
        if (!activityData) return;

        const result = Storage.addWeightedXP(activityData, minutes);
        overlay.remove();
        loadDashboardData();
        showToast(`+${result.totalXP} XP from ${activityData.name}!`);
      });
  });
}

// 🔥 Reset Shortcut
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key.toLowerCase() === "r") {
    if (confirm("Reset all XP and progress?")) {
      Storage.reset();
    }
  }
});

// 🪄 Toast helper
function showToast(msg) {
  const toast = document.createElement("div");
  toast.textContent = msg;
  toast.className = "fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-fadeInOut z-50";
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}