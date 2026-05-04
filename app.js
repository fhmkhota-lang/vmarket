const STORAGE_KEY = "vmarket-state-v4";
const AI_SETTINGS_KEY = "vmarket-claude-settings-v1";
const ANTHROPIC_VERSION = "2023-06-01";

const BRANDS = [
  {
    id: "brand-iol",
    name: "IOL",
    description: "Central planning for IOL brand and product campaigns."
  },
  {
    id: "brand-title-sites",
    name: "Title Sites",
    description: "Shared marketing planning across all title sites."
  },
  {
    id: "brand-conde-naste",
    name: "Conde Naste",
    description: "Premium campaign planning for Conde Naste products."
  }
];

const CHANNELS = [
  { key: "design", label: "Design" },
  { key: "social", label: "Social" },
  { key: "content", label: "Content" },
  { key: "visuals", label: "Visuals" },
  { key: "messaging", label: "Messaging" }
];

const CAMPAIGN_STATUSES = [
  { key: "draft", label: "Draft" },
  { key: "active", label: "Active" },
  { key: "paused", label: "Paused" },
  { key: "complete", label: "Complete" }
];

const TASK_STATUSES = [
  { key: "planned", label: "Planned", weight: 0.15 },
  { key: "in-progress", label: "In Progress", weight: 0.5 },
  { key: "review", label: "Review", weight: 0.8 },
  { key: "done", label: "Done", weight: 1 }
];

const els = {
  pageTriggers: Array.from(document.querySelectorAll("[data-page-trigger]")),
  pagePanels: Array.from(document.querySelectorAll("[data-page]")),
  heroStats: document.getElementById("heroStats"),
  exportBtn: document.getElementById("exportBtn"),
  importBtn: document.getElementById("importBtn"),
  importInput: document.getElementById("importInput"),
  resetBtn: document.getElementById("resetBtn"),
  aiSettingsForm: document.getElementById("aiSettingsForm"),
  apiKeyInput: document.getElementById("apiKeyInput"),
  modelSelect: document.getElementById("modelSelect"),
  saveClaudeSettingsBtn: document.getElementById("saveClaudeSettingsBtn"),
  aiSettingsStatusText: document.getElementById("aiSettingsStatusText"),
  strategyForm: document.getElementById("strategyForm"),
  strategyBrand: document.getElementById("strategyBrand"),
  strategyPlatformTags: document.getElementById("strategyPlatformTags"),
  strategyPlatformInput: document.getElementById("strategyPlatformInput"),
  addStrategyPlatformBtn: document.getElementById("addStrategyPlatformBtn"),
  strategyOutput: document.getElementById("strategyOutput"),
  strategyStatusText: document.getElementById("strategyStatusText"),
  campaignList: document.getElementById("campaignList"),
  campaignDetail: document.getElementById("campaignDetail")
};

let state = loadState();
let aiSettings = loadAiSettings();
let strategyPlatforms = [];
let currentPage = "strategy";

init();

function init() {
  hydrateBrandOptions();
  hydrateAiSettings();
  bindEvents();
  syncPageFromHash();
  render();
}

function bindEvents() {
  els.pageTriggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      currentPage = trigger.dataset.pageTrigger;
      location.hash = currentPage;
      renderPageState();
    });
  });

  window.addEventListener("hashchange", () => {
    syncPageFromHash();
    renderPageState();
  });

  els.aiSettingsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveClaudeSettings();
  });

  els.saveClaudeSettingsBtn.addEventListener("click", saveClaudeSettings);

  els.addStrategyPlatformBtn.addEventListener("click", addStrategyPlatformFromInput);
  els.strategyPlatformInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addStrategyPlatformFromInput();
  });

  els.strategyForm.addEventListener("submit", handleStrategySubmit);

  els.exportBtn.addEventListener("click", exportState);
  els.importBtn.addEventListener("click", () => els.importInput.click());
  els.importInput.addEventListener("change", importState);

  els.resetBtn.addEventListener("click", () => {
    if (!window.confirm("Clear all campaigns and Claude-generated strategy data?")) return;
    state = createInitialState();
    strategyPlatforms = [];
    persistState();
    render();
  });

  document.addEventListener("change", handleFieldChange);
  document.addEventListener("click", handleClickActions);
  document.addEventListener("submit", handleEmbeddedForms);
}

