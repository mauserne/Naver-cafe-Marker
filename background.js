chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason == "install") {
    console.log("Thank you for download Naver cafe Marker!");
    chrome.storage.local.set({ highlight_switch: true });
    chrome.storage.local.set({ heart_switch: true });
  }
  if (details.reason == "update") {
    console.log("확장프로그램이 업데이트 되었습니다.");
    chrome.storage.local.set({ highlight_switch: true });
    chrome.storage.local.set({ heart_switch: true });
  }
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
            if (JSON.stringify(data).includes(request.ownerKey)) {
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
          // 모든 API 요청이 완료되었을 때 실행되는 코드
          resolve(results); // 각 API 요청의 처리 결과가 담긴 배열
          // 결과 처리 코드 작성
        })
        .catch((error) => {
          sendResponse({ error: error.message });
        });
    });
    fetchPromise.then((responseData) => {
      sendResponse({ data: responseData });

      let tmp = [];
      responseData.forEach((ele) => {
        if (ele) {
          tmp.push(ele);
        }
      });
      chrome.storage.local.get([cafeId], (result) => {
        chrome.storage.local.set({ [cafeId]: result[cafeId].concat(tmp) });
      });
      console.log(responseData, tmp);
    });
    return true;
  }
});
