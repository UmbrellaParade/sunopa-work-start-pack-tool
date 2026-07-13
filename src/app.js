const DEFAULT_OBSIDIAN_FOLDER = String.raw`C:\Users\myabe\OneDrive\Desktop\Obsidian Folder\Umbrella Parade\Sunoパ！記事`;
const APPLICANT_AUDIO_BASE = String.raw`C:\Users\myabe\OneDrive\Desktop\ポン出し音源一覧\応募楽曲`;
const GUEST_AUDIO_BASE = String.raw`C:\Users\myabe\OneDrive\Desktop\ポン出し音源一覧\ゲスト楽曲`;
const STORAGE_KEY = "sunopa-work-start-pack-tool:v2";
const MANY_APPLICANTS_THRESHOLD = 8;
const activeSongFields = [
  "name",
  "title",
  "ai_artist",
  "song_url",
  "audio_path",
  "icon_path",
  "thumbnail_source",
  "article_points",
  "x_url",
];

const songTypes = ["ゲスト曲", "かなめ🦐曲", "べるぼ☂曲", "応募者曲"];
const songFields = [
  { key: "slot_no", label: "slot_no", type: "number", className: "" },
  { key: "song_type", label: "曲の種別", type: "select", className: "" },
  { key: "name", label: "名前", type: "text", className: "" },
  { key: "title", label: "曲名", type: "text", className: "wide" },
  { key: "ai_artist", label: "AIアーティスト名", type: "text", className: "" },
  { key: "song_url", label: "楽曲URL", type: "url", className: "wide" },
  { key: "url_type", label: "URL種別", type: "selectUrl", className: "" },
  { key: "audio_path", label: "音源ファイルパス", type: "text", className: "wide" },
  { key: "icon_path", label: "アイコン画像パス", type: "text", className: "wide" },
  { key: "thumbnail_source", label: "楽曲サムネ取得元", type: "text", className: "wide" },
  { key: "article_points", label: "記事で触れるポイント", type: "textarea", className: "full" },
  { key: "x_url", label: "X URL", type: "url", className: "wide" },
];

const fieldAliases = {
  slot_no: ["slot_no", "slot", "no", "番号", "順番", "枠"],
  song_type: ["曲の種別", "種別", "type", "song_type", "曲種別"],
  name: ["名前", "応募者名", "ゲスト名", "name", "artist", "user", "ユーザー名"],
  title: ["曲名", "楽曲タイトル", "title", "song_title", "楽曲名"],
  ai_artist: ["AIアーティスト名", "アーティスト名", "artist_name", "ai_artist", "AIアーティスト"],
  song_url: ["楽曲URL", "url", "song_url", "YouTube URL", "Suno URL", "リンク"],
  url_type: ["URL種別", "url_type", "種別URL", "媒体"],
  audio_path: ["音源ファイルパス", "音源パス", "audio_path", "音源ファイル", "音源"],
  icon_path: ["アイコン画像パス", "アイコン", "icon_path", "画像パス"],
  thumbnail_source: ["楽曲サムネ取得元", "サムネ取得元", "thumbnail_source", "サムネ", "thumbnail"],
  article_points: ["記事で触れるポイント", "ポイント", "article_points", "紹介ポイント", "メモ"],
  x_url: ["X URL", "x_url", "Twitter URL", "SNS URL"],
};

const checklistItems = [
  "Radio-Article-Studioの情報を正本として確認",
  "YouTube/Suno URLを埋め込み形式に変換",
  "音源を所定フォルダーに保存",
  "SE_Ponの 🎵 放送「曲・BGM」 に順番通り登録",
  "SE_Pon登録曲をすべてリピートON",
  "記事に全曲埋め込み",
  "16:9サムネを各曲紹介見出し直下に配置",
  "WordPress下書き確認",
  "作業メモや内部注記を削除",
  "SNS投稿文を作成",
  "告知漫画案を作成",
];

const state = {
  hasGenerated: false,
  songs: [],
};

const elements = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  restoreDraft();
  bindEvents();
  syncAudioDestinations();
  renderSongs();
  refreshLivePreview();
  renderOutputState();
});

function cacheElements() {
  [
    "packForm",
    "broadcastName",
    "articleType",
    "snsManga",
    "audioOrganize",
    "sePonRegister",
    "applicantLimit",
    "applicantSavePath",
    "guestSavePath",
    "sePonPreview",
    "songList",
    "songCount",
    "importText",
    "issueBox",
    "issueList",
    "outputPlaceholder",
    "outputText",
    "statusLine",
  ].forEach((id) => {
    elements[id] = document.getElementById(id);
  });
}