function syncPageFromHash() {
  const page = (location.hash || "#strategy").replace("#", "");
  currentPage = els.pagePanels.some((panel) => panel.dataset.page === page) ? page : "strategy";
}

function render() {
  renderPageState();
  renderHero();
  renderStrategyPlatformTags();
  renderStrategyOutput();
  renderCampaignList();
  renderCampaignDetail();
}

function renderPageState() {
  els.pageTriggers.forEach((trigger) => {
    trigger.classList.toggle("is-active", trigger.dataset.pageTrigger === currentPage);
  });

  els.pagePanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.page === currentPage);
  });
}

function hydrateBrandOptions() {
  els.strategyBrand.innerHTML = BRANDS.map(
    (brand) => `<option value="${brand.id}">${escapeHtml(brand.name)}</option>`
  ).join("");
}

function hydrateAiSettings() {
  els.apiKeyInput.value = aiSettings.apiKey || "";
  els.modelSelect.value = aiSettings.model || "claude-sonnet-4-20250514";
  els.aiSettingsStatusText.textContent = aiSettings.apiKey
    ? "Claude settings are already saved in this browser."
    : "Add your Claude API key, then save settings here.";
}

function saveClaudeSettings() {
  aiSettings.apiKey = els.apiKeyInput.value.trim();
  aiSettings.model = els.modelSelect.value;
  persistAiSettings();
  els.aiSettingsStatusText.textContent = aiSettings.apiKey
    ? "Claude settings saved in this browser."
    : "Claude key cleared. You can still save campaign intake manually.";
  els.strategyStatusText.textContent = aiSettings.apiKey
    ? "Claude is ready. Fill in the intake and generate strategy."
    : "Fill in the intake and generate a Claude-powered strategy.";
}

