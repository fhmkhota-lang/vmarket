const STORAGE_KEY = "vmarket-state-v2";

const BRANDS = [
  {
    id: "brand-iol",
    name: "IOL",
    description: "Central planning for IOL brand and product campaigns.",
    tone: "Trusted, immediate, national"
  },
  {
    id: "brand-title-sites",
    name: "Title Sites",
    description: "Shared campaign planning across all title sites under one marketing approach.",
    tone: "Scalable, local, consistent"
  },
  {
    id: "brand-conde-naste",
    name: "Conde Naste",
    description: "Premium campaign planning for Conde Naste products and launches.",
    tone: "Premium, polished, aspirational"
  }
];

const CHANNELS = [
  { key: "design", label: "Design" },
  { key: "social", label: "Social" },
  { key: "content", label: "Content" },
  { key: "visuals", label: "Visuals" },
  { key: "messaging", label: "Messaging" }
];

const STATUSES = [
  { key: "not-started", label: "Not Started", weight: 0 },
  { key: "in-progress", label: "In Progress", weight: 0.45 },
  { key: "review", label: "Review", weight: 0.72 },
  { key: "scheduled", label: "Scheduled", weight: 0.9 },
  { key: "live", label: "Live", weight: 1 }
];

const METRICS = [
  { key: "visibility", label: "Visibility", unit: "impressions" },
  { key: "engagement", label: "Engagement", unit: "engagements" },
  { key: "conversion", label: "Conversion", unit: "actions" }
];

const els = {
  currentContextLabel: document.getElementById("currentContextLabel"),
  heroStats: document.getElementById("heroStats"),
  campaignSelect: document.getElementById("campaignSelect"),
  brandSeedSelect: document.getElementById("brandSeedSelect"),
  campaignForm: document.getElementById("campaignForm"),
  portfolioGrid: document.getElementById("portfolioGrid"),
  briefForm: document.getElementById("briefForm"),
  messageForm: document.getElementById("messageForm"),
  channelGrid: document.getElementById("channelGrid"),
  statusPanel: document.getElementById("statusPanel"),
  metricForm: document.getElementById("metricForm"),
  taskForm: document.getElementById("taskForm"),
  taskBoard: document.getElementById("taskBoard"),
  noteForm: document.getElementById("noteForm"),
  noteList: document.getElementById("noteList"),
  exportBtn: document.getElementById("exportBtn"),
  importBtn: document.getElementById("importBtn"),
  importInput: document.getElementById("importInput"),
  resetBtn: document.getElementById("resetBtn")
};

let state = loadState();

init();

function init() {
  hydrateBrandSeedSelect();
  hydrateTaskChannels();
  bindEvents();
  render();
}

function bindEvents() {
  els.campaignSelect.addEventListener("change", (event) => {
    state.activeCampaignId = event.target.value || null;
    persist();
    render();
  });

  els.campaignForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const brandId = String(formData.get("brandId") || "").trim();
    const productName = String(formData.get("productName") || "").trim();
    const owner = String(formData.get("owner") || "").trim();
    const launchDate = String(formData.get("launchDate") || "").trim();

    if (!brandId || !productName || !owner || !launchDate) return;

    const campaign = createCampaign({
      brandId,
      product: productName,
      owner,
      launchDate
    });

    state.campaigns.unshift(campaign);
    state.activeCampaignId = campaign.id;
    event.currentTarget.reset();
    hydrateBrandSeedSelect();
    persist();
    render();
  });

  document.addEventListener("change", handleChange);
  document.addEventListener("click", handleClick);

  els.taskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const campaign = getActiveCampaign();
    if (!campaign) return;

    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") || "").trim();
    const channel = String(formData.get("channel") || "").trim();
    const owner = String(formData.get("owner") || "").trim();
    const due = String(formData.get("due") || "").trim();

    if (!title || !channel || !owner || !due) return;

    campaign.tasks.unshift({
      id: uid("task"),
      title,
      channel,
      owner,
      due,
      status: "not-started"
    });

    event.currentTarget.reset();
    hydrateTaskChannels();
    persist();
    render();
  });

  els.noteForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const campaign = getActiveCampaign();
    if (!campaign) return;

    const formData = new FormData(event.currentTarget);
    const noteText = String(formData.get("noteText") || "").trim();
    if (!noteText) return;

    campaign.notes.unshift({
      id: uid("note"),
      text: noteText,
      stamp: new Date().toISOString()
    });

    event.currentTarget.reset();
    persist();
    render();
  });

  els.exportBtn.addEventListener("click", exportState);
  els.importBtn.addEventListener("click", () => els.importInput.click());
  els.importInput.addEventListener("change", importState);
  els.resetBtn.addEventListener("click", () => {
    if (!window.confirm("Clear all saved campaigns and reset VMarket to a blank state?")) return;
    state = createInitialState();
    persist();
    render();
  });
}

