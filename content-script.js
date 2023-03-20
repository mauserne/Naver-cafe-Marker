function extract_info() {
  var o_page = document.body.querySelector(".id.mlink.gm-tcol-c");
  var tmp = o_page.href.lastIndexOf("/");

  const url = o_page.href;
  const regex = /\/cafes\/(\d{8,})\//; // Match the number after "/cafes/" with at least 8 digits
  const match = url.match(regex);

  if (!match) {
    console.log("No cafe ID found - Naver cafe marker");
  }

  return [o_page.innerText, o_page.href.substr(tmp + 1), match[1]];
}

const [ownerName, ownerKey, cafeId] = extract_info();
chrome.storage.local.get([cafeId], (result) => {
  console.log(result);
  if (!result[cafeId]) {
    chrome.storage.local.set({ [cafeId]: [1] });
    chrome.storage.local.get([cafeId], (result) => {
      console.log(result);
    });
  }
});

let iframe;

function wait_iframeCreated() {
  return new Promise((resolve) => {
    const checkIframeCreated = () => {
      iframe = document.querySelector("#cafe_main");
      if (iframe) {
        resolve(iframe);
      } else {
        setTimeout(checkIframeCreated, 100);
      }
    };
    checkIframeCreated();
  });
}

let replied_list = [];

const getVisited = () => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([cafeId], (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        console.log(result[cafeId]);
        resolve(result[cafeId]);
      }
    });
  });
};

function callAPIAsync(params) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { ownerKey: ownerKey, cafeId: cafeId, article_list: params },
      function (response) {
        resolve(response.data);
      }
    );
  });
}

function highlight_reply(thumbs) {
  thumbs.forEach((el) => {
    if (el.href.includes(ownerKey)) {
      el.parentNode.parentNode.style.backgroundColor = "cornsilk";
    }
  });
}

function heart_marker(i_article, current_display_articles) {
  console.log(cooldown);
  getVisited()
    .then((visited) => {
      console.log(visited);
      let willupdate = current_display_articles.filter(function (value) {
        return !visited.includes(value);
      });
      console.log(willupdate, current_display_articles);
      callAPIAsync(willupdate)
        .then((replied_list) => {
          i_article.forEach((article) => {
            var articleId = article.href.match(/articleid=(\d+)/)[1];
            if (replied_list.concat(visited).includes(articleId)) {
              cooldown++;
              if (window.getComputedStyle(article).display == "table-cell") {
                article.parentNode.insertAdjacentHTML(
                  "beforeend",
                  "<span style='display: table-cell'>💗</span>"
                );
              } else {
                article.parentNode.insertAdjacentHTML("beforeend", "<span>💗</span>");
              }
            }
          });
        })
        .catch((error) => {
          console.error(error);
        });
    })
    .catch((error) => {
      console.error(error);
    });
}

function iframe_manipulate() {
  console.log("iframe 로드 완료!1 - Naver cafe marker");
  let current_display_articles = [];
  let iframeDoc = iframe.contentWindow.document;
  let i_article = iframeDoc.querySelectorAll(".article");

  const waitForThumbs = () => {
    return new Promise((resolve, reject) => {
      const thumbs = iframeDoc.querySelectorAll(".comment_thumb");
      if (thumbs.length > 0) {
        resolve(thumbs);
      } else {
        const intervalId = setInterval(() => {
          const updatedThumbs = iframeDoc.querySelectorAll(".comment_thumb");
          if (updatedThumbs.length > 0) {
            clearInterval(intervalId);
            resolve(updatedThumbs);
          }
        }, 1000);
      }
    });
  };

  waitForThumbs()
    .then((thumbs) => {
      highlight_reply(thumbs);
    })
    .catch((error) => {
      console.error(error);
    });

  i_article.forEach((article) => {
    var articleId = article.href.match(/articleid=(\d+)/)[1];

    current_display_articles.push(articleId);
  });

  heart_marker(i_article, current_display_articles);
}

//카페 페이지 first Enter 에 iframe을 load 하지 못할 때
wait_iframeCreated().then(() => {
  iframe_manipulate();
});

let cooldown = 0;

setInterval(() => {
  cooldown = 0;
}, 1000 * 60 * 5);

iframe.onload = function () {
  iframe_manipulate();
  if (cooldown > 10) {
    cooldown = 0;
    alert(
      '"💗하트 마커" 활성화 상태에서 단시간에 대량의 글을 탐색하면, 일시적으로 카페 이용에 쿨타임이 발생할 수 있습니다.'
    );
  }
};