function bindEvents() {
  document.getElementById("addSong").addEventListener("click", addBlankSong);
  document.getElementById("addSongTop").addEventListener("click", addBlankSong);
  document.getElementById("applyGuestTemplate").addEventListener("click", applyGuestTemplate);
  document.getElementById("applyListenerTemplate").addEventListener("click", applyListenerTemplate);
  document.getElementById("importSongs").addEventListener("click", importSongsFromText);
  document.getElementById("generateOutput").addEventListener("click", () => generateAndRender("生成しました"));
  document.getElementById("generateTop").addEventListener("click", () => generateAndRender("生成しました"));
  document.getElementById("copyOutput").addEventListener("click", copyOutput);

  elements.packForm.addEventListener("input", (event) => {
    if (event.target.id === "broadcastName") {
      syncAudioDestinations();
    }
    if (event.target.id === "audioOrganize") {
      setScopeChecked("audio", event.target.value === "する");
    }
    if (event.target.id === "sePonRegister") {
      setScopeChecked("sepon", event.target.value === "する");
    }
    persistDraft();
    refreshLivePreview();
  });

  elements.packForm.addEventListener("change", (event) => {
    if (event.target.name === "articleType") {
      refreshLivePreview();
    }
    if (event.target.id === "snsManga") {
      const enabled = event.target.value === "作る";
      setScopeChecked("sns", enabled);
      setScopeChecked("manga", enabled);
    }
    persistDraft();
    refreshLivePreview();
  });

  elements.songList.addEventListener("input", (event) => {
    const target = event.target;
    const id = target.dataset.songId;
    const field = target.dataset.field;
    if (!id || !field) return;

    const song = state.songs.find((item) => item.id === id);
    if (!song) return;

    song[field] = target.value;
    if (field === "song_url" && !song.url_type) {
      song.url_type = inferUrlType(target.value);
      renderSongs();
    }
    persistDraft();
    refreshLivePreview();
  });

  elements.songList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = button.dataset.songId;
    const index = state.songs.findIndex((item) => item.id === id);
    if (index < 0) return;

    if (button.dataset.action === "delete") {
      state.songs.splice(index, 1);
    }
    if (button.dataset.action === "up" && index > 0) {
      [state.songs[index - 1], state.songs[index]] = [state.songs[index], state.songs[index - 1]];
    }
    if (button.dataset.action === "down" && index < state.songs.length - 1) {
      [state.songs[index + 1], state.songs[index]] = [state.songs[index], state.songs[index + 1]];
    }

    renderSongs();
    persistDraft();
    refreshLivePreview();
  });
}

function createSong(overrides = {}) {
  return {
    id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    slot_no: "",
    song_type: "応募者曲",
    name: "",
    title: "",
    ai_artist: "",
    song_url: "",
    url_type: "",
    audio_path: "",
    icon_path: "",
    thumbnail_source: "",
    article_points: "",
    x_url: "",
    ...overrides,
  };
}

function addBlankSong() {
  state.songs.push(
    createSong({
      slot_no: String(nextSlotNumber()),
      song_type: getArticleType() === "ゲスト回" ? "応募者曲" : "応募者曲",
    }),
  );
  renderSongs();
  persistDraft();
  refreshLivePreview();
  showStatus("楽曲を追加しました");
}

function applyGuestTemplate() {
  state.songs = [
    createSong({ slot_no: "1", song_type: "ゲスト曲" }),
    createSong({ slot_no: "2", song_type: "かなめ🦐曲" }),
    createSong({ slot_no: "3", song_type: "べるぼ☂曲" }),
    createSong({ slot_no: "4", song_type: "ゲスト曲" }),
    createSong({ slot_no: "5", song_type: "応募者曲" }),
  ];
  setArticleType("ゲスト回");
  renderSongs();
  persistDraft();
  refreshLivePreview();
  showStatus("ゲスト回の曲枠を作りました。これは初期枠なので、必要な曲数に合わせて追加・削除してください");
}

