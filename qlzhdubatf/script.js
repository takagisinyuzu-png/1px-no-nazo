(() => {
  "use strict";

  // TODO: 3つの手がかり画像パス・altテキストをテーマに合わせて差し替える。
  // キー（clue1/clue2/clue3）は index.html の data-key / dot要素と一致させること
  const CLUE_IMAGES = {
    fuda: { src: "assets/crop1_fuda.png", alt: "段の隅の木札" },
    tsuzumi: { src: "assets/crop2_tsuzumi.png", alt: "雛道具の鼓" },
    byobu: { src: "assets/crop3_byobu.png", alt: "屏風の隅" },
  };

  // simple non-cryptographic hash so the answer isn't sitting in the source as plain text.
  // (devtools can still recover it by evaluating simpleHash on guesses — accepted risk,
  // see reference/core_requirements.md section 7 "安全面の制約")
  // ↓ この関数自体はコア・変更不要
  function simpleHash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
      h = (h * 33 + str.charCodeAt(i)) % 4294967296;
    }
    return h;
  }
  // TODO: requirements.md②で確定した答え（文字数・文字種はrequirements.md④次第。
  // 数字に限らずひらがな等でもよい）のハッシュ値に差し替える。
  // 計算方法: python output/core/tools/compute_hash.py <答え> を実行して結果を貼る
  // （答えを平文でこのファイルに書かないこと）
  const TARGET_HASH = 2546505605; // simpleHash("みあげろ")

  const discovered = { fuda: false, tsuzumi: false, byobu: false };

  const modal = document.getElementById("modal");
  const modalImg = document.getElementById("modal-img");
  const modalClose = document.getElementById("modal-close");

  function openModal(key) {
    const clue = CLUE_IMAGES[key];
    modalImg.src = clue.src;
    modalImg.alt = clue.alt;
    modal.hidden = false;

    if (!discovered[key]) {
      discovered[key] = true;
      document.getElementById(`hs-${key}`).dataset.found = "true";
      document.querySelector(`.dot[data-key="${key}"]`).dataset.found = "true";
      maybeRevealCodeSection();
    }
  }

  function closeModal() {
    modal.hidden = true;
    modalImg.src = "";
  }

  document.querySelectorAll(".hotspot").forEach((btn) => {
    btn.addEventListener("click", () => openModal(btn.dataset.key));
  });
  modalClose.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeModal();
  });

  function maybeRevealCodeSection() {
    if (discovered.fuda && discovered.tsuzumi && discovered.byobu) {
      document.getElementById("code-section").hidden = false;
      document.getElementById("code-input").focus();
    }
  }

  // TODO: このテーマの核となる仕掛けを匂わせる一文に差し替える。答えそのものは書かない。
  // 例(01-lab): 「書類に書かれた番号は、本当にそのままの数字だろうか——ホワイトボードにも、
  //             何か書いてあった気がする。」
  const HINT_TEXT = "お内裏様とお雛様、座る位置がおかしい。それは、ただの飾りではないのかもしれない。";

  // ---- hint: reveal a real conceptual hint text on request (opt-in, not always-on).
  // 2026-07-19、ホットスポットの:hoverハイライトがマウスを動かすだけで3箇所の位置を
  // 教えてしまっていた（実質的な常時ヒント漏れ）バグが発覚し、style.cssから:hover背景を撤去。
  // それに伴い、ヒントは「位置を光らせる」から「核心のテキストヒントを出す」方式に変更した。
  // ↓ コア・変更不要（HINT_TEXTの中身だけがテーマ別のカスタム要件）
  const hintBtn = document.getElementById("hint-btn");
  const hintText = document.getElementById("hint-text");
  hintBtn.addEventListener("click", () => {
    hintText.textContent = HINT_TEXT;
    hintText.classList.toggle("visible");

    const undiscovered = Object.keys(discovered).filter((k) => !discovered[k]);
    undiscovered.forEach((key) => {
      const el = document.getElementById(`hs-${key}`);
      el.classList.add("hint-flash");
      setTimeout(() => el.classList.remove("hint-flash"), 1600);
    });
  });

  // ---- step 2: code input ----  ↓ コア・変更不要
  const codeForm = document.getElementById("code-form");
  const codeInput = document.getElementById("code-input");
  const codeFeedback = document.getElementById("code-feedback");
  const codeSection = document.getElementById("code-section");

  codeForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = codeInput.value.trim();
    if (simpleHash(value) === TARGET_HASH) {
      // TODO: 解錠時のフィードバック文言をテーマに合わせて調整可（世界観トーンは維持すること）
      codeFeedback.textContent = "解錠——手箱の中に何かがある。";
      codeFeedback.className = "code-feedback ok";
      codeForm.querySelector("button").disabled = true;
      codeInput.disabled = true;
      unlockDrawer();
    } else {
      codeFeedback.textContent = "違うようだ。";
      codeFeedback.className = "code-feedback error";
      codeSection.classList.remove("shake");
      void codeSection.offsetWidth; // restart animation
      codeSection.classList.add("shake");
    }
  });

  // ---- step 3: drag the item onto the dropzone ----  ↓ コア・変更不要
  const item = document.getElementById("item");
  const dropzone = document.getElementById("dropzone");
  const dragHint = document.getElementById("drag-hint");
  const clearScreen = document.getElementById("clear-screen");
  const sceneWrap = document.getElementById("scene");

  function unlockDrawer() {
    item.hidden = false;
    dropzone.classList.add("active");
    dragHint.hidden = false;
    setTimeout(() => { codeSection.hidden = true; }, 900);
    // TODO: 第3引数の色（--fx-color）だけをテーマに合わせて差し替える。
    // アクション・タイミングは固定（core_requirements.md 4章）
    playItemEffect(item.style.left, item.style.top, "#c9a24a");
  }

  // reusable "item get" effect: radial glow burst + rays + sparkles.
  // ↓ コア・変更不要。action/timing is fixed; only `color` should change per puzzle theme.
  function playItemEffect(left, top, color) {
    const fx = document.createElement("div");
    fx.className = "item-fx";
    fx.style.left = left;
    fx.style.top = top;
    fx.style.setProperty("--fx-color", color);

    const glow = document.createElement("span");
    glow.className = "fx-glow";
    fx.appendChild(glow);

    const rayCount = 8;
    for (let i = 0; i < rayCount; i++) {
      const ray = document.createElement("span");
      ray.className = "fx-ray";
      ray.style.setProperty("--r", `${(360 / rayCount) * i}deg`);
      ray.style.animationDelay = `${i * 0.02}s`;
      fx.appendChild(ray);
    }

    const sparkCount = 10;
    for (let i = 0; i < sparkCount; i++) {
      const spark = document.createElement("span");
      spark.className = "fx-spark";
      const angle = Math.random() * Math.PI * 2;
      const dist = 42 + Math.random() * 54;
      spark.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
      spark.style.setProperty("--dy", `${Math.sin(angle) * dist}px`);
      spark.style.animationDelay = `${Math.random() * 0.18}s`;
      fx.appendChild(spark);
    }

    sceneWrap.appendChild(fx);
    setTimeout(() => fx.remove(), 1300);
  }

  let dragState = null;

  function rectsOverlap(a, b) {
    return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
  }

  item.addEventListener("pointerdown", (e) => {
    item.setPointerCapture(e.pointerId);
    item.classList.add("dragging");
    dragState = {
      startX: e.clientX,
      startY: e.clientY,
      origLeft: item.style.left,
      origTop: item.style.top,
      dx: 0,
      dy: 0,
    };
  });

  item.addEventListener("pointermove", (e) => {
    if (!dragState) return;
    dragState.dx = e.clientX - dragState.startX;
    dragState.dy = e.clientY - dragState.startY;
    item.style.transform = `translate(calc(-50% + ${dragState.dx}px), calc(-50% + ${dragState.dy}px))`;

    const itemRect = item.getBoundingClientRect();
    const zoneRect = dropzone.getBoundingClientRect();
    dropzone.classList.toggle("hover", rectsOverlap(itemRect, zoneRect));
  });

  function endDrag(e) {
    if (!dragState) return;
    item.classList.remove("dragging");

    const itemRect = item.getBoundingClientRect();
    const zoneRect = dropzone.getBoundingClientRect();
    const success = rectsOverlap(itemRect, zoneRect);
    dropzone.classList.remove("hover");

    if (success) {
      onEscapeSuccess();
    } else {
      item.style.transition = "transform 0.25s ease";
      item.style.transform = "translate(-50%, -50%)";
      setTimeout(() => { item.style.transition = ""; }, 260);
    }
    dragState = null;
  }

  item.addEventListener("pointerup", endDrag);
  item.addEventListener("pointercancel", endDrag);

  function onEscapeSuccess() {
    item.style.transition = "opacity 0.3s ease";
    item.style.opacity = "0";
    dropzone.classList.remove("active");
    dragHint.hidden = true;
    setTimeout(() => {
      item.hidden = true;
      sceneWrap.classList.add("cleared");
      clearScreen.hidden = false;
      clearScreen.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 320);
  }
})();
