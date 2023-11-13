function difference_Set(a, b) {
  return new Set([...a].filter((x) => !b.has(x)));
}

function union_Set(a, b) {
  return new Set([...a, ...b]);
}

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

const getVisited = () => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([cafeId], (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(new Set(result[cafeId]));
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
      el.parentNode.parentNode.className =
        el.parentNode.parentNode.className + " CafeOwner";
    }
  });
}

let dont_update = new Set(); //하트가 안달린 글을 새로고침 전까지 다시 탐색하지 않음(최적화)

function heart_marker(i_article, i_albumimg, current_display_articles) {
  getVisited()
    .then((visited_sets) => {
      let willupdate = difference_Set(
        new Set([...current_display_articles]),
        visited_sets
      );

      callAPIAsync([...difference_Set(willupdate, dont_update)])
        .then((replied_sets) => {
          i_article.forEach((article) => {
            var articleId = article.href.match(/articleid=(\d+)/)[1];
            if (union_Set(replied_sets, visited_sets).has(articleId)) {
              if (window.getComputedStyle(article).display == "table-cell") {
                if (article.parentNode.lastElementChild.innerText != "💛") {
                  article.parentNode.insertAdjacentHTML(
                    "beforeend",
                    "<span style='display: table-cell'>💛</span>"
                  );
                }
              } else {
                article.parentNode.insertAdjacentHTML("beforeend", "<span>💛</span>");
              }
            }
          });

          i_albumimg.forEach((img) => {
            var imgId = img.href.match(/articleid=(\d+)/)[1];
            if (union_Set(replied_sets, visited_sets).has(imgId)) {
              img.insertAdjacentHTML(
                "beforeend",
                "<span style='position: absolute; font-size: 25px; text-shadow: 0px 0px 3px rgba(95, 95, 95, 0.5); left: 1%;'>💛</span>"
              );
            }
          });
        })
        .catch((error) => {
          console.error(error);
        });

      past_tmp = [...dont_update].length;
      dont_update = union_Set(dont_update, willupdate);
      cooldown += cooldown_Counter(past_tmp, [...dont_update].length);
    })
    .catch((error) => {
      console.error(error);
    });
}

function cooldown_Counter(past, now) {
  if (past >= now) {
    return 0;
  } else {
    return now - past;
  }
}

let category_valid = true;

function category_check() {
  fetch(`https://cafe.naver.com/CafeProfileView.nhn?clubid=${cafeId}`)
    .then((response) => response.arrayBuffer())
    .then((buffer) => {
      // ArrayBuffer를 EUC-KR 문자열로 디코딩합니다.
      let decoder = new TextDecoder("euc-kr");
      let decodedData = decoder.decode(buffer);

      if (decodedData.includes("팬카페") || decodedData.includes("인터넷방송")) {
        category_valid = true;
      } else {
        // 카테고리 불일치시 확장프로그램 비활성
        category_valid = false;
      }
    })
    .catch((error) => {
      console.error("데이터 가져오기 및 디코딩 실패:", error);
    });
}
category_check();

function iframe_manipulate() {
  if (!category_valid) {
    console.log(
      category_valid,
      "Naver cafe Marker는 '팬카페' 또는 '인터넷방송' 카테고리의 카페에서 활성화됩니다."
    );
    return false;
  }

  console.log("iframe 로드 완료!1 - Naver cafe marker");
  let current_display_articles = [];
  let iframeDoc = iframe.contentWindow.document;
  let i_article = iframeDoc.querySelectorAll(".article");
  let i_albumimg = iframeDoc.querySelectorAll(".album-img");

  let st = document.createElement("style");
  st.innerText = `
    .CommentItem.CafeOwner::before {
      width: 858px;
      content: "";
      position: absolute;
      top: 0;
      bottom: 0;
      left: -29px;
      border-radius: 25px;
      right: -29px;
      background-color: cornsilk;
    }
    
    .CommentItem.CommentItem--reply.CafeOwner  {
      padding-left: 0 !important;
      margin-left: 46px;
    }
    `;
  iframeDoc.head.appendChild(st);

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

  i_article.forEach((article) => {
    var articleId = article.href.match(/articleid=(\d+)/)[1];

    current_display_articles.push(articleId);
  });

  i_albumimg.forEach((albumimg) => {
    var imgId = albumimg.href.match(/articleid=(\d+)/)[1];

    current_display_articles.push(imgId);
  });

  chrome.storage.local.get(["highlight_switch"], function (result) {
    //댓글 하이라이트 toggle
    if (result.highlight_switch) {
      waitForThumbs()
        .then((thumbs) => {
          highlight_reply(thumbs);
        })
        .catch((error) => {
          console.error(error);
        });
    }
  });

  chrome.storage.local.get(["heart_switch"], function (result) {
    //하트마커 toggle 체크
    if (result.heart_switch) {
      heart_marker(i_article, i_albumimg, current_display_articles);
    }
  });
}

//카페 페이지 first Enter 에 iframe을 load 하지 못할 때
wait_iframeCreated().then(() => {
  iframe_manipulate();
});

let cooldown = 0;

setInterval(() => {
  cooldown = 0;
}, 1000 * 60 * 2);

iframe.onload = function () {
  iframe_manipulate();
  if (cooldown > 150) {
    cooldown = 0;
    alert(
      '"💛하트 마커" 활성화 상태에서 단시간에 대량의 글을 탐색하면, 일시적으로 카페 이용이 거부될 수 있습니다.'
    );
  }
};