function applyListenerTemplate() {
  state.songs = [
    createSong({ slot_no: "1", song_type: "応募者曲" }),
    createSong({ slot_no: "2", song_type: "応募者曲" }),
    createSong({ slot_no: "3", song_type: "応募者曲" }),
    createSong({ slot_no: "4", song_type: "応募者曲" }),
    createSong({ slot_no: "5", song_type: "かなめ🦐曲" }),
    createSong({ slot_no: "6", song_type: "べるぼ☂曲" }),
  ];
  setArticleType("リスナー応募楽曲オンエアー回");
  renderSongs();
  persistDraft();
  refreshLivePreview();
  showStatus("リスナー回の曲枠を作りました。これは初期枠なので、応募曲数に合わせて追加・削除してください");
}

function nextSlotNumber() {
  const nums = state.songs.map((song) => Number(song.slot_no)).filter(Number.isFinite);
  return nums.length ? Math.max(...nums) + 1 : 1;
}

function renderSongs() {
  elements.songList.innerHTML = "";
  const activeCount = countActiveSongs(state.songs);
  elements.songCount.textContent = `${state.songs.length}枠・入力済み${activeCount}曲（曲数は回ごとに可変）`;

  if (!state.songs.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "楽曲が未登録です。CSV/JSONを取り込むか、必要な曲数だけ追加してください。";
    elements.songList.append(empty);
    return;
  }

  state.songs.forEach((song, index) => {
    const card = document.createElement("article");
    card.className = "song-card";

    const header = document.createElement("div");
    header.className = "song-header";

    const title = document.createElement("p");
    title.className = "song-title";
    title.textContent = `${index + 1}. ${song.title || song.name || "未入力の楽曲"}`;
    header.append(title);

    const actions = document.createElement("div");
    actions.className = "song-actions";
    actions.append(
      makeActionButton("up", "↑", "上へ", song.id),
      makeActionButton("down", "↓", "下へ", song.id),
      makeActionButton("delete", "削除", "削除", song.id, "danger-button"),
    );
    header.append(actions);
    card.append(header);

    const fields = document.createElement("div");
    fields.className = "song-fields";

    songFields.forEach((field) => {
      const label = document.createElement("label");
      if (field.className) label.classList.add(field.className);

      const span = document.createElement("span");
      span.textContent = field.label;
      label.append(span);

      const control = createSongControl(song, field);
      label.append(control);
      fields.append(label);
    });

    card.append(fields);
    elements.songList.append(card);
  });
}

function makeActionButton(action, text, title, songId, extraClass = "") {
  const button = document.createElement("button");
  button.className = `icon-button ${extraClass}`.trim();
  button.type = "button";
  button.dataset.action = action;
  button.dataset.songId = songId;
  button.title = title;
  button.textContent = text;
  return button;
}

function createSongControl(song, field) {
  let control;

  if (field.type === "textarea") {
    control = document.createElement("textarea");
    control.rows = 2;
  } else if (field.type === "select") {
    control = document.createElement("select");
    songTypes.forEach((type) => {
      const option = document.createElement("option");
      option.value = type;
      option.textContent = type;
      control.append(option);
    });
  } else if (field.type === "selectUrl") {
    control = document.createElement("select");
    ["", "YouTube", "Suno"].forEach((type) => {
      const option = document.createElement("option");
      option.value = type;
      option.textContent = type || "未指定";
      control.append(option);
    });
  } else {
    control = document.createElement("input");
    control.type = field.type;
  }

  control.dataset.songId = song.id;
  control.dataset.field = field.key;
  control.value = song[field.key] || "";
  return control;
}

function getArticleType() {
  return document.querySelector('input[name="articleType"]:checked')?.value || "ゲスト回";
}

function setArticleType(value) {
  const radio = document.querySelector(`input[name="articleType"][value="${value}"]`);
  if (radio) radio.checked = true;
}

function setScopeChecked(scope, checked) {
  const checkbox = document.querySelector(`[data-scope="${scope}"]`);
  if (checkbox) checkbox.checked = checked;
}

function syncAudioDestinations() {
  const broadcastName = elements.broadcastName.value.trim() || "{{放送回名}}";
  elements.applicantSavePath.value = `${APPLICANT_AUDIO_BASE}\\${broadcastName}\\`;
  elements.guestSavePath.value = `${GUEST_AUDIO_BASE}\\${broadcastName}\\`;
}

function generateAndRender(status = "") {
  state.hasGenerated = true;
  refreshLivePreview();
  renderOutputState();
  if (status) showStatus(status);
}