function handleChange(event) {
  const campaign = getActiveCampaign();
  if (!campaign) return;

  const { path, taskId, taskField, type } = event.target.dataset;
  if (path) {
    setByPath(campaign, path, castValue(event.target.value, type));
    persist();
    render();
    return;
  }

  if (!taskId || !taskField) return;
  const task = campaign.tasks.find((item) => item.id === taskId);
  if (!task) return;
  task[taskField] = castValue(event.target.value, type);
  persist();
  render();
}

function handleClick(event) {
  const brandButton = event.target.closest("[data-brand-id]");
  if (brandButton) {
    const targetBrandId = brandButton.dataset.brandId;
    const matchingCampaign = state.campaigns.find((campaign) => campaign.brandId === targetBrandId);
    if (matchingCampaign) {
      state.activeCampaignId = matchingCampaign.id;
      persist();
      render();
    }
    return;
  }

  const deleteTaskButton = event.target.closest("[data-delete-task]");
  if (deleteTaskButton) {
    const campaign = getActiveCampaign();
    if (!campaign) return;
    campaign.tasks = campaign.tasks.filter((task) => task.id !== deleteTaskButton.dataset.deleteTask);
    persist();
    render();
  }
}

function render() {
  const activeCampaign = getActiveCampaign();
  const activeBrand = activeCampaign ? getBrand(activeCampaign.brandId) : null;

  renderCampaignSelect(activeCampaign);
  renderHero(activeCampaign);
  renderBrands(activeCampaign);
  renderBrief(activeCampaign, activeBrand);
  renderMessaging(activeCampaign);
  renderChannels(activeCampaign);
  renderStatus(activeCampaign, activeBrand);
  renderTasks(activeCampaign);
  renderNotes(activeCampaign);
  els.currentContextLabel.textContent = activeCampaign
    ? `${activeBrand?.name || "Brand"} · ${activeCampaign.product}`
    : "No campaign selected";
}

function renderCampaignSelect(activeCampaign) {
  if (!state.campaigns.length) {
    els.campaignSelect.innerHTML = `<option value="">No campaigns yet</option>`;
    els.campaignSelect.disabled = true;
    return;
  }

  els.campaignSelect.disabled = false;
  els.campaignSelect.innerHTML = state.campaigns
    .map((campaign) => {
      const brand = getBrand(campaign.brandId);
      const label = `${brand?.name || "Brand"} | ${campaign.product}`;
      return `<option value="${campaign.id}" ${campaign.id === activeCampaign?.id ? "selected" : ""}>${escapeHtml(label)}</option>`;
    })
    .join("");
}

