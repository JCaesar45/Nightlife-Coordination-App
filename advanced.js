const app = (() => {
  const state = {
    user: null,
    venues: [],
    currentLocation: null,
    authMode: "login",
    searchOffset: 0
  };

  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const init = () => {
    checkAuth();
    initCanvas();
    const saved = localStorage.getItem("lastSearch");
    if (saved) {
      $("searchInput").value = saved;
      handleSearch(new Event("submit"));
    }
  };

  const initCanvas = () => {
    const c = $("canvas-bg"),
      x = c.getContext("2d");
    let w,
      h,
      p = [];

    const resize = () => {
      w = c.width = innerWidth;
      h = c.height = innerHeight;
    };

    window.addEventListener("resize", resize);
    resize();

    for (let i = 0; i < 50; i++)
      p.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r: Math.random() * 2 + 1,
        a: Math.random() * 0.5 + 0.2
      });

    const animate = () => {
      x.clearRect(0, 0, w, h);
      p.forEach((pt, i) => {
        pt.x += pt.vx;
        pt.y += pt.vy;
        if (pt.x < 0 || pt.x > w) pt.vx *= -1;
        if (pt.y < 0 || pt.y > h) pt.vy *= -1;

        x.beginPath();
        x.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
        x.fillStyle = `rgba(255,0,110,${pt.a})`;
        x.fill();

        p.slice(i + 1).forEach((pt2) => {
          const dx = pt.x - pt2.x,
            dy = pt.y - pt2.y,
            d = Math.sqrt(dx * dx + dy * dy);
          if (d < 150) {
            x.beginPath();
            x.moveTo(pt.x, pt.y);
            x.lineTo(pt2.x, pt2.y);
            x.strokeStyle = `rgba(58,134,255,${0.1 * (1 - d / 150)})`;
            x.stroke();
          }
        });
      });
      requestAnimationFrame(animate);
    };
    animate();
  };

  const checkAuth = async () => {
    try {
      const r = await fetch("/api/auth/me");
      const d = await r.json();
      if (d.user) {
        state.user = d.user;
        updateUI();
      }
    } catch (e) {}
  };

  const updateUI = () => {
    const sec = $("authSection");
    if (state.user) {
      sec.innerHTML = `
      <div class="user-badge">
        <div class="avatar">${
          state.user.displayName?.[0] || state.user.username[0]
        }</div>
        <span>${state.user.displayName || state.user.username}</span>
      </div>
      <button class="btn btn-ghost" onclick="app.logout()">Log Out</button>
    `;
    } else {
      sec.innerHTML = `
      <button class="btn btn-ghost" onclick="app.openModal('login')">Log In</button>
      <button class="btn btn-primary" onclick="app.openModal('register')">Sign Up</button>
    `;
    }
    if (state.venues.length) renderVenues();
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    const loc = $("searchInput").value.trim();
    if (!loc) return;

    state.currentLocation = loc;
    localStorage.setItem("lastSearch", loc);
    $("loader").classList.add("active");
    $("venuesSection").classList.remove("active");

    try {
      const r = await fetch(`/api/venues?location=${encodeURIComponent(loc)}`);
      const d = await r.json();
      state.venues = d.venues || [];
      $("locationName").textContent = loc;
      $("resultsCount").textContent = `${state.venues.length} venues`;
      $("venuesSection").classList.add("active");
      renderVenues();
    } catch (err) {
      toast("Failed to load venues", "error");
    } finally {
      $("loader").classList.remove("active");
    }
  };

  const renderVenues = () => {
    const grid = $("venuesGrid");
    grid.innerHTML = state.venues
      .map((v, i) => {
        const going = state.user?.going?.includes(v.id);
        const delay = i * 50;
        return `
      <article class="venue-card" style="animation:fadeIn 0.6s ease ${delay}ms backwards">
        <img src="${
          v.image_url || `https://source.unsplash.com/featured/?bar&sig=${i}`
        }" class="venue-image" alt="${v.name}">
        <div class="venue-content">
          <div class="venue-header">
            <div>
              <h3 class="venue-name">${v.name}</h3>
              <div class="venue-meta">
                <span class="rating">★ ${v.rating}</span>
                <span>${v.review_count} reviews</span>
                <span class="price">${v.price || "$$"}</span>
              </div>
            </div>
          </div>
          <div class="venue-address">
            <span>📍</span>
            ${v.location.display_address.join(", ")}
          </div>
          <div class="venue-footer">
            <div class="rsvp-section">
              <div class="attendee-avatars">
                ${Array(Math.min(v.rsvpCount, 3))
                  .fill(0)
                  .map(
                    (_, j) =>
                      `<div class="avatar" style="background:hsl(${
                        j * 60
                      },70%,50%)">${String.fromCharCode(65 + j)}</div>`
                  )
                  .join("")}
              </div>
              <span class="rsvp-count">${v.rsvpCount} going</span>
            </div>
            <button class="btn rsvp-btn ${
              going ? "going" : ""
            }" onclick="app.toggleRSVP('${v.id}',this)">
              ${going ? "Going" : "RSVP"}
            </button>
          </div>
        </div>
      </article>
    `;
      })
      .join("");
  };

  const toggleRSVP = async (id, btn) => {
    if (!state.user) {
      openModal("login");
      toast("Please log in to RSVP", "error");
      return;
    }
    btn.disabled = true;
    try {
      const r = await fetch(`/api/venues/${id}/rsvp`, { method: "POST" });
      const d = await r.json();
      const card = btn.closest(".venue-card");
      const countEl = card.querySelector(".rsvp-count");
      const current = parseInt(countEl.textContent);

      if (d.going) {
        btn.classList.add("going");
        btn.textContent = "Going";
        countEl.textContent = `${current + 1} going`;
        toast("You're on the list!", "success");
        state.user.going = [...(state.user.going || []), id];
      } else {
        btn.classList.remove("going");
        btn.textContent = "RSVP";
        countEl.textContent = `${current - 1} going`;
        toast("Removed from list", "success");
        state.user.going = state.user.going.filter((x) => x !== id);
      }
    } catch (e) {
      toast("Error updating RSVP", "error");
    } finally {
      btn.disabled = false;
    }
  };

  const openModal = (mode) => {
    state.authMode = mode;
    $("modalOverlay").classList.add("active");
    $("modalAction").textContent = mode === "login" ? "Log In" : "Sign Up";
    $("submitBtn").textContent = mode === "login" ? "Log In" : "Create Account";
    $("nameGroup").style.display = mode === "register" ? "block" : "none";
    $("toggleText").textContent =
      mode === "login" ? "Don't have an account?" : "Already have an account?";
    $("toggleLink").textContent = mode === "login" ? "Sign Up" : "Log In";
  };

  const closeModal = () => {
    $("modalOverlay").classList.remove("active");
  };

  const toggleAuthMode = () => {
    openModal(state.authMode === "login" ? "register" : "login");
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    const payload = {
      username: $("username").value,
      password: $("password").value
    };
    if (state.authMode === "register")
      payload.displayName = $("displayName").value;

    try {
      const r = await fetch(`/api/auth/${state.authMode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);

      state.user = d;
      closeModal();
      updateUI();
      toast(
        state.authMode === "login" ? "Welcome back!" : "Account created",
        "success"
      );

      if (state.currentLocation) renderVenues();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout");
    state.user = null;
    updateUI();
    toast("Logged out", "success");
  };

  const toast = (msg, type = "success") => {
    const t = document.createElement("div");
    t.className = `toast toast-${type}`;
    t.innerHTML = `<span class="toast-icon">${
      type === "success" ? "✓" : "✕"
    }</span><span>${msg}</span>`;
    $("toastContainer").appendChild(t);
    setTimeout(() => t.remove(), 3000);
  };

  return {
    init,
    openModal,
    closeModal,
    toggleAuthMode,
    handleAuth,
    handleSearch,
    toggleRSVP,
    logout
  };
})();

document.addEventListener("DOMContentLoaded", app.init);