function refreshLivePreview() {
  const values = getFormValues();
  const songs = getActiveSongs();
  const confirmationItems = buildConfirmationItems(values, songs);

  renderSePonPreview(values, songs);
  renderIssueBox(confirmationItems);

  if (state.hasGenerated) {
    elements.outputText.value = composePack(values, songs, confirmationItems);
  }
}

function renderOutputState() {
  elements.outputPlaceholder.hidden = state.hasGenerated;
  elements.outputText.hidden = !state.hasGenerated;
  document.getElementById("copyOutput").disabled = !state.hasGenerated;
}

function renderIssueBox(items) {
  elements.issueList.innerHTML = "";
  elements.issueBox.hidden = !items.length;

  items.forEach((item) => {
    const listItem = document.createElement("li");
    listItem.textContent = item;
    elements.issueList.append(listItem);
  });
}

function composePack(values = getFormValues(), songs = getActiveSongs(), confirmationItems = buildConfirmationItems(values, songs)) {
  const sePonOrder = buildSePonOrder(songs, values.articleType, values.applicantLimit);

  return [
    "Sunoパ！の作業開始パックです。",
    "以下の資料を読んで、この放送回の作業を進めてください。",
    "",
    "読むフォルダー:",
    DEFAULT_OBSIDIAN_FOLDER,
    "",
    "記事タイプ:",
    values.articleType,
    "",
    "放送回名:",
    values.broadcastName || "未入力",
    "",
    "放送日:",
    values.broadcastDate || "未入力",
    "",
    "stand.fm URL:",
    values.standFmUrl || "未入力",
    "",
    "Radio-Article-StudioのCodexパック:",
    values.rasPack || "未入力",
    "",
    "スプレッドシートURLまたはCSVパス:",
    values.spreadsheetSource || "未入力",
    "",
    "WordPress:",
    `投稿先WordPressサイト: ${values.wordpressSite || "未入力"}`,
    `WordPress方針: ${values.wordpressPolicy}`,
    `SNS・漫画: ${values.snsManga}`,
    "",
    "作業範囲:",
    ...values.workScopes.map((item) => `[${item.checked ? "x" : " "}] ${item.label}`),
    "",
    "音源整理:",
    `音源整理: ${values.audioOrganize}`,
    `音源ファイルの場所: ${values.audioSource || "未入力"}`,
    `音源種別: ${values.audioType}`,
    "",
    "音源保存:",
    `応募楽曲: ${values.applicantSavePath}`,
    `ゲスト楽曲: ${values.guestSavePath}`,
    "",
    "SE_Pon:",
    `SE_Pon登録: ${values.sePonRegister}`,
    `登録先: ${values.sePonTarget || "🎵 放送「曲・BGM」"}`,
    `全曲リピートON: ${values.repeatAll ? "はい" : "いいえ"}`,
    values.applicantLimit ? `応募者曲 登録ここまで: ${values.applicantLimit}曲目まで` : "応募者曲 登録ここまで: 未指定",
    "",
    "SE_Pon登録順:",
    ...(sePonOrder.length ? sePonOrder.map((song, index) => `${index + 1}. ${formatSongBrief(song)}`) : ["入力済みの楽曲はまだありません"]),
    "",
    "楽曲データ:",
    ...(songs.length ? songs.flatMap(formatSongDetail) : ["未入力"]),
    "",
    "楽曲紹介サムネ:",
    "- ゲスト曲: ゲストアイコン + Suno/YouTubeサムネで16:9",
    "- 応募者曲: 応募者アイコン + Suno/YouTubeサムネで16:9",
    "- かなめ🦐/べるぼ☂曲: Suno/YouTubeサムネをベースに16:9",
    "",
    "曲別サムネ制作指示:",
    ...(songs.length ? songs.map(formatThumbnailInstruction) : ["- 未入力"]),
    "",
    "確認してほしいこと:",
    ...(confirmationItems.length ? confirmationItems.map((item) => `- ${item}`) : ["- 追加確認なし"]),
    "",
    "作業後チェックリスト:",
    ...checklistItems.map((item) => `[ ] ${item}`),
  ].join("\n");
}