function renderHero(activeCampaign) {
  const campaignCount = state.campaigns.length;
  const liveTasks = state.campaigns.reduce(
    (sum, campaign) => sum + campaign.tasks.filter((task) => task.status === "live").length,
    0
  );
  const upcomingLaunches = state.campaigns.filter((campaign) => getDaysUntil(campaign.launchDate) >= 0).length;
  const activeProgress = activeCampaign ? Math.round(getCampaignProgress(activeCampaign)) : 0;

  const stats = [
    {
      label: "Campaigns",
      value: String(campaignCount),
      sub: campaignCount ? "Active workspaces in planning" : "Create your first campaign"
    },
    {
      label: "Progress",
      value: `${activeProgress}%`,
      sub: activeCampaign ? "Current campaign completion" : "No active campaign yet"
    },
    {
      label: "Upcoming Launches",
      value: String(upcomingLaunches),
      sub: "Campaigns with future or current launch dates"
    },
    {
      label: "Live Tasks",
      value: String(liveTasks),
      sub: "Tasks already running live"
    }
  ];

  els.heroStats.innerHTML = stats
    .map(
      (item) => `
        <article class="stat">
          <p class="stat__label">${escapeHtml(item.label)}</p>
          <p class="stat__value">${escapeHtml(item.value)}</p>
          <p class="stat__sub">${escapeHtml(item.sub)}</p>
        </article>
      `
    )
    .join("");
}

function renderBrands(activeCampaign) {
  els.portfolioGrid.innerHTML = BRANDS.map((brand) => {
    const count = state.campaigns.filter((campaign) => campaign.brandId === brand.id).length;
    return `
      <button
        class="brand-card ${activeCampaign?.brandId === brand.id ? "is-active" : ""}"
        type="button"
        data-brand-id="${brand.id}"
      >
        <p class="brand-card__title">${escapeHtml(brand.name)}</p>
        <p class="brand-card__desc">${escapeHtml(brand.description)}</p>
        <p class="brand-card__meta">${count} campaign${count === 1 ? "" : "s"} · ${escapeHtml(brand.tone)}</p>
      </button>
    `;
  }).join("");
}

function renderBrief(campaign, brand) {
  if (!campaign) {
    els.briefForm.innerHTML = emptyState("Create a campaign to start writing the brief.");
    return;
  }

  els.briefForm.innerHTML = `
    <div class="field">
      <label for="campaignProduct">Campaign / product</label>
      <input id="campaignProduct" data-path="product" value="${escapeAttr(campaign.product)}">
    </div>
    <div class="field">
      <label for="campaignStage">Stage</label>
      <select id="campaignStage" data-path="stage">
        ${renderOptions(["planning", "building", "review", "scheduled", "live"], campaign.stage)}
      </select>
    </div>
    <div class="field">
      <label for="campaignBrand">Brand</label>
      <input id="campaignBrand" value="${escapeAttr(brand?.name || "")}" disabled>
    </div>
    <div class="field">
      <label for="campaignOwner">Campaign owner</label>
      <input id="campaignOwner" data-path="owner" value="${escapeAttr(campaign.owner)}">
    </div>
    <div class="field">
      <label for="campaignLaunch">Launch date</label>
      <input id="campaignLaunch" type="date" data-path="launchDate" value="${escapeAttr(campaign.launchDate)}">
    </div>
    <div class="field">
      <label for="campaignAudienceShort">Audience label</label>
      <input id="campaignAudienceShort" data-path="audienceLabel" value="${escapeAttr(campaign.audienceLabel)}">
    </div>
    <div class="field field--full">
      <label for="campaignObjective">Objective</label>
      <textarea id="campaignObjective" rows="3" data-path="objective">${escapeHtml(campaign.objective)}</textarea>
    </div>
    <div class="field field--full">
      <label for="campaignAudience">Audience</label>
      <textarea id="campaignAudience" rows="3" data-path="audience">${escapeHtml(campaign.audience)}</textarea>
    </div>
    <div class="field field--full">
      <label for="campaignNeed">Need</label>
      <textarea id="campaignNeed" rows="3" data-path="need">${escapeHtml(campaign.need)}</textarea>
    </div>
    <div class="field field--full">
      <label for="campaignDesire">Desire</label>
      <textarea id="campaignDesire" rows="3" data-path="desire">${escapeHtml(campaign.desire)}</textarea>
    </div>
    <div class="field field--full">
      <label for="campaignValue">Value proposition</label>
      <textarea id="campaignValue" rows="3" data-path="value">${escapeHtml(campaign.value)}</textarea>
    </div>
  `;
}

