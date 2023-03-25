const modal = document.querySelector(".modal");
const ad = document.querySelector(".ad");

// 하이라이트 스위치
const $highlight = document.querySelector(".highlightSwitch");

chrome.storage.local.get(["highlight_switch"], function (result) {
  if (result.highlight_switch) {
    $highlight.className = "highlightSwitch actived-already";
  }
});

$highlight.onclick = () => {
  if ($highlight.className === "highlightSwitch actived-already") {
    $highlight.className = "highlightSwitch active";
  }

  $highlight.classList.toggle("active");
  if ($highlight.className === "highlightSwitch active") {
    chrome.storage.local.set({ highlight_switch: true });
  } else {
    chrome.storage.local.set({ highlight_switch: false });
  }
  modal.className = "modal show";
};

//하트 스위치
const $heart = document.querySelector(".heartSwitch");

chrome.storage.local.get(["heart_switch"], function (result) {
  if (result.heart_switch) {
    $heart.className = "heartSwitch actived-already";
  }
});

$heart.onclick = () => {
  if ($heart.className === "heartSwitch actived-already") {
    $heart.className = "heartSwitch active";
  }

  $heart.classList.toggle("active");
  if ($heart.className === "heartSwitch active") {
    chrome.storage.local.set({ heart_switch: true });
  } else {
    chrome.storage.local.set({ heart_switch: false });
  }
  modal.className = "modal show";
};

ad.onclick = () => {
  chrome.tabs.create({
    //패치노트 url
    url: "https://chrome.google.com/webstore/detail/mgdehebdbghhagjeicebdhkdbkemaefm?authuser=0&hl=ko",
    selected: true,
    active: true,
  });
};