function getFormValues() {
  return {
    broadcastName: readValue("broadcastName"),
    broadcastDate: readValue("broadcastDate"),
    articleType: getArticleType(),
    standFmUrl: readValue("standFmUrl"),
    rasPack: readValue("rasPack"),
    spreadsheetSource: readValue("spreadsheetSource"),
    wordpressSite: readValue("wordpressSite"),
    wordpressPolicy: readValue("wordpressPolicy"),
    snsManga: readValue("snsManga"),
    audioOrganize: readValue("audioOrganize"),
    audioSource: readValue("audioSource"),
    audioType: readValue("audioType"),
    applicantSavePath: readValue("applicantSavePath"),
    guestSavePath: readValue("guestSavePath"),
    sePonRegister: readValue("sePonRegister"),
    sePonTarget: readValue("sePonTarget"),
    applicantLimit: Number(readValue("applicantLimit")) || 0,
    repeatAll: document.getElementById("repeatAll").checked,
    workScopes: Array.from(document.querySelectorAll("[data-scope]")).map((checkbox) => ({
      label: checkbox.dataset.label,
      checked: checkbox.checked,
    })),
  };
}

function readValue(id) {
  return document.getElementById(id).value.trim();
}

function getActiveSongs() {
  return state.songs
    .map((song) => normalizeSong(song))
    .filter(isSongActive);
}

function countActiveSongs(songs) {
  return songs.map((song) => normalizeSong(song)).filter(isSongActive).length;
}

function isSongActive(song) {
  return activeSongFields.some((field) => String(song[field] || "").trim());
}

function normalizeSong(song) {
  return {
    ...song,
    slot_no: String(song.slot_no || "").trim(),
    song_type: normalizeSongType(song.song_type),
    name: String(song.name || "").trim(),
    title: String(song.title || "").trim(),
    ai_artist: String(song.ai_artist || "").trim(),
    song_url: String(song.song_url || "").trim(),
    url_type: String(song.url_type || inferUrlType(song.song_url)).trim(),
    audio_path: String(song.audio_path || "").trim(),
    icon_path: String(song.icon_path || "").trim(),
    thumbnail_source: String(song.thumbnail_source || "").trim(),
    article_points: String(song.article_points || "").trim(),
    x_url: String(song.x_url || "").trim(),
  };
}

function normalizeSongType(type) {
  const value = String(type || "").trim();
  if (value.includes("ゲスト")) return "ゲスト曲";
  if (value.includes("かなめ")) return "かなめ🦐曲";
  if (value.includes("べるぼ")) return "べるぼ☂曲";
  if (value.includes("応募")) return "応募者曲";
  return songTypes.includes(value) ? value : "応募者曲";
}

function inferUrlType(url) {
  const value = String(url || "").toLowerCase();
  if (value.includes("youtube.com") || value.includes("youtu.be")) return "YouTube";
  if (value.includes("suno.com")) return "Suno";
  return "";
}

function buildSePonOrder(songs, articleType, applicantLimit) {
  const sorted = sortSongsBySlot(songs);
  if (articleType !== "ゲスト回") {
    return sorted;
  }

  const guestSongs = sorted.filter((song) => song.song_type === "ゲスト曲");
  const kanameSongs = sorted.filter((song) => song.song_type === "かなめ🦐曲");
  const bellboSongs = sorted.filter((song) => song.song_type === "べるぼ☂曲");
  const applicantSongs = sorted.filter((song) => song.song_type === "応募者曲");
  const limitedApplicants = applicantLimit > 0 ? applicantSongs.slice(0, applicantLimit) : applicantSongs;

  const ordered = [
    guestSongs[0],
    kanameSongs[0],
    bellboSongs[0],
    guestSongs[1],
    ...limitedApplicants,
  ].filter(Boolean);

  const orderedIds = new Set(ordered.map((song) => song.id));
  const remaining = sorted.filter((song) => !orderedIds.has(song.id));
  return [...ordered, ...remaining];
}

function sortSongsBySlot(songs) {
  return [...songs].sort((a, b) => {
    const aNo = Number(a.slot_no);
    const bNo = Number(b.slot_no);
    if (Number.isFinite(aNo) && Number.isFinite(bNo) && aNo !== bNo) return aNo - bNo;
    if (Number.isFinite(aNo) && !Number.isFinite(bNo)) return -1;
    if (!Number.isFinite(aNo) && Number.isFinite(bNo)) return 1;
    return 0;
  });
}