function renderHero() {
  const campaignCount = state.campaigns.length;
  const activeCount = state.campaigns.filter((campaign) => campaign.status === "active").length;
  const totalPlatforms = state.campaigns.reduce((sum, campaign) => sum + campaign.platforms.length, 0);
  const averageProgress = campaignCount
    ? Math.round(state.campaigns.reduce((sum, campaign) => sum + getCampaignProgress(campaign), 0) / campaignCount)
    : 0;

  const stats = [
    {
      label: "Campaigns",
      value: String(campaignCount),
      sub: campaignCount ? "Campaigns stored in this workspace" : "No campaigns created yet"
    },
    {
      label: "Active Campaigns",
      value: String(activeCount),
      sub: activeCount ? "Campaigns currently marked active" : "No active campaigns yet"
    },
    {
      label: "Platforms",
      value: String(totalPlatforms),
      sub: totalPlatforms ? "Mapped across all campaigns" : "No platforms added yet"
    },
    {
      label: "Task Progress",
      value: `${averageProgress}%`,
      sub: campaignCount ? "Average completion across campaign tasks" : "Task progress starts after planning"
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

function renderStrategyPlatformTags() {
  els.strategyPlatformTags.innerHTML = strategyPlatforms.length
    ? strategyPlatforms
        .map(
          (platform, index) => `
            <span class="tag">
              ${escapeHtml(platform)}
              <button type="button" data-remove-strategy-platform="${index}" aria-label="Remove ${escapeAttr(platform)}">&times;</button>
            </span>
          `
        )
        .join("")
    : `<div class="empty-state">Add one or more platforms for Claude to plan against.</div>`;
}

function renderStrategyOutput() {
  const campaign = getActiveCampaign();
  if (!campaign?.aiStrategy) {
    els.strategyOutput.innerHTML = emptyState(
      "Claude strategy output will appear here after you submit the intake."
    );
    return;
  }

  const strategy = campaign.aiStrategy;
  els.strategyOutput.innerHTML = `
    <div class="strategy-output">
      <div class="strategy-block">
        <h4>${escapeHtml(campaign.name)}</h4>
        <p>${escapeHtml(strategy.summary)}</p>
        <p><button class="button button--solid" type="button" data-open-active-campaign>Open Active Campaign</button></p>
      </div>
      <div class="strategy-block">
        <h4>Core Message</h4>
        <p>${escapeHtml(campaign.messaging.core || "Not set")}</p>
        <p>${escapeHtml(campaign.messaging.support || "")}</p>
      </div>
      <div class="strategy-block">
        <h4>Creative Direction</h4>
        <p>${escapeHtml(strategy.creativeDirection || "Not generated")}</p>
      </div>
      <div class="strategy-block">
        <h4>Platform Plan</h4>
        <ul class="strategy-list">
          ${campaign.platforms
            .map((platform) => `<li>${escapeHtml(platform.name)}: ${escapeHtml(platform.focus || "No focus set")}</li>`)
            .join("")}
        </ul>
      </div>
      <div class="strategy-block">
        <h4>Content Angles</h4>
        <ul class="strategy-list">
          ${(strategy.contentAngles || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      </div>
      <div class="strategy-block">
        <h4>Success Signals</h4>
        <ul class="strategy-list">
          ${(strategy.successSignals || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      </div>
    </div>
  `;
}

function renderCampaignList() {
  const campaigns = state.campaigns.slice();
  if (!campaigns.length) {
    els.campaignList.innerHTML = emptyState("No campaigns yet. Generate one from the AI Strategy Builder.");
    return;
  }

  els.campaignList.innerHTML = `<div class="campaign-list">${campaigns
    .map((campaign) => {
      const brand = getBrand(campaign.brandId);
      return `
        <button class="campaign-card ${campaign.id === state.activeCampaignId ? "is-active" : ""}" type="button" data-select-campaign="${campaign.id}">
          <p class="campaign-card__title">${escapeHtml(campaign.name)}</p>
          <p class="campaign-card__meta">${escapeHtml(brand?.name || "Brand")} · ${escapeHtml(getCampaignStatusLabel(campaign.status))}</p>
          <p class="campaign-card__meta">${campaign.platforms.length} platform${campaign.platforms.length === 1 ? "" : "s"} · ${campaign.tasks.length} task${campaign.tasks.length === 1 ? "" : "s"}</p>
        </button>
      `;
    })
    .join("")}</div>`;
}

function renderCampaignDetail() {
  const campaign = getActiveCampaign();
  if (!campaign) {
    els.campaignDetail.innerHTML = emptyState("Select a campaign to view and edit the campaign workspace.");
    return;
  }

  const brand = getBrand(campaign.brandId);
  const strategy = campaign.aiStrategy || null;

  els.campaignDetail.innerHTML = `
    <div class="campaign-detail">
      <div class="campaign-header">
        <div class="campaign-header__top">
          <div>
            <p class="eyebrow">${escapeHtml(brand?.name || "Brand")}</p>
            <h3>${escapeHtml(campaign.name)}</h3>
            <p class="campaign-header__meta">${escapeHtml(campaign.owner || "No owner")} · ${campaign.platforms.length} platform${campaign.platforms.length === 1 ? "" : "s"}</p>
          </div>
          <div class="field">
            <label for="campaign-status">Campaign status</label>
            <select id="campaign-status" data-path="status">
              ${renderOptions(CAMPAIGN_STATUSES.map((item) => item.key), campaign.status, getCampaignStatusLabels())}
            </select>
          </div>
        </div>
        <div class="pill-group">
          ${campaign.platforms.length
            ? campaign.platforms.map((platform) => `<span class="pill">${escapeHtml(platform.name)}</span>`).join("")
            : `<span class="pill">No platforms yet</span>`}
        </div>
      </div>

      <div class="detail-grid">
        <section class="detail-section">
          <h4>Brief</h4>
          ${renderCampaignField("Campaign name", "name", campaign.name)}
          ${renderCampaignField("Owner", "owner", campaign.owner)}
          ${renderCampaignField("Audience label", "audienceLabel", campaign.audienceLabel)}
          ${renderCampaignArea("Objective", "objective", campaign.objective)}
          ${renderCampaignArea("Audience", "audience", campaign.audience)}
          ${renderCampaignArea("Need", "need", campaign.need)}
          ${renderCampaignArea("Desire", "desire", campaign.desire)}
          ${renderCampaignArea("Value proposition", "value", campaign.value)}
        </section>

        <section class="detail-section">
          <h4>Messaging</h4>
          ${renderCampaignArea("Core message", "messaging.core", campaign.messaging.core)}
          ${renderCampaignArea("Support line", "messaging.support", campaign.messaging.support)}
          ${renderCampaignField("CTA", "messaging.cta", campaign.messaging.cta)}
          ${renderCampaignField("Proof point", "messaging.proof", campaign.messaging.proof)}
        </section>

        <section class="detail-section detail-section--full">
          <h4>Platforms</h4>
          <form class="platform-toolbar" data-platform-form>
            <input name="name" type="text" placeholder="Platform name" required>
            <input name="focus" type="text" placeholder="Focus or role for this platform">
            <input name="owner" type="text" placeholder="Platform owner">
            <button class="button button--solid" type="submit">Add Platform</button>
          </form>
          <div class="platform-list">
            ${
              campaign.platforms.length
                ? campaign.platforms.map((platform) => renderPlatformCard(platform)).join("")
                : emptyState("No platforms added to this campaign yet.")
            }
          </div>
        </section>

        <section class="detail-section detail-section--full">
          <h4>Workstreams</h4>
          <div class="detail-grid">
            ${CHANNELS.map((channel) => `
              <div class="field">
                <label for="workstream-${channel.key}">${escapeHtml(channel.label)}</label>
                <textarea id="workstream-${channel.key}" rows="3" data-path="workstreams.${channel.key}">${escapeHtml(
                  campaign.workstreams[channel.key]
                )}</textarea>
              </div>
            `).join("")}
          </div>
        </section>

        <section class="detail-section detail-section--full">
          <h4>Claude Strategy</h4>
          ${
            strategy
              ? `
                <p>${escapeHtml(strategy.summary || "No summary available.")}</p>
                <p>${escapeHtml(strategy.creativeDirection || "")}</p>
                <div class="pill-group">
                  ${(strategy.contentAngles || []).map((item) => `<span class="pill">${escapeHtml(item)}</span>`).join("")}
                </div>
              `
              : emptyState("No Claude strategy attached to this campaign yet.")
          }
        </section>

        <section class="detail-section detail-section--full">
          <h4>Task Board</h4>
          <form class="task-toolbar" data-task-form>
            <input name="title" type="text" placeholder="Task title" required>
            <select name="channel" required>
              ${CHANNELS.map((channel) => `<option value="${channel.key}">${escapeHtml(channel.label)}</option>`).join("")}
            </select>
            <input name="owner" type="text" placeholder="Owner" required>
            <button class="button button--solid" type="submit">Add Task</button>
          </form>
          <div class="task-board">
            ${TASK_STATUSES.map((status) => renderTaskColumn(campaign, status)).join("")}
          </div>
        </section>

        <section class="detail-section detail-section--full">
          <h4>Notes</h4>
          <form class="field" data-note-form>
            <textarea name="text" rows="3" placeholder="Add a note, approval, or blocker." required></textarea>
            <button class="button button--solid" type="submit">Save Note</button>
          </form>
          <div class="note-list">
            ${
              campaign.notes.length
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
                : emptyState("No notes saved for this campaign.")
            }
          </div>
        </section>
      </div>
    </div>
  `;
}

function renderPlatformCard(platform) {
  return `
    <article class="platform-card">
      <div class="platform-card__grid">
        <div class="platform-card__row">
          <input data-platform-id="${platform.id}" data-platform-field="name" value="${escapeAttr(platform.name)}">
          <input data-platform-id="${platform.id}" data-platform-field="owner" value="${escapeAttr(platform.owner || "")}" placeholder="Owner">
        </div>
        <textarea rows="2" data-platform-id="${platform.id}" data-platform-field="focus">${escapeHtml(platform.focus || "")}</textarea>
        <button class="button button--ghost button--danger" type="button" data-delete-platform="${platform.id}">Remove Platform</button>
      </div>
    </article>
  `;
}

function renderTaskColumn(campaign, status) {
  const tasks = campaign.tasks.filter((task) => task.status === status.key);
  return `
    <section class="task-column">
      <div class="task-column__head">
        <h4>${escapeHtml(status.label)}</h4>
        <span class="count">${tasks.length}</span>
      </div>
      <div class="task-stack">
        ${
          tasks.length
            ? tasks.map((task) => renderTaskCard(task)).join("")
            : emptyState("No tasks here.")
        }
      </div>
    </section>
  `;
}

function renderTaskCard(task) {
  return `
    <article class="task-card">
      <h5 class="task-card__title">${escapeHtml(task.title)}</h5>
      <p class="task-card__meta">${escapeHtml(getChannelLabel(task.channel))}</p>
      <div class="task-card__grid">
        <div class="task-card__row">
          <select data-task-id="${task.id}" data-task-field="status">
            ${renderOptions(TASK_STATUSES.map((item) => item.key), task.status, getTaskStatusLabels())}
          </select>
          <select data-task-id="${task.id}" data-task-field="channel">
            ${renderOptions(CHANNELS.map((item) => item.key), task.channel, getChannelLabels())}
          </select>
        </div>
        <div class="task-card__row">
          <input data-task-id="${task.id}" data-task-field="owner" value="${escapeAttr(task.owner)}">
          <input data-task-id="${task.id}" data-task-field="platformName" value="${escapeAttr(task.platformName || "")}" placeholder="Platform link">
        </div>
        <button class="button button--ghost button--danger" type="button" data-delete-task="${task.id}">Remove Task</button>
      </div>
    </article>
  `;
}

function renderCampaignField(label, path, value) {
  return `
    <div class="field">
      <label>${escapeHtml(label)}</label>
      <input data-path="${escapeAttr(path)}" value="${escapeAttr(value)}">
    </div>
  `;
}

function renderCampaignArea(label, path, value) {
  return `
    <div class="field">
      <label>${escapeHtml(label)}</label>
      <textarea rows="3" data-path="${escapeAttr(path)}">${escapeHtml(value)}</textarea>
    </div>
  `;
}

async function handleStrategySubmit(event) {
  event.preventDefault();

  const formData = new FormData(event.currentTarget);
  const payload = {
    brandId: String(formData.get("brandId") || "").trim(),
    campaignName: String(formData.get("campaignName") || "").trim(),
    owner: String(formData.get("owner") || "").trim(),
    audienceLabel: String(formData.get("audienceLabel") || "").trim(),
    objective: String(formData.get("objective") || "").trim(),
    audience: String(formData.get("audience") || "").trim(),
    need: String(formData.get("need") || "").trim(),
    desire: String(formData.get("desire") || "").trim(),
    value: String(formData.get("value") || "").trim(),
    tone: String(formData.get("tone") || "").trim(),
    constraints: String(formData.get("constraints") || "").trim(),
    platforms: strategyPlatforms.slice()
  };

  if (!payload.brandId || !payload.campaignName || !payload.owner) return;

  const campaign = createOrUpdateCampaignFromIntake(payload);
  state.activeCampaignId = campaign.id;
  persistState();

  if (!aiSettings.apiKey) {
    els.strategyStatusText.textContent = "Campaign saved. Add your Claude API key above to generate strategy output.";
    render();
    return;
  }

  els.strategyStatusText.textContent = "Generating strategy with Claude...";

  try {
    const strategy = await generateStrategyWithClaude(payload);
    applyStrategyToCampaign(campaign, payload, strategy);
    state.activeCampaignId = campaign.id;
    persistState();
    els.strategyStatusText.textContent = "Claude strategy generated and saved.";
    render();
  } catch (error) {
    els.strategyStatusText.textContent = error instanceof Error ? error.message : "Claude strategy generation failed.";
    render();
  }
}

function handleFieldChange(event) {
  const campaign = getActiveCampaign();
  if (!campaign) return;

  const path = event.target.dataset.path;
  if (path) {
    setByPath(campaign, path, event.target.value);
    persistState();
    render();
    return;
  }

  const platformId = event.target.dataset.platformId;
  const platformField = event.target.dataset.platformField;
  if (platformId && platformField) {
    const platform = campaign.platforms.find((item) => item.id === platformId);
    if (!platform) return;
    platform[platformField] = event.target.value;
    persistState();
    render();
    return;
  }

  const taskId = event.target.dataset.taskId;
  const taskField = event.target.dataset.taskField;
  if (taskId && taskField) {
    const task = campaign.tasks.find((item) => item.id === taskId);
    if (!task) return;
    task[taskField] = event.target.value;
    persistState();
    render();
  }
}

function handleClickActions(event) {
  const removeStrategyPlatform = event.target.closest("[data-remove-strategy-platform]");
  if (removeStrategyPlatform) {
    strategyPlatforms.splice(Number(removeStrategyPlatform.dataset.removeStrategyPlatform), 1);
    renderStrategyPlatformTags();
    return;
  }

  const selectCampaign = event.target.closest("[data-select-campaign]");
  if (selectCampaign) {
    state.activeCampaignId = selectCampaign.dataset.selectCampaign;
    currentPage = "campaigns";
    location.hash = "campaigns";
    persistState();
    render();
    return;
  }

  const deletePlatform = event.target.closest("[data-delete-platform]");
  if (deletePlatform) {
    const campaign = getActiveCampaign();
    if (!campaign) return;
    campaign.platforms = campaign.platforms.filter((item) => item.id !== deletePlatform.dataset.deletePlatform);
    persistState();
    render();
    return;
  }

  const deleteTask = event.target.closest("[data-delete-task]");
  if (deleteTask) {
    const campaign = getActiveCampaign();
    if (!campaign) return;
    campaign.tasks = campaign.tasks.filter((item) => item.id !== deleteTask.dataset.deleteTask);
    persistState();
    render();
    return;
  }

  const openActiveCampaign = event.target.closest("[data-open-active-campaign]");
  if (openActiveCampaign) {
    currentPage = "campaigns";
    location.hash = "campaigns";
    render();
  }
}

function handleEmbeddedForms(event) {
  const campaign = getActiveCampaign();
  if (!campaign) return;

  const platformForm = event.target.closest("[data-platform-form]");
  if (platformForm) {
    event.preventDefault();
    const formData = new FormData(platformForm);
    const name = String(formData.get("name") || "").trim();
    if (!name) return;
    campaign.platforms.push({
      id: uid("platform"),
      name,
      focus: String(formData.get("focus") || "").trim(),
      owner: String(formData.get("owner") || "").trim()
    });
    persistState();
    render();
    return;
  }

  const taskForm = event.target.closest("[data-task-form]");
  if (taskForm) {
    event.preventDefault();
    const formData = new FormData(taskForm);
    const title = String(formData.get("title") || "").trim();
    const channel = String(formData.get("channel") || "").trim();
    const owner = String(formData.get("owner") || "").trim();
    if (!title || !channel || !owner) return;
    campaign.tasks.unshift({
      id: uid("task"),
      title,
      channel,
      owner,
      platformName: "",
      status: "planned"
    });
    persistState();
    render();
    return;
  }

  const noteForm = event.target.closest("[data-note-form]");
  if (noteForm) {
    event.preventDefault();
    const formData = new FormData(noteForm);
    const text = String(formData.get("text") || "").trim();
    if (!text) return;
    campaign.notes.unshift({
      id: uid("note"),
      text,
      stamp: new Date().toISOString()
    });
    persistState();
    render();
  }
}

function addStrategyPlatformFromInput() {
  const value = els.strategyPlatformInput.value.trim();
  if (!value) return;
  strategyPlatforms.push(value);
  els.strategyPlatformInput.value = "";
  renderStrategyPlatformTags();
}

function createOrUpdateCampaignFromIntake(payload) {
  const existing = state.campaigns.find(
    (campaign) => campaign.name.toLowerCase() === payload.campaignName.toLowerCase() && campaign.brandId === payload.brandId
  );

  if (existing) {
    existing.owner = payload.owner;
    existing.audienceLabel = payload.audienceLabel;
    existing.objective = payload.objective;
    existing.audience = payload.audience;
    existing.need = payload.need;
    existing.desire = payload.desire;
    existing.value = payload.value;
    existing.tone = payload.tone;
    existing.constraints = payload.constraints;
    mergePlatforms(existing, payload.platforms.map((name) => ({ name, focus: "", owner: "" })));
    return existing;
  }

  const campaign = {
    id: uid("campaign"),
    brandId: payload.brandId,
    name: payload.campaignName,
    owner: payload.owner,
    status: "active",
    audienceLabel: payload.audienceLabel,
    objective: payload.objective,
    audience: payload.audience,
    need: payload.need,
    desire: payload.desire,
    value: payload.value,
    tone: payload.tone,
    constraints: payload.constraints,
    messaging: {
      core: "",
      support: "",
      cta: "",
      proof: ""
    },
    workstreams: Object.fromEntries(CHANNELS.map((channel) => [channel.key, ""])),
    platforms: payload.platforms.map((name) => ({
      id: uid("platform"),
      name,
      focus: "",
      owner: ""
    })),
    tasks: [],
    notes: [],
    aiStrategy: null
  };

  state.campaigns.unshift(campaign);
  return campaign;
}

function applyStrategyToCampaign(campaign, payload, strategy) {
  campaign.status = "active";
  campaign.owner = payload.owner;
  campaign.audienceLabel = payload.audienceLabel;
  campaign.objective = strategy.objective || payload.objective;
  campaign.audience = strategy.audience || payload.audience;
  campaign.need = strategy.need || payload.need;
  campaign.desire = strategy.desire || payload.desire;
  campaign.value = strategy.value || payload.value;
  campaign.tone = payload.tone;
  campaign.constraints = payload.constraints;
  campaign.messaging.core = strategy.messaging?.core || "";
  campaign.messaging.support = strategy.messaging?.support || "";
  campaign.messaging.cta = strategy.messaging?.cta || "";
  campaign.messaging.proof = strategy.messaging?.proof || "";

  CHANNELS.forEach((channel) => {
    campaign.workstreams[channel.key] = strategy.workstreams?.[channel.key] || campaign.workstreams[channel.key] || "";
  });

  mergePlatforms(campaign, strategy.platforms || payload.platforms.map((name) => ({ name, focus: "", owner: "" })));

  campaign.aiStrategy = {
    summary: strategy.summary || "",
    creativeDirection: strategy.creativeDirection || "",
    contentAngles: Array.isArray(strategy.contentAngles) ? strategy.contentAngles : [],
    successSignals: Array.isArray(strategy.successSignals) ? strategy.successSignals : [],
    generatedAt: new Date().toISOString()
  };

  const suggestedTasks = Array.isArray(strategy.taskSuggestions) ? strategy.taskSuggestions : [];
  if (!campaign.tasks.length && suggestedTasks.length) {
    campaign.tasks = suggestedTasks.map((task) => ({
      id: uid("task"),
      title: task.title || "New task",
      channel: CHANNELS.some((channel) => channel.key === task.channel) ? task.channel : "content",
      owner: task.owner || campaign.owner,
      platformName: task.platform || "",
      status: "planned"
    }));
  }
}

function mergePlatforms(campaign, platformItems) {
  const existingByName = new Map(campaign.platforms.map((platform) => [platform.name.toLowerCase(), platform]));
  platformItems.forEach((item) => {
    const name = typeof item === "string" ? item : item.name;
    if (!name) return;
    const key = name.toLowerCase();
    const existing = existingByName.get(key);
    if (existing) {
      if (typeof item !== "string") {
        existing.focus = item.focus || existing.focus;
        existing.owner = item.owner || existing.owner;
      }
      return;
    }
    campaign.platforms.push({
      id: uid("platform"),
      name,
      focus: typeof item === "string" ? "" : item.focus || "",
      owner: typeof item === "string" ? "" : item.owner || ""
    });
  });
}

async function generateStrategyWithClaude(payload) {
  const prompt = buildStrategyPrompt(payload);
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": aiSettings.apiKey,
      "anthropic-version": ANTHROPIC_VERSION
    },
    body: JSON.stringify({
      model: aiSettings.model || "claude-sonnet-4-20250514",
      max_tokens: 2200,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const text = extractClaudeText(data);
  const parsed = parseJsonBlock(text);
  if (!parsed) {
    throw new Error("Claude response did not return valid JSON.");
  }
  return parsed;
}

function buildStrategyPrompt(payload) {
  return [
    "You are building a marketing strategy for a campaign planning dashboard.",
    "Return valid JSON only. No markdown fences. No explanation outside the JSON.",
    "Use this exact schema:",
    JSON.stringify({
      summary: "string",
      objective: "string",
      audience: "string",
      need: "string",
      desire: "string",
      value: "string",
      messaging: {
        core: "string",
        support: "string",
        cta: "string",
        proof: "string"
      },
      creativeDirection: "string",
      platforms: [{ name: "string", focus: "string", owner: "string" }],
      workstreams: {
        design: "string",
        social: "string",
        content: "string",
        visuals: "string",
        messaging: "string"
      },
      contentAngles: ["string", "string", "string"],
      successSignals: ["string", "string", "string"],
      taskSuggestions: [{ title: "string", channel: "design|social|content|visuals|messaging", owner: "string", platform: "string" }]
    }),
    "Campaign input:",
    JSON.stringify({
      brand: getBrand(payload.brandId)?.name || "",
      campaignName: payload.campaignName,
      owner: payload.owner,
      audienceLabel: payload.audienceLabel,
      objective: payload.objective,
      audience: payload.audience,
      need: payload.need,
      desire: payload.desire,
      value: payload.value,
      tone: payload.tone,
      constraints: payload.constraints,
      platforms: payload.platforms
    })
  ].join("\n");
}

function extractClaudeText(data) {
  return (data.content || [])
    .filter((item) => item.type === "text" && item.text)
    .map((item) => item.text)
    .join("\n")
    .trim();
}

function parseJsonBlock(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function exportState() {
  const payload = {
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
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed.campaigns)) throw new Error("Invalid VMarket export.");
    state = {
      campaigns: parsed.campaigns,
      activeCampaignId: parsed.activeCampaignId || parsed.campaigns[0]?.id || null,
      lastSaved: parsed.lastSaved || new Date().toISOString()
    };
    persistState();
    render();
  } catch (error) {
    window.alert(error instanceof Error ? error.message : "Import failed.");
  } finally {
    event.target.value = "";
  }
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

function loadAiSettings() {
  try {
    const raw = window.localStorage.getItem(AI_SETTINGS_KEY);
    if (!raw) return { apiKey: "", model: "claude-sonnet-4-20250514" };
    const parsed = JSON.parse(raw);
    return {
      apiKey: parsed.apiKey || "",
      model: parsed.model || "claude-sonnet-4-20250514"
    };
  } catch {
    return { apiKey: "", model: "claude-sonnet-4-20250514" };
  }
}

function persistState() {
  state.lastSaved = new Date().toISOString();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function persistAiSettings() {
  window.localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(aiSettings));
}

function createInitialState() {
  return {
    campaigns: [],
    activeCampaignId: null,
    lastSaved: new Date().toISOString()
  };
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
  const total = campaign.tasks.reduce((sum, task) => sum + getTaskWeight(task.status), 0);
  return (total / campaign.tasks.length) * 100;
}

function getTaskWeight(key) {
  return TASK_STATUSES.find((status) => status.key === key)?.weight || 0;
}

function getCampaignStatusLabel(key) {
  return CAMPAIGN_STATUSES.find((status) => status.key === key)?.label || key;
}

function getCampaignStatusLabels() {
  return Object.fromEntries(CAMPAIGN_STATUSES.map((status) => [status.key, status.label]));
}

function getTaskStatusLabels() {
  return Object.fromEntries(TASK_STATUSES.map((status) => [status.key, status.label]));
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