function renderMessaging(campaign) {
  if (!campaign) {
    els.messageForm.innerHTML = emptyState("Select or create a campaign to define the message.");
    return;
  }

  els.messageForm.innerHTML = `
    <div class="field field--full">
      <label for="messageCore">Core message</label>
      <textarea id="messageCore" rows="3" data-path="messaging.core">${escapeHtml(campaign.messaging.core)}</textarea>
    </div>
    <div class="field field--full">
      <label for="messageSupport">Support line</label>
      <textarea id="messageSupport" rows="3" data-path="messaging.support">${escapeHtml(campaign.messaging.support)}</textarea>
    </div>
    <div class="field">
      <label for="messageCTA">Call to action</label>
      <input id="messageCTA" data-path="messaging.cta" value="${escapeAttr(campaign.messaging.cta)}">
    </div>
    <div class="field">
      <label for="messageProof">Proof point</label>
      <input id="messageProof" data-path="messaging.proof" value="${escapeAttr(campaign.messaging.proof)}">
    </div>
    <div class="field field--full">
      <label for="messageNotes">Message notes</label>
      <textarea id="messageNotes" rows="5" data-path="messaging.notes">${escapeHtml(campaign.messaging.notes)}</textarea>
    </div>
  `;
}

function renderChannels(campaign) {
  if (!campaign) {
    els.channelGrid.innerHTML = emptyState("Create a campaign to map the workstreams.");
    return;
  }

  els.channelGrid.innerHTML = CHANNELS.map((channel) => {
    const tasks = campaign.tasks.filter((task) => task.channel === channel.key);
    const progress = Math.round(getChannelProgress(tasks));
    return `
      <article class="channel-card">
        <div class="channel-card__top">
          <h4 class="channel-card__title">${escapeHtml(channel.label)}</h4>
          <span class="progress-pill">${progress}%</span>
        </div>
        <div class="channel-card__fields">
          <div class="field">
            <label for="channel-owner-${channel.key}">Owner</label>
            <input
              id="channel-owner-${channel.key}"
              data-path="channels.${channel.key}.owner"
              value="${escapeAttr(campaign.channels[channel.key].owner)}"
            >
          </div>
          <div class="field">
            <label for="channel-focus-${channel.key}">Plan</label>
            <textarea
              id="channel-focus-${channel.key}"
              rows="2"
              data-path="channels.${channel.key}.focus"
            >${escapeHtml(campaign.channels[channel.key].focus)}</textarea>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function renderStatus(campaign, brand) {
  if (!campaign) {
    els.statusPanel.innerHTML = emptyState("No campaign selected.");
    els.metricForm.innerHTML = "";
    return;
  }

  const progress = Math.round(getCampaignProgress(campaign));
  const daysUntilLaunch = getDaysUntil(campaign.launchDate);
  const launchLine =
    daysUntilLaunch > 0
      ? `${daysUntilLaunch} days until launch`
      : daysUntilLaunch === 0
        ? "Launch day is today"
        : `${Math.abs(daysUntilLaunch)} days past launch date`;

  els.statusPanel.innerHTML = `
    <div class="status-summary">
      <p class="status-summary__name">${escapeHtml(brand?.name || "Brand")} · ${escapeHtml(campaign.product)}</p>
      <p class="status-summary__line">Stage: ${escapeHtml(campaign.stage)} · ${progress}% task progress</p>
      <p class="status-summary__line">Launch: ${escapeHtml(formatDate(campaign.launchDate))} · ${escapeHtml(launchLine)}</p>
    </div>
  `;

  els.metricForm.innerHTML = METRICS.map((metric) => {
    const values = campaign.metrics[metric.key];
    const percent = Math.round(getMetricProgress(values));
    return `
      <section class="metric-card">
        <div class="metric-card__top">
          <h4>${escapeHtml(metric.label)}</h4>
          <span>${percent}% of target</span>
        </div>
        <div class="progress" aria-hidden="true">
          <span style="width:${Math.min(percent, 100)}%"></span>
        </div>
        <div class="metric-card__inputs">
          <div class="field">
            <label for="${metric.key}-target">Target ${escapeHtml(metric.unit)}</label>
            <input
              id="${metric.key}-target"
              type="number"
              min="0"
              data-path="metrics.${metric.key}.target"
              data-type="number"
              value="${escapeAttr(values.target)}"
            >
          </div>
          <div class="field">
            <label for="${metric.key}-actual">Current ${escapeHtml(metric.unit)}</label>
            <input
              id="${metric.key}-actual"
              type="number"
              min="0"
              data-path="metrics.${metric.key}.actual"
              data-type="number"
              value="${escapeAttr(values.actual)}"
            >
          </div>
        </div>
      </section>
    `;
  }).join("");
}

function renderTasks(campaign) {
  if (!campaign) {
    els.taskBoard.innerHTML = emptyState("Create a campaign to start assigning work.");
    return;
  }

  els.taskBoard.innerHTML = STATUSES.map((status) => {
    const tasks = campaign.tasks.filter((task) => task.status === status.key);
    return `
      <section class="board-column">
        <div class="board-column__head">
          <h4>${escapeHtml(status.label)}</h4>
          <span class="count">${tasks.length}</span>
        </div>
        <div class="task-stack">
          ${
            tasks.length
              ? tasks.map((task) => renderTaskCard(task)).join("")
              : emptyState("No tasks in this stage.")
          }
        </div>
      </section>
    `;
  }).join("");
}

function renderTaskCard(task) {
  return `
    <article class="task-card">
      <h5 class="task-card__title">${escapeHtml(task.title)}</h5>
      <p class="task-card__meta">${escapeHtml(getChannelLabel(task.channel))}</p>
      <div class="task-card__grid">
        <div class="task-card__row">
          <select data-task-id="${task.id}" data-task-field="status">
            ${renderOptions(STATUSES.map((status) => status.key), task.status, getStatusLabels())}
          </select>
          <select data-task-id="${task.id}" data-task-field="channel">
            ${renderOptions(CHANNELS.map((channel) => channel.key), task.channel, getChannelLabels())}
          </select>
        </div>
        <div class="task-card__row">
          <input type="date" data-task-id="${task.id}" data-task-field="due" value="${escapeAttr(task.due)}">
          <input data-task-id="${task.id}" data-task-field="owner" value="${escapeAttr(task.owner)}">
        </div>
        <button class="button button--ghost task-card__remove" type="button" data-delete-task="${task.id}">Remove</button>
      </div>
    </article>
  `;
}

function renderNotes(campaign) {
  if (!campaign) {
    els.noteList.innerHTML = emptyState("No campaign selected.");
    return;
  }

  els.noteList.innerHTML = campaign.notes.length
    ? campaign.notes
        .slice()
        .sort((left, right) => right.stamp.localeCompare(left.stamp))
        .map(
          (note) => `
            <article class="note-card">
              <p class="note-card__time">${escapeHtml(formatDateTime(note.stamp))}</p>
              <p>${escapeHtml(note.text)}</p>
            </article>
          `
        )
        .join("")
    : emptyState("No notes yet. Use this area for approvals, blockers, and updates.");
}

function createCampaign({ brandId, product, owner, launchDate }) {
  return {
    id: uid("campaign"),
    brandId,
    product,
    owner,
    launchDate,
    stage: "planning",
    audienceLabel: "",
    objective: "",
    audience: "",
    need: "",
    desire: "",
    value: "",
    messaging: {
      core: "",
      support: "",
      cta: "",
      proof: "",
      notes: ""
    },
    channels: Object.fromEntries(
      CHANNELS.map((channel) => [
        channel.key,
        {
          owner: "",
          focus: ""
        }
      ])
    ),
    metrics: {
      visibility: { target: 0, actual: 0 },
      engagement: { target: 0, actual: 0 },
      conversion: { target: 0, actual: 0 }
    },
    tasks: [],
    notes: []
  };
}

function createInitialState() {
  return {
    campaigns: [],
    activeCampaignId: null,
    lastSaved: new Date().toISOString()
  };
}

function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.campaigns)) return createInitialState();
    return {
      campaigns: parsed.campaigns,
      activeCampaignId: parsed.activeCampaignId || null,
      lastSaved: parsed.lastSaved || new Date().toISOString()
    };
  } catch {
    return createInitialState();
  }
}

function persist() {
  state.lastSaved = new Date().toISOString();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function exportState() {
  const payload = {
    brands: BRANDS,
    campaigns: state.campaigns,
    activeCampaignId: state.activeCampaignId,
    lastSaved: state.lastSaved
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `vmarket-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function importState(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const imported = JSON.parse(text);
    if (!Array.isArray(imported.campaigns)) {
      throw new Error("Invalid VMarket file.");
    }
    state = {
      campaigns: imported.campaigns,
      activeCampaignId: imported.activeCampaignId || imported.campaigns[0]?.id || null,
      lastSaved: imported.lastSaved || new Date().toISOString()
    };
    persist();
    render();
  } catch (error) {
    window.alert(error instanceof Error ? error.message : "Import failed.");
  } finally {
    event.target.value = "";
  }
}

function hydrateBrandSeedSelect() {
  els.brandSeedSelect.innerHTML = BRANDS.map(
    (brand) => `<option value="${brand.id}">${escapeHtml(brand.name)}</option>`
  ).join("");
}

function hydrateTaskChannels() {
  els.taskForm.querySelector('select[name="channel"]').innerHTML = CHANNELS.map(
    (channel) => `<option value="${channel.key}">${escapeHtml(channel.label)}</option>`
  ).join("");
}

function getActiveCampaign() {
  if (!state.activeCampaignId) return state.campaigns[0] || null;
  return state.campaigns.find((campaign) => campaign.id === state.activeCampaignId) || state.campaigns[0] || null;
}

function getBrand(brandId) {
  return BRANDS.find((brand) => brand.id === brandId) || null;
}

function getCampaignProgress(campaign) {
  if (!campaign.tasks.length) return 0;
  const total = campaign.tasks.reduce((sum, task) => sum + getStatusWeight(task.status), 0);
  return (total / campaign.tasks.length) * 100;
}

function getChannelProgress(tasks) {
  if (!tasks.length) return 0;
  const total = tasks.reduce((sum, task) => sum + getStatusWeight(task.status), 0);
  return (total / tasks.length) * 100;
}

function getMetricProgress(metric) {
  if (!metric.target) return 0;
  return (metric.actual / metric.target) * 100;
}

function getDaysUntil(dateValue) {
  if (!dateValue) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(`${dateValue}T00:00:00`);
  return Math.round((date.getTime() - today.getTime()) / 86400000);
}

function getStatusWeight(key) {
  return STATUSES.find((status) => status.key === key)?.weight || 0;
}

function getStatusLabels() {
  return Object.fromEntries(STATUSES.map((status) => [status.key, status.label]));
}

function getChannelLabels() {
  return Object.fromEntries(CHANNELS.map((channel) => [channel.key, channel.label]));
}

function getChannelLabel(key) {
  return CHANNELS.find((channel) => channel.key === key)?.label || key;
}

function renderOptions(values, current, labels = {}) {
  return values
    .map((value) => `<option value="${escapeAttr(value)}" ${value === current ? "selected" : ""}>${escapeHtml(labels[value] || value)}</option>`)
    .join("");
}

function setByPath(target, path, value) {
  const parts = path.split(".");
  let cursor = target;
  while (parts.length > 1) {
    const part = parts.shift();
    cursor = cursor[part];
  }
  cursor[parts[0]] = value;
}

function castValue(value, type) {
  if (type === "number") return Number(value || 0);
  return value;
}

function formatDate(value) {
  if (!value) return "No date set";
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function emptyState(message) {
  return `<div class="empty-state">${escapeHtml(message)}</div>`;
}

function uid(prefix) {
  const piece =
    window.crypto && typeof window.crypto.randomUUID === "function"
      ? window.crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${piece}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(value) {
  return escapeHtml(value ?? "");
}