function renderSePonPreview(values = getFormValues(), songs = getActiveSongs()) {
  const order = buildSePonOrder(songs, values.articleType, values.applicantLimit);

  elements.sePonPreview.innerHTML = "";
  if (!order.length) {
    const item = document.createElement("li");
    item.textContent = "入力済みの楽曲はまだありません";
    elements.sePonPreview.append(item);
    return;
  }

  order.forEach((song) => {
    const item = document.createElement("li");
    item.textContent = formatSongBrief(song);
    elements.sePonPreview.append(item);
  });
}

function formatSongBrief(song) {
  const title = song.title || "曲名未入力";
  const owner = song.name || song.ai_artist || "名前未入力";
  return `${title}（${owner} / ${song.song_type}）`;
}

function formatSongDetail(song, index) {
  return [
    `${index + 1}. slot_no: ${song.slot_no || "-"}`,
    `   曲の種別: ${song.song_type || "-"}`,
    `   名前: ${song.name || "-"}`,
    `   曲名: ${song.title || "-"}`,
    `   AIアーティスト名: ${song.ai_artist || "-"}`,
    `   楽曲URL: ${song.song_url || "-"}`,
    `   URL種別: ${song.url_type || "-"}`,
    `   音源ファイルパス: ${song.audio_path || "-"}`,
    `   アイコン画像パス: ${song.icon_path || "-"}`,
    `   楽曲サムネ取得元: ${song.thumbnail_source || "-"}`,
    `   記事で触れるポイント: ${song.article_points || "-"}`,
    `   X URL: ${song.x_url || "-"}`,
  ];
}

function formatThumbnailInstruction(song) {
  const subject = song.title || song.name || `slot ${song.slot_no || "-"}`;
  const base = song.thumbnail_source || song.song_url || "Suno/YouTubeサムネ";

  if (song.song_type === "ゲスト曲") {
    return `- ${subject}: ゲストアイコン（${song.icon_path || "未入力"}）+ ${base} で16:9`;
  }
  if (song.song_type === "応募者曲") {
    return `- ${subject}: 応募者アイコン（${song.icon_path || "未入力"}）+ ${base} で16:9`;
  }
  return `- ${subject}: ${base} をベースに16:9`;
}

function buildConfirmationItems(values, songs) {
  const items = [];
  const applicantCount = songs.filter((song) => song.song_type === "応募者曲").length;
  const missingUrlSongs = songs.filter((song) => !song.song_url);
  const missingAudioSongs = songs.filter((song) => !song.audio_path);
  const missingTitleSongs = songs.filter((song) => !song.title).length;
  const missingNameSongs = songs.filter((song) => !song.name && !song.ai_artist).length;

  if (!values.broadcastName) items.push("放送回名が未入力です。");
  if (!values.standFmUrl) items.push("stand.fm URLが未入力です。");
  if (!values.rasPack) items.push("Radio-Article-StudioのCodexパックが未入力です。");
  if (!songs.length) items.push("楽曲データが未入力です。");
  if (missingTitleSongs) items.push(`曲名未入力が${missingTitleSongs}曲あります。`);
  if (missingNameSongs) items.push(`名前またはAIアーティスト名が未入力の曲が${missingNameSongs}曲あります。`);
  if (values.audioOrganize === "する" && !values.audioSource) items.push("音源ファイルの場所が未入力です。");
  if (missingUrlSongs.length) items.push(`楽曲URL未入力が${missingUrlSongs.length}曲あります。`);
  if (values.audioOrganize === "する" && missingAudioSongs.length) items.push(`音源ファイルパス未入力が${missingAudioSongs.length}曲あります。`);
  if (applicantCount > MANY_APPLICANTS_THRESHOLD && !values.applicantLimit) {
    items.push(`応募者楽曲が${applicantCount}曲あります。SE_Pon登録前に「ここまで」を確認してください。`);
  }
  if (values.wordpressPolicy === "すぐ公開") {
    items.push("WordPressをすぐ公開にする前に、本文、埋め込み、サムネ、内部注記削除を最終確認してください。");
  }
  if (values.snsManga === "作らない") {
    items.push("SNS投稿文と告知漫画案は作業範囲外として扱ってください。");
  }

  return items;
}

function importSongsFromText() {
  const text = elements.importText.value.trim();
  if (!text) {
    showStatus("取り込むCSV/JSONがありません");
    return;
  }

  try {
    const parsed = parseSongs(text);
    if (!parsed.length) {
      showStatus("楽曲データを読み取れませんでした");
      return;
    }
    state.songs = parsed;
    renderSongs();
    persistDraft();
    refreshLivePreview();
    showStatus(`${parsed.length}曲を取り込みました`);
  } catch (error) {
    showStatus(`取り込みに失敗しました: ${error.message}`);
  }
}

