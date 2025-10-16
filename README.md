# 🌱 Level Up Life  
*A gamified self-improvement tracker that turns your real-world growth into an RPG experience.*

---

## 🧭 Overview

**Level Up Life** is a mobile-first, offline-friendly web app that lets users earn XP and level up personal attributes by completing real-world activities.

Each activity contributes XP to specific **core attributes** and **sub-attributes**, allowing users to see their growth as if leveling up a character in an RPG.

The app currently runs entirely in the browser using `localStorage` but is structured to support an optional backend for social features (friends, leaderboards, cloud sync) in the future.

---

## 🧠 Core Features (Implemented)

### 🏠 Dashboard
- Displays five core attributes:
  - 🏋️ **Fitness** → Strength, Stamina, Flexibility  
  - 🧠 **Knowledge** → Learning, Research, Application  
  - 🦉 **Wisdom** → Reflection, Integration, Teaching  
  - ⚙️ **Discipline** → Consistency, Organization, Resilience  
  - 🧘 **Mindfulness** → Focus, Awareness, Calm
- Each attribute includes:
  - XP bar and current level
  - Expandable/collapsible sub-attributes
  - Persistent state (open/closed sections remembered)
- Level-up badge ⭐ + card pulse animation when leveling up

---

### ⚡ XP & Leveling System
- XP is earned based on **time spent**  
  (`15 min = 25 XP`, `30 min = 50 XP`, etc.)
- Each activity has **weighted XP distribution** across multiple attributes and sub-attributes
- Attributes level up after `200 × current level` XP
- Level-up events trigger **animated feedback**
- Total XP and streak displayed on dashboard

---

### 🧾 Activities System
- All activities defined in `/data/activities.json`
- Each activity includes:
  - `id`, `name`, `category`, and `tags`
  - Weighted XP distribution across attributes/sub-attributes
- Users can:
  - Browse and search activities
  - Filter by category and tags
  - Star ⭐ favorites to create a personal activity list

---

### 🔍 Activity Browser
- Fully interactive activity explorer featuring:
  - Real-time search  
  - Category filters (Fitness, Knowledge, etc.)  
  - Dynamic tag filters (e.g., Focus, Strength, Reflection)  
  - Star/unstar favorites (persisted in localStorage)  
- Designed to scale to hundreds of activities without performance loss

---

### 🧩 Log Activity Modal
- Opens via “+ Log Activity” button on dashboard
- Displays:
  - User’s personal favorites (fallback to all if empty)
  - Time spent selector (auto-calculates XP)
  - Optional toggle: “Show all activities”
- Automatically distributes XP and refreshes dashboard
- Toast notification confirms XP gained

---

### 🧹 Reset System (for Testing)
- Two reset methods:
  - **Ctrl + R** shortcut → instant reset with confirmation  
  - **Reset Progress** button on Settings page
- Clears XP, levels, sub-attributes, favorites, and streaks  
- Reloads app to default state

---

### 🪶 UI / UX
- Built with:
  - **TailwindCSS (CDN)** — rapid prototyping and responsive layout  
  - **HTMX** — lightweight dynamic partial swapping  
  - **Vanilla JS** — complete interactivity and data handling
- Offline-ready (no backend required)
- Mobile-first design with smooth transitions

---

## 🗂️ File Structure

```
level-up-life/
├── index.html
├── css/
│   └── theme.css
├── js/
│   ├── main.js
│   └── storage.js
├── data/
│   └── activities.json
└── partials/
    ├── dashboard.html
    ├── activity_form.html
    ├── activities.html
    └── settings.html
```

---

## 💾 Data Model Example

```json
{
  "name": "Zack",
  "totalXP": 1200,
  "streak": 7,
  "customActivities": ["workout", "meditate"],

  "attributes": {
    "fitness": {
      "level": 3,
      "xp": 40,
      "sub": {
        "strength": 180,
        "stamina": 120,
        "flexibility": 60
      }
    },
    "knowledge": { "...": "..." },
    "wisdom": { "...": "..." },
    "discipline": { "...": "..." },
    "mindfulness": { "...": "..." }
  }
}
```

Stored in `localStorage` under key `levelup_user_data`.

---

## 🧰 Tech Stack

| Layer | Technology | Purpose |
|-------|-------------|----------|
| UI | **TailwindCSS (CDN)** | Rapid responsive design |
| Interactivity | **HTMX + Vanilla JS** | Dynamic partials & logic |
| Storage | **localStorage** | Offline persistence |
| Data | **JSON** | Activity definitions |
| Backend (future) | **JS / Zig API** | Cloud sync & social features |

---

## ✅ Completed Milestones

- [x] Core attribute + sub-attribute system  
- [x] XP calculation and weighting logic  
- [x] Dashboard UI and level-up animations  
- [x] Log Activity modal  
- [x] Personal favorites system  
- [x] Search, category, and tag filters  
- [x] Toast notifications  
- [x] Reset progress system  
- [x] Modular file structure (partials + HTMX)

---

## 🧩 To-Do List (Detailed)

### 🎨 UI / UX
- [ ] Improve layout for large activity sets (lazy-load or pagination)
- [ ] Add global theme toggle (light/dark)
- [ ] Add progress rings for sub-attributes
- [ ] Add recent-activity list to dashboard
- [ ] Optimize modal and button placement for small screens

### ⚡ Features
- [ ] Remember last selected category/tag in browser
- [ ] Add **custom user-created activities**
- [ ] Add **category XP summaries**
- [ ] Implement **level-up summary modal** (shows what changed)
- [ ] Add **daily reflection / journal** page
- [ ] Add **streak bonuses and milestones**
- [ ] Implement **XP decay** (lose small XP on inactivity)
- [ ] Add **activity history log**

### ☁️ Backend / Sync
- [ ] Create lightweight backend API (Node.js or Zig)
- [ ] Implement login / account sync
- [ ] Add friends list and leaderboard
- [ ] Enable optional cloud-sync for progress
- [ ] Create public “activity template” repository

### 🧱 Codebase
- [ ] Replace CDN Tailwind with PostCSS build
- [ ] Add Service Worker (PWA support)
- [ ] Move from localStorage to IndexedDB for scalability
- [ ] Modularize JS into ES modules
- [ ] Add centralized error handling

### 📊 Analytics
- [ ] Add radar/spider XP visualization (Chart.js)
- [ ] Add XP/time analytics by category/week
- [ ] Add user stats dashboard

### 🧘 Personalization
- [ ] Editable profile (name, avatar)
- [ ] Archetype system (e.g. “The Scholar”, “The Warrior”)
- [ ] Achievements and titles
- [ ] Seasonal progress resets (“Season 1: Foundations”)
- [ ] Add sound/haptic feedback for level-ups

---

## 🚀 Development Notes

To run locally:

```bash
python -m http.server
```

Then open [http://localhost:8000](http://localhost:8000)

**Keyboard Shortcuts**
- `Ctrl + R` → Reset all XP and progress (dev shortcut)

All user data, favorites, and open panels persist automatically via `localStorage`.

---

## 🏁 Next Steps

**Short term**
- Implement custom user-defined activities with category and tag selection

**Medium term**
- Add reflections and XP history tracking

**Long term**
- Introduce backend sync, friends, and archetypes for social progression

---

## 💚 Credits

Created by **Zackary Housend**  
Built with **HTMX**, **TailwindCSS**, and **Vanilla JavaScript**

---
