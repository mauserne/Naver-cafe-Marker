chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason == "install") {
    console.log("Thank you for download Naver cafe Marker!");
    chrome.storage.local.set({ highlight_switch: true });
    chrome.storage.local.set({ heart_switch: true });
  }
  if (details.reason == "update") {
    console.log("확장프로그램이 업데이트 되었습니다.");

    /* 
        chrome.tabs.create({
          //패치노트 url
          url: "https://github.com/mauserne/Naver-cafe-Marker/releases",
          selected: true,
          active: true,
        });
         */

    // 캐쉬 초기화!!!!
    dumpData()
  }
});


function dumpData() {
  chrome.storage.local.get(null, function (data) {
    var keys = Object.keys(data);
    chrome.storage.local.remove(keys, function () {
      console.log("Local storage cleaned!");
      setTimeout(() => {
        chrome.storage.local.set({ highlight_switch: true });
        chrome.storage.local.set({ heart_switch: true });
      }, 500);
    });
  });
}

chrome.storage.local.getBytesInUse(null, function (bytes) {
  let kb = bytes / 1024;
  let mb = kb / 1024;
  console.log(
    "Local storage used by extension: " + kb.toFixed(2) + " kB, " + mb.toFixed(2) + " MB"
  );
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log(
    sender.tab ? "from a content script:" + sender.tab.url : "from the extension"
  );
  if (request.cafeId && request.ownerKey && request.article_list) {
    const cafeId = request.cafeId;
    const fetchPromise = new Promise((resolve, reject) => {
      const fetchList = request.article_list.map((el) => {
        console.log(el, "게시물 확인 중..");
        return fetch(
          `https://apis.naver.com/cafe-web/cafe-articleapi/v2/cafes/${request.cafeId}/articles/${el}/comments`
        )
          .then((response) => response.json())
          .then((data) => {
            if (
              JSON.stringify(data.result.comments.items).includes(request.ownerKey) ||
              JSON.stringify(data.result.likeItUsers).includes(request.ownerKey)
            ) {
              console.log(el, "게시물에 주인확인");
              return el;
            }
          })
          .catch((error) => {
            reject(error);
          });
      });
      Promise.all(fetchList)
        .then((results) => {
          console.log(results);
          // 모든 API 요청이 완료되었을 때 실행되는 코드
          const filteredArr = results.filter((item) => {
            return item !== undefined;
          });
          resolve(filteredArr); // 각 API 요청의 처리 결과가 담긴 배열
          // 결과 처리 코드 작성
        })
        .catch((error) => {
          sendResponse({ error: error.message });
        });
    });

    fetchPromise.then((responseData) => {
      chrome.storage.local.get(null, function (data) {
        console.log('All Data', data);
      })
      sendResponse({ data: responseData });
      chrome.storage.local.get([cafeId], (result) => {
        if (!result[cafeId]) {
          chrome.storage.local.set({
            [cafeId]: responseData
          });
        } else {
          chrome.storage.local.set({
            [cafeId]: result[cafeId].concat(responseData)
          });
        }
      });
      console.log("sending to content-script", responseData);
    });

    return true;
  }
});