function parseSongs(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return parseJsonSongs(trimmed);
  }
  return parseCsvSongs(trimmed);
}

function parseJsonSongs(text) {
  const data = JSON.parse(text);
  const rows = Array.isArray(data)
    ? data
    : data.songs || data.tracks || data.items || data["楽曲一覧"] || data["楽曲データ"] || [];

  if (!Array.isArray(rows)) return [];
  return rows.map(mapImportedRow).filter(Boolean);
}

function parseCsvSongs(text) {
  const rows = parseDelimitedText(text).filter((row) => row.some((cell) => String(cell || "").trim()));
  if (rows.length < 2) return [];

  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const object = {};
    headers.forEach((header, index) => {
      object[header] = row[index] || "";
    });
    return mapImportedRow(object);
  }).filter(Boolean);
}

function parseDelimitedText(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] || "";
  const delimiter = firstLine.includes("\t") && !firstLine.includes(",") ? "\t" : ",";
  const rows = [[]];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === delimiter && !quoted) {
      rows[rows.length - 1].push(field.trim());
      field = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      rows[rows.length - 1].push(field.trim());
      rows.push([]);
      field = "";
      continue;
    }
    field += char;
  }

  rows[rows.length - 1].push(field.trim());
  return rows;
}

function mapImportedRow(row) {
  const song = createSong();
  let hasValue = false;

  Object.keys(fieldAliases).forEach((field) => {
    const value = findAliasedValue(row, fieldAliases[field]);
    if (value !== undefined && value !== null && String(value).trim()) {
      song[field] = String(value).trim();
      hasValue = true;
    }
  });

  song.song_type = normalizeSongType(song.song_type);
  if (!song.url_type) song.url_type = inferUrlType(song.song_url);
  return hasValue ? song : null;
}

function findAliasedValue(row, aliases) {
  const normalizedRow = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]),
  );
  for (const alias of aliases) {
    const normalized = normalizeHeader(alias);
    if (Object.prototype.hasOwnProperty.call(normalizedRow, normalized)) {
      return normalizedRow[normalized];
    }
  }
  return undefined;
}

function normalizeHeader(header) {
  return String(header || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_\-・:：]/g, "");
}

async function copyOutput() {
  if (!state.hasGenerated) {
    showStatus("先にパック生成を押してください");
    return;
  }

  const text = elements.outputText.value;
  showStatus("コピーしました");
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    elements.outputText.focus();
    elements.outputText.select();
    document.execCommand("copy");
  }
}

function showStatus(message) {
  elements.statusLine.textContent = message;
  window.clearTimeout(showStatus.timer);
  showStatus.timer = window.setTimeout(() => {
    elements.statusLine.textContent = "";
  }, 2600);
}

function persistDraft() {
  const formData = {};
  new FormData(elements.packForm).forEach((value, key) => {
    formData[key] = value;
  });
  formData.articleType = getArticleType();
  formData.repeatAll = document.getElementById("repeatAll").checked;
  formData.scopes = Array.from(document.querySelectorAll("[data-scope]")).map((checkbox) => ({
    scope: checkbox.dataset.scope,
    checked: checkbox.checked,
  }));

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ formData, songs: state.songs }));
  } catch {
    // Storage is optional; generation still works without it.
  }
}

function restoreDraft() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!stored) return;

    Object.entries(stored.formData || {}).forEach(([key, value]) => {
      if (key === "articleType") {
        const radio = document.querySelector(`input[name="articleType"][value="${value}"]`);
        if (radio) radio.checked = true;
        return;
      }
      if (key === "repeatAll") {
        document.getElementById("repeatAll").checked = Boolean(value);
        return;
      }
      if (key === "scopes") {
        value.forEach((item) => setScopeChecked(item.scope, item.checked));
        return;
      }
      const field = document.querySelector(`[name="${key}"]`);
      if (field && field.type !== "radio") field.value = value;
    });

    if (Array.isArray(stored.songs) && stored.songs.length) {
      state.songs = stored.songs.map((song) => createSong(song));
    }
  } catch {
    // Ignore broken drafts.
  }
}
