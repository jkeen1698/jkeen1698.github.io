(function (global) {
  const ROOM = "fin411-cal";
  let fb = null;

  function cfg() {
    const c = global.FIN411_FIREBASE;
    return c && c.apiKey && c.databaseURL ? c : null;
  }

  function init() {
    if (fb || !cfg()) return;
    if (typeof firebase === "undefined") return;
    firebase.initializeApp(cfg());
    fb = firebase.database();
  }

  function studentUrl() {
    const u = new URL(location.href);
    u.hash = "";
    u.search = "";
    let path = u.pathname;
    if (path.endsWith("dashboard.html")) {
      path = path.slice(0, -"dashboard.html".length);
    }
    if (path.endsWith("index.html")) {
      path = path.slice(0, -"index.html".length);
    }
    if (!path.endsWith("/")) path += "/";
    u.pathname = path;
    return u.href;
  }

  async function submitRow(row) {
    init();
    if (fb) {
      await fb.ref(ROOM + "/rows").push(row);
      return;
    }
    const res = await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
    });
    if (!res.ok) throw new Error("submit failed");
  }

  async function getRows() {
    init();
    if (fb) {
      const snap = await fb.ref(ROOM + "/rows").once("value");
      const v = snap.val() || {};
      return Object.values(v);
    }
    const res = await fetch("/api/results");
    if (!res.ok) return [];
    return res.json();
  }

  function listenRows(cb) {
    init();
    if (fb) {
      fb.ref(ROOM + "/rows").on("value", (snap) => {
        cb(Object.values(snap.val() || {}));
      });
      return null;
    }
    const tick = async () => {
      cb(await getRows());
    };
    tick();
    return setInterval(tick, 1500);
  }

  async function resetSection(section) {
    init();
    if (fb) {
      const ref = fb.ref(ROOM + "/rows");
      if (section === "all") {
        await ref.remove();
        return;
      }
      const snap = await ref.once("value");
      const v = snap.val() || {};
      const updates = {};
      Object.keys(v).forEach((k) => {
        if (v[k] && v[k].section === section) updates[k] = null;
      });
      if (Object.keys(updates).length) await ref.update(updates);
      return;
    }
    await fetch("/api/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: section || "all" }),
    });
  }

  global.Fin411Store = {
    submitRow,
    getRows,
    listenRows,
    resetSection,
    studentUrl,
    usingCloud: () => !!cfg(),
  };
})(window);
