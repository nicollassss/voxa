var messenger,
  typingTimeout,
  typingNow = 0,
  temporaryMsgId = 0,
  defaultAvatarInSettings = null,
  messengerColor,
  dark_mode,
  messages_page = 1;

const messagesContainer = $(".messenger-messagingView .m-body"),
  messengerTitleDefault = $(".messenger-headTitle").text(),
  messageInputContainer = $(".messenger-sendCard"),
  messageInput = $("#message-form .m-send"),
  auth_id = $("meta[name=url]").attr("data-user"),
  url = $("meta[name=url]").attr("content"),
  messengerTheme = $("meta[name=messenger-theme]").attr("content"),
  defaultMessengerColor = $("meta[name=messenger-color]").attr("content"),
  csrfToken = $('meta[name="csrf-token"]').attr("content");

const getMessengerId = () => $("meta[name=id]").attr("content");
const setMessengerId = (id) => $("meta[name=id]").attr("content", id);
Pusher.logToConsole = chatify.pusher.debug;
const pusher = new Pusher(chatify.pusher.key, {
    encrypted: chatify.pusher.options.encrypted,
    cluster: chatify.pusher.options.cluster,
    wsHost: chatify.pusher.options.host,
    wsPort: chatify.pusher.options.port,
    wssPort: chatify.pusher.options.port,
    forceTLS: chatify.pusher.options.useTLS,
    authEndpoint: chatify.pusherAuthEndpoint,
  auth: {
    headers: {
      "X-CSRF-TOKEN": csrfToken,
    },
  },
});
const escapeHtml = (unsafe) => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
};
function actionOnScroll(selector, callback, topScroll = false) {
  $(selector).on("scroll", function () {
    let element = $(this).get(0);
    const condition = topScroll
      ? element.scrollTop == 0
      : element.scrollTop + element.clientHeight >= element.scrollHeight;
    if (condition) {
      callback();
    }
  });
}
function routerPush(title, url) {
  $("meta[name=url]").attr("content", url);
  return window.history.pushState({}, title || document.title, url);
}
function updateSelectedContact(user_id) {
  $(document).find(".messenger-list-item").removeClass("m-list-active");
  $(document)
    .find(
      ".messenger-list-item[data-contact=" + (user_id || getMessengerId()) + "]"
    )
    .addClass("m-list-active");
}
function loadingSVG(size = "25px", className = "", style = "") {
  return `
<svg style="${style}" class="loadingSVG ${className}" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 40 40" stroke="#ffffff">
<g fill="none" fill-rule="evenodd">
<g transform="translate(2 2)" stroke-width="3">
<circle stroke-opacity=".1" cx="18" cy="18" r="18"></circle>
<path d="M36 18c0-9.94-8.06-18-18-18" transform="rotate(349.311 18 18)">
<animateTransform attributeName="transform" type="rotate" from="0 18 18" to="360 18 18" dur=".8s" repeatCount="indefinite"></animateTransform>
</path>
</g>
</g>
</svg>
`;
}
function loadingWithContainer(className) {
  return `<div class="${className}" style="text-align:center;padding:15px">${loadingSVG(
    "25px",
    "",
    "margin:auto"
  )}</div>`;
}
function listItemLoading(items) {
  let template = "";
  for (let i = 0; i < items; i++) {
    template += `
<div class="loadingPlaceholder">
<div class="loadingPlaceholder-wrapper">
<div class="loadingPlaceholder-body">
<table class="loadingPlaceholder-header">
<tr>
<td style="width: 45px;"><div class="loadingPlaceholder-avatar"></div></td>
<td>
<div class="loadingPlaceholder-name"></div>
<div class="loadingPlaceholder-date"></div>
</td>
</tr>
</table>
</div>
</div>
</div>
`;
  }
  return template;
}
function avatarLoading(items) {
  let template = "";
  for (let i = 0; i < items; i++) {
    template += `
<div class="loadingPlaceholder">
<div class="loadingPlaceholder-wrapper">
<div class="loadingPlaceholder-body">
<table class="loadingPlaceholder-header">
<tr>
<td style="width: 45px;">
<div class="loadingPlaceholder-avatar" style="margin: 2px;"></div>
</td>
</tr>
</table>
</div>
</div>
</div>
`;
  }
  return template;
}
function sendTempMessageCard(message, id) {
  return `
 <div class="message-card mc-sender" data-id="${id}">
     <div class="message-card-content">
         <div class="message">
             ${message}
             <sub>
                 <span class="far fa-clock"></span>
             </sub>
         </div>
     </div>
 </div>
`;
}
function attachmentTemplate(fileType, fileName, imgURL = null) {
  if (fileType != "image") {
    return (
      `
 <div class="attachment-preview">
     <span class="fas fa-times cancel"></span>
     <p style="padding:0px 30px;"><span class="fas fa-file"></span> ` +
      escapeHtml(fileName) +
      `</p>
 </div>
`
    );
  } else {
    return (
      `
<div class="attachment-preview">
 <span class="fas fa-times cancel"></span>
 <div class="image-file chat-image" style="background-image: url('` +
      imgURL +
      `');"></div>
 <p><span class="fas fa-file-image"></span> ` +
      escapeHtml(fileName) +
      `</p>
</div>
`
    );
  }
}
function activeStatusCircle() {
  return `<span class="activeStatus"></span>`;
}
$(window).resize(function () {
  cssMediaQueries();
});
function cssMediaQueries() {
  if (window.matchMedia("(min-width: 980px)").matches) {
    $(".messenger-listView").removeAttr("style");
  }
  if (window.matchMedia("(max-width: 980px)").matches) {
    $("body")
      .find(".messenger-list-item")
      .find("tr[data-action]")
      .attr("data-action", "1");
    $("body").find(".favorite-list-item").find("div").attr("data-action", "1");
  } else {
    $("body")
      .find(".messenger-list-item")
      .find("tr[data-action]")
      .attr("data-action", "0");
    $("body").find(".favorite-list-item").find("div").attr("data-action", "0");
  }
}
let app_modal = function ({
  show = true,
  name,
  data = 0,
  buttons = true,
  header = null,
  body = null,
}) {
  const modal = $(".app-modal[data-name=" + name + "]");
  header ? modal.find(".app-modal-header").html(header) : "";

  body ? modal.find(".app-modal-body").html(body) : "";
  buttons == true
    ? modal.find(".app-modal-footer").show()
    : modal.find(".app-modal-footer").hide();
  if (show == true) {
    modal.show();
    $(".app-modal-card[data-name=" + name + "]").addClass("app-show-modal");
    $(".app-modal-card[data-name=" + name + "]").attr("data-modal", data);
  } else {
    modal.hide();
    $(".app-modal-card[data-name=" + name + "]").removeClass("app-show-modal");
    $(".app-modal-card[data-name=" + name + "]").attr("data-modal", data);
  }
};
function scrollToBottom(container) {
  $(container)
    .stop()
    .animate({
      scrollTop: $(container)[0].scrollHeight,
    });
}
function hScroller(scroller) {
  const slider = document.querySelector(scroller);
  let isDown = false;
  let startX;
  let scrollLeft;

  slider.addEventListener("mousedown", (e) => {
    isDown = true;
    startX = e.pageX - slider.offsetLeft;
    scrollLeft = slider.scrollLeft;
  });
  slider.addEventListener("mouseleave", () => {
    isDown = false;
  });
  slider.addEventListener("mouseup", () => {
    isDown = false;
  });
  slider.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - slider.offsetLeft;
    const walk = (x - startX) * 1;
    slider.scrollLeft = scrollLeft - walk;
  });
}
function disableOnLoad(disable = true) {
  if (disable) {
    $(".add-to-favorite").hide();
    $(".messenger-sendCard").hide();
    messagesContainer.css("opacity", ".5");
    messageInput.attr("readonly", "readonly");
    $("#message-form button").attr("disabled", "disabled");
    $(".upload-attachment").attr("disabled", "disabled");
  } else {
    if (getMessengerId() != auth_id) {
      $(".add-to-favorite").show();
    }
    $(".messenger-sendCard").show();
    messagesContainer.css("opacity", "1");
    messageInput.removeAttr("readonly");
    $("#message-form button").removeAttr("disabled");
    $(".upload-attachment").removeAttr("disabled");
  }
}
function errorMessageCard(id) {
  messagesContainer
    .find(".message-card[data-id=" + id + "]")
    .addClass("mc-error");
  messagesContainer
    .find(".message-card[data-id=" + id + "]")
    .find("svg.loadingSVG")
    .remove();
  messagesContainer
    .find(".message-card[data-id=" + id + "] p")
    .prepend('<span class="fas fa-exclamation-triangle"></span>');
}
function IDinfo(id) {
  temporaryMsgId = 0;
  typingNow = 0;
  NProgress.start();
  disableOnLoad();
  if (messenger != 0) {
    getSharedPhotos(id);
    $.ajax({
      url: url + "/idInfo",
      method: "POST",
      data: { _token: csrfToken, id },
      dataType: "JSON",
      success: (data) => {
        if (!data?.fetch) {
          NProgress.done();
          NProgress.remove();
          return;
        }
        $(".messenger-infoView")
          .find(".avatar")
          .css("background-image", 'url("' + data.user_avatar + '")');
        $(".header-avatar").css(
          "background-image",
          'url("' + data.user_avatar + '")'
        );
        $(".messenger-infoView-btns .delete-conversation").show();
        $(".messenger-infoView-shared").show();
        fetchMessages(id, true);
        messageInput.focus();
        $(".messenger-infoView .info-name").text(data.fetch.name);
        $(".m-header-messaging .user-name").text(data.fetch.name);
        data.favorite > 0
          ? $(".add-to-favorite").addClass("favorite")
          : $(".add-to-favorite").removeClass("favorite");
        $("#message-form").trigger("reset");
        cancelAttachment();
        messageInput.focus();
      },
      error: () => {
        console.error("Couldn't fetch user data!");
        NProgress.done();
        NProgress.remove();
      },
    });
  } else {
    NProgress.done();
    NProgress.remove();
  }
}
function sendMessage() {
  temporaryMsgId += 1;
  let tempID = `temp_${temporaryMsgId}`;
  let hasFile = !!$(".upload-attachment").val();
  const inputValue = $.trim(messageInput.val());
  if (inputValue.length > 0 || hasFile) {
    const formData = new FormData($("#message-form")[0]);
    formData.append("id", getMessengerId());
    formData.append("temporaryMsgId", tempID);
    formData.append("_token", csrfToken);
    $.ajax({
      url: $("#message-form").attr("action"),
      method: "POST",
      data: formData,
      dataType: "JSON",
      processData: false,
      contentType: false,
      beforeSend: () => {
        $(".messages").find(".message-hint").hide();
        if (hasFile) {
          messagesContainer
            .find(".messages")
            .append(
              sendTempMessageCard(
                inputValue + "\n" + loadingSVG("28px"),
                tempID
              )
            );
        } else {
          messagesContainer
            .find(".messages")
            .append(sendTempMessageCard(inputValue, tempID));
        }
        scrollToBottom(messagesContainer);
        messageInput.css({ height: "42px" });
        $("#message-form").trigger("reset");
        cancelAttachment();
        messageInput.focus();
      },
      success: (data) => {
        if (data.error > 0) {
          errorMessageCard(tempID);
          console.error(data.error_msg);
        } else {
          updateContactItem(getMessengerId());
          const tempMsgCardElement = messagesContainer.find(
            `.message-card[data-id=${data.tempID}]`
          );
          tempMsgCardElement.before(data.message);
          tempMsgCardElement.remove();
          scrollToBottom(messagesContainer);
          sendContactItemUpdates(true);
        }
      },
      error: () => {
        errorMessageCard(tempID);
  
        console.error(
          "Failed sending the message! Please, check your server response."
        );
      },
    });
  }
  return false;
}
let messagesPage = 1;
let noMoreMessages = false;
let messagesLoading = false;
function setMessagesLoading(loading = false) {
  if (!loading) {
    messagesContainer.find(".messages").find(".loading-messages").remove();
    NProgress.done();
    NProgress.remove();
  } else {
    messagesContainer
      .find(".messages")
      .prepend(loadingWithContainer("loading-messages"));
  }
  messagesLoading = loading;
}
function fetchMessages(id, newFetch = false) {
  if (newFetch) {
    messagesPage = 1;
    noMoreMessages = false;
  }
  if (messenger != 0 && !noMoreMessages && !messagesLoading) {
    const messagesElement = messagesContainer.find(".messages");
    setMessagesLoading(true);
    $.ajax({
      url: url + "/fetchMessages",
      method: "POST",
      data: {
        _token: csrfToken,
        id: id,
        page: messagesPage,
      },
      dataType: "JSON",
      success: (data) => {
        setMessagesLoading(false);
        if (messagesPage == 1) {
          messagesElement.html(data.messages);
          scrollToBottom(messagesContainer);
        } else {
          const lastMsg = messagesElement.find(
            messagesElement.find(".message-card")[0]
          );
          const curOffset =
            lastMsg.offset().top - messagesContainer.scrollTop();
          messagesElement.prepend(data.messages);
          messagesContainer.scrollTop(lastMsg.offset().top - curOffset);
        }
        makeSeen(true);
        noMoreMessages = messagesPage >= data?.last_page;
        if (!noMoreMessages) messagesPage += 1;
        if (messenger != 0) {
          disableOnLoad(false);
        }
      },
      error: (error) => {
        setMessagesLoading(false);
        console.error(error);
      },
    });
  }
}
function cancelAttachment() {
  $(".messenger-sendCard").find(".attachment-preview").remove();
  $(".upload-attachment").replaceWith(
    $(".upload-attachment").val("").clone(true)
  );
}
function cancelUpdatingAvatar() {
  $(".upload-avatar-preview").css("background-image", defaultAvatarInSettings);
  $(".upload-avatar").replaceWith($(".upload-avatar").val("").clone(true));
}
const channelName = "private-chatify";
var channel = pusher.subscribe(`${channelName}.${auth_id}`);
var clientSendChannel;
var clientListenChannel;

function initClientChannel() {
  if (getMessengerId()) {
    clientSendChannel = pusher.subscribe(`${channelName}.${getMessengerId()}`);
    clientListenChannel = pusher.subscribe(`${channelName}.${auth_id}`);
  }
}
initClientChannel();
channel.bind("messaging", function (data) {
  if (data.from_id == getMessengerId() && data.to_id == auth_id) {
    $(".messages").find(".message-hint").remove();
    messagesContainer.find(".messages").append(data.message);
    scrollToBottom(messagesContainer);
    makeSeen(true);
    $(".messenger-list-item[data-contact=" + getMessengerId() + "]")
      .find("tr>td>b")
      .remove();
  }

  playNotificationSound(
    "new_message",
    !(data.from_id == getMessengerId() && data.to_id == auth_id)
  );
});
clientListenChannel.bind("client-typing", function (data) {
  if (data.from_id == getMessengerId() && data.to_id == auth_id) {
    data.typing == true
      ? messagesContainer.find(".typing-indicator").show()
      : messagesContainer.find(".typing-indicator").hide();
  }
  scrollToBottom(messagesContainer);
});
clientListenChannel.bind("client-seen", function (data) {
  if (data.from_id == getMessengerId() && data.to_id == auth_id) {
    if (data.seen == true) {
      $(".message-time")
        .find(".fa-check")
        .before('<span class="fas fa-check-double seen"></span> ');
      $(".message-time").find(".fa-check").remove();
    }
  }
});
clientListenChannel.bind("client-contactItem", function (data) {
  if (data.to == auth_id) {
    if (data.update) {
      updateContactItem(data.from);
    } else {
      console.error("Can not update contact item!");
    }
  }
});
clientListenChannel.bind("client-messageDelete", function (data) {
  $("body").find(`.message-card[data-id=${data.id}]`).remove();
});
clientListenChannel.bind("client-deleteConversation", function (data) {
  if (data.from == getMessengerId() && data.to == auth_id) {
    $("body").find(`.messages`).html("");
    $(".messages").find(".message-hint").show();
  }
});
var activeStatusChannel = pusher.subscribe("presence-activeStatus");
activeStatusChannel.bind("pusher:member_added", function (member) {
  setActiveStatus(1);
  $(".messenger-list-item[data-contact=" + member.id + "]")
    .find(".activeStatus")
    .remove();
  $(".messenger-list-item[data-contact=" + member.id + "]")
    .find(".avatar")
    .before(activeStatusCircle());
});
activeStatusChannel.bind("pusher:member_removed", function (member) {
  setActiveStatus(0);
  $(".messenger-list-item[data-contact=" + member.id + "]")
    .find(".activeStatus")
    .remove();
});

function handleVisibilityChange() {
  if (!document.hidden) {
    makeSeen(true);
  }
}

document.addEventListener("visibilitychange", handleVisibilityChange, false);
function isTyping(status) {
  return clientSendChannel.trigger("client-typing", {
    from_id: auth_id,
    to_id: getMessengerId(),
    typing: status,
  });
}

function makeSeen(status) {
  if (document?.hidden) {
    return;
  }
  $(".messenger-list-item[data-contact=" + getMessengerId() + "]")
    .find("tr>td>b")
    .remove();
  $.ajax({
    url: url + "/makeSeen",
    method: "POST",
    data: { _token: csrfToken, id: getMessengerId() },
    dataType: "JSON",
  });
  return clientSendChannel.trigger("client-seen", {
    from_id: auth_id, 
    to_id: getMessengerId(), 
    seen: status,
  });
}

function sendContactItemUpdates(status) {
  return clientSendChannel.trigger("client-contactItem", {
    from: auth_id, 
    to: getMessengerId(),
    update: status,
  });
}
function sendMessageDeleteEvent(messageId) {
  return clientSendChannel.trigger("client-messageDelete", {
    id: messageId,
  });
}
function sendDeleteConversationEvent() {
  return clientSendChannel.trigger("client-deleteConversation", {
    from: auth_id,
    to: getMessengerId(),
  });
}
function checkInternet(state, selector) {
  let net_errs = 0;
  const messengerTitle = $(".messenger-headTitle");
  switch (state) {
    case "connected":
      if (net_errs < 1) {
        messengerTitle.text(messengerTitleDefault);
        selector.addClass("successBG-rgba");
        selector.find("span").hide();
        selector.slideDown("fast", function () {
          selector.find(".ic-connected").show();
        });
        setTimeout(function () {
          $(".internet-connection").slideUp("fast");
        }, 3000);
      }
      break;
    case "connecting":
      messengerTitle.text($(".ic-connecting").text());
      selector.removeClass("successBG-rgba");
      selector.find("span").hide();
      selector.slideDown("fast", function () {
        selector.find(".ic-connecting").show();
      });
      net_errs = 1;
      break;
    default:
      messengerTitle.text($(".ic-noInternet").text());
      selector.removeClass("successBG-rgba");
      selector.find("span").hide();
      selector.slideDown("fast", function () {
        selector.find(".ic-noInternet").show();
      });
      net_errs = 1;
      break;
  }
}
let contactsPage = 1;
let contactsLoading = false;
let noMoreContacts = false;
function setContactsLoading(loading = false) {
  if (!loading) {
    $(".listOfContacts").find(".loading-contacts").remove();
  } else {
    $(".listOfContacts").append(
      `<div class="loading-contacts">${listItemLoading(4)}</div>`
    );
  }
  contactsLoading = loading;
}
function getContacts() {
  if (!contactsLoading && !noMoreContacts) {
    setContactsLoading(true);
    $.ajax({
      url: url + "/getContacts",
      method: "GET",
      data: { _token: csrfToken, page: contactsPage },
      dataType: "JSON",
      success: (data) => {
        setContactsLoading(false);
        if (contactsPage < 2) {
          $(".listOfContacts").html(data.contacts);
        } else {
          $(".listOfContacts").append(data.contacts);
        }
        updateSelectedContact();
        cssMediaQueries();
        noMoreContacts = contactsPage >= data?.last_page;
        if (!noMoreContacts) contactsPage += 1;
      },
      error: (error) => {
        setContactsLoading(false);
        console.error(error);
      },
    });
  }
}
function updateContactItem(user_id) {
  if (user_id != auth_id) {
    $.ajax({
      url: url + "/updateContacts",
      method: "POST",
      data: {
        _token: csrfToken,
        user_id,
      },
      dataType: "JSON",
      success: (data) => {
        $(".listOfContacts")
          .find(".messenger-list-item[data-contact=" + user_id + "]")
          .remove();
        if (data.contactItem) $(".listOfContacts").prepend(data.contactItem);
        if (user_id == getMessengerId()) updateSelectedContact(user_id);
        const totalContacts =
          $(".listOfContacts").find(".messenger-list-item")?.length || 0;
        if (totalContacts > 0) {
          $(".listOfContacts").find(".message-hint").hide();
        } else {
          $(".listOfContacts").find(".message-hint").show();
        }
        cssMediaQueries();
      },
      error: (error) => {
        console.error(error);
      },
    });
  }
}

function star(user_id) {
  if (getMessengerId() != auth_id) {
    $.ajax({
      url: url + "/star",
      method: "POST",
      data: { _token: csrfToken, user_id: user_id },
      dataType: "JSON",
      success: (data) => {
        data.status > 0
          ? $(".add-to-favorite").addClass("favorite")
          : $(".add-to-favorite").removeClass("favorite");
      },
      error: () => {
        console.error("Server error, check your response");
      },
    });
  }
}
function getFavoritesList() {
  $(".messenger-favorites").html(avatarLoading(4));
  $.ajax({
    url: url + "/favorites",
    method: "POST",
    data: { _token: csrfToken },
    dataType: "JSON",
    success: (data) => {
      if (data.count > 0) {
        $(".favorites-section").show();
        $(".messenger-favorites").html(data.favorites);
      } else {
        $(".favorites-section").hide();
      }
      cssMediaQueries();
    },
    error: () => {
      console.error("Server error, check your response");
    },
  });
}
function getSharedPhotos(user_id) {
  $.ajax({
    url: url + "/shared",
    method: "POST",
    data: { _token: csrfToken, user_id: user_id },
    dataType: "JSON",
    success: (data) => {
      $(".shared-photos-list").html(data.shared);
    },
    error: () => {
      console.error("Server error, check your response");
    },
  });
}
let searchPage = 1;
let noMoreDataSearch = false;
let searchLoading = false;
let searchTempVal = "";
function setSearchLoading(loading = false) {
  if (!loading) {
    $(".search-records").find(".loading-search").remove();
  } else {
    $(".search-records").append(
      `<div class="loading-search">${listItemLoading(4)}</div>`
    );
  }
  searchLoading = loading;
}
function messengerSearch(input) {
  if (input != searchTempVal) {
    searchPage = 1;
    noMoreDataSearch = false;
    searchLoading = false;
  }
  searchTempVal = input;
  if (!searchLoading && !noMoreDataSearch) {
    if (searchPage < 2) {
      $(".search-records").html("");
    }
    setSearchLoading(true);
    $.ajax({
      url: url + "/search",
      method: "GET",
      data: { _token: csrfToken, input: input, page: searchPage },
      dataType: "JSON",
      success: (data) => {
        setSearchLoading(false);
        if (searchPage < 2) {
          $(".search-records").html(data.records);
        } else {
          $(".search-records").append(data.records);
        }
        cssMediaQueries();
        noMoreDataSearch = searchPage >= data?.last_page;
        if (!noMoreDataSearch) searchPage += 1;
      },
      error: (error) => {
        setSearchLoading(false);
        console.error(error);
      },
    });
  }
}
function deleteConversation(id) {
  $.ajax({
    url: url + "/deleteConversation",
    method: "POST",
    data: { _token: csrfToken, id: id },
    dataType: "JSON",
    beforeSend: () => {
      app_modal({
        show: false,
        name: "delete",
      });
      app_modal({
        show: true,
        name: "alert",
        buttons: false,
        body: loadingSVG("32px", null, "margin:auto"),
      });
    },
    success: (data) => {
      $(".listOfContacts")
        .find(".messenger-list-item[data-contact=" + id + "]")
        .remove();
      IDinfo(id);
      if (!data.deleted)
        return alert("Error occurred, messages can not be deleted!");
      app_modal({
        show: false,
        name: "alert",
        buttons: true,
        body: "",
      });
      sendDeleteConversationEvent();
      sendContactItemUpdates(true);
    },
    error: () => {
      console.error("Server error, check your response");
    },
  });
}
function deleteMessage(id) {
  $.ajax({
    url: url + "/deleteMessage",
    method: "POST",
    data: { _token: csrfToken, id: id },
    dataType: "JSON",
    beforeSend: () => {
      app_modal({
        show: false,
        name: "delete",
      });
      app_modal({
        show: true,
        name: "alert",
        buttons: false,
        body: loadingSVG("32px", null, "margin:auto"),
      });
    },
    success: (data) => {
      $(".messages").find(`.message-card[data-id=${id}]`).remove();
      if (!data.deleted)
        console.error("Error occurred, message can not be deleted!");

      sendMessageDeleteEvent(id);
      app_modal({
        show: false,
        name: "alert",
        buttons: true,
        body: "",
      });
    },
    error: () => {
      console.error("Server error, check your response");
    },
  });
}
function updateSettings() {
  const formData = new FormData($("#update-settings")[0]);
  if (messengerColor) {
    formData.append("messengerColor", messengerColor);
  }
  if (dark_mode) {
    formData.append("dark_mode", dark_mode);
  }
  $.ajax({
    url: url + "/updateSettings",
    method: "POST",
    data: formData,
    dataType: "JSON",
    processData: false,
    contentType: false,
    beforeSend: () => {
      app_modal({
        show: false,
        name: "settings",
      });
      app_modal({
        show: true,
        name: "alert",
        buttons: false,
        body: loadingSVG("32px", null, "margin:auto"),
      });
    },
    success: (data) => {
      if (data.error) {
        app_modal({
          show: true,
          name: "alert",
          buttons: true,
          body: data.msg,
        });
      } else {
        app_modal({
          show: false,
          name: "alert",
          buttons: true,
          body: "",
        });
        location.reload(true);
      }
    },
    error: () => {
      console.error("Server error, check your response");
    },
  });
}
function setActiveStatus(status) {
  $.ajax({
    url: url + "/setActiveStatus",
    method: "POST",
    data: { _token: csrfToken, status: status },
    dataType: "JSON",
    success: (data) => {
    },
    error: () => {
      console.error("Server error, check your response");
    },
  });
}
$(document).ready(function () {
  getContacts();
  getFavoritesList();
  clearTimeout(typingTimeout);
  NProgress.configure({ showSpinner: false, minimum: 0.7, speed: 500 });
  autosize($(".m-send"));
  pusher.connection.bind("state_change", function (states) {
    let selector = $(".internet-connection");
    checkInternet(states.current, selector);
    channel.bind("pusher:subscription_succeeded", function () {
      if (getMessengerId() != 0) {
        if (
          $(".messenger-list-item")
            .find("tr[data-action]")
            .attr("data-action") == "1"
        ) {
          $(".messenger-listView").hide();
        }
        IDinfo(getMessengerId());
      }
    });
  });
  $(".messenger-listView-tabs a").on("click", function () {
    var dataView = $(this).attr("data-view");
    $(".messenger-listView-tabs a").removeClass("active-tab");
    $(this).addClass("active-tab");
    $(".messenger-tab").hide();
    $(".messenger-tab[data-view=" + dataView + "]").show();
  });
  $("body").on("click", ".messenger-list-item", function () {
    $(".messenger-list-item").removeClass("m-list-active");
    $(this).addClass("m-list-active");
    const userID = $(this).attr("data-contact");
    routerPush(document.title, `${url}/${userID}`);
    updateSelectedContact(userID);
  });
  $(".messenger-infoView nav a , .show-infoSide").on("click", function () {
    $(".messenger-infoView").toggle();
  });
  hScroller(".messenger-favorites");
  $("body").on("click", ".messenger-list-item", function () {
    if ($(this).find("tr[data-action]").attr("data-action") == "1") {
      $(".messenger-listView").hide();
    }
    const dataId = $(this).find("p[data-id]").attr("data-id");
    setMessengerId(dataId);
    IDinfo(dataId);
  });
  $("body").on("click", ".favorite-list-item", function () {
    if ($(this).find("div").attr("data-action") == "1") {
      $(".messenger-listView").hide();
    }
    const uid = $(this).find("div.avatar").attr("data-id");
    setMessengerId(uid);
    IDinfo(uid);
    updateSelectedContact(uid);
    routerPush(document.title, `${url}/${uid}`);
  });
  $(".listView-x").on("click", function () {
    $(".messenger-listView").hide();
  });
  $(".show-listView").on("click", function () {
    routerPush(document.title, `${url}/`);
    $(".messenger-listView").show();
  });
  $(".add-to-favorite").on("click", function () {
    star(getMessengerId());
  });
  cssMediaQueries();
  $("#message-form").on("submit", (e) => {
    e.preventDefault();
    sendMessage();
  });
  $("#message-form .m-send").on("keyup", (e) => {
    if (e.which == 13 || e.keyCode == 13) {
      if (!e.shiftKey) {
        triggered = isTyping(false);
        sendMessage();
      }
    }
  });
  $("body").on("change", ".upload-attachment", (e) => {
    let file = e.target.files[0];
    if (!attachmentValidate(file)) return false;
    let reader = new FileReader();
    let sendCard = $(".messenger-sendCard");
    reader.readAsDataURL(file);
    reader.addEventListener("loadstart", (e) => {
      $("#message-form").before(loadingSVG());
    });
    reader.addEventListener("load", (e) => {
      $(".messenger-sendCard").find(".loadingSVG").remove();
      if (!file.type.match("image.*")) {
        sendCard.find(".attachment-preview").remove(); 
        sendCard.prepend(attachmentTemplate("file", file.name));
      } else {
        sendCard.find(".attachment-preview").remove();
        sendCard.prepend(
          attachmentTemplate("image", file.name, e.target.result)
        );
      }
    });
  });

  function attachmentValidate(file) {
    const fileElement = $(".upload-attachment");
    const { name: fileName, size: fileSize } = file;
    const fileExtension = fileName.split(".").pop();
    if (
      !chatify.allAllowedExtensions.includes(
        fileExtension.toString().toLowerCase()
      )
    ) {
      alert("file type not allowed");
      fileElement.val("");
      return false;
    }
    if (fileSize > chatify.maxUploadSize) {
      alert("File is too large!");
      return false;
    }
    return true;
  }
  $("body").on("click", ".attachment-preview .cancel", () => {
    cancelAttachment();
  });
  $("#message-form .m-send").on("keydown", () => {
    if (typingNow < 1) {
      isTyping(true);
      typingNow = 1;
    }
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(function () {
      isTyping(false);
      typingNow = 0;
    }, 1000);
  });
  $("body").on("click", ".chat-image", function () {
    let src = $(this).css("background-image").split(/"/)[1];
    $("#imageModalBox").show();
    $("#imageModalBoxSrc").attr("src", src);
  });
  $(".imageModal-close").on("click", function () {
    $("#imageModalBox").hide();
  });
  $(".messenger-search").on("focus", function () {
    $(".messenger-tab").hide();
    $('.messenger-tab[data-view="search"]').show();
  });
  $(".messenger-search").on("blur", function () {
    setTimeout(function () {
      $(".messenger-tab").hide();
      $('.messenger-tab[data-view="users"]').show();
    }, 200);
  });
  const debouncedSearch = debounce(function () {
    const value = $(".messenger-search").val();
    messengerSearch(value);
  }, 500);
  $(".messenger-search").on("keyup", function (e) {
    const value = $(this).val();
    if ($.trim(value).length > 0) {
      $(".messenger-search").trigger("focus");
      debouncedSearch();
    } else {
      $(".messenger-tab").hide();
      $('.messenger-listView-tabs a[data-view="users"]').trigger("click");
    }
  });
  $(".messenger-infoView-btns .delete-conversation").on("click", function () {
    app_modal({
      name: "delete",
    });
  });
  $("body").on("click", ".message-card .actions .delete-btn", function () {
    app_modal({
      name: "delete",
      data: $(this).data("id"),
    });
  });
  $(".app-modal[data-name=delete]")
    .find(".app-modal-footer .delete")
    .on("click", function () {
      const id = $("body")
        .find(".app-modal[data-name=delete]")
        .find(".app-modal-card")
        .attr("data-modal");
      if (id == 0) {
        deleteConversation(getMessengerId());
      } else {
        deleteMessage(id);
      }
      app_modal({
        show: false,
        name: "delete",
      });
    });
  $(".app-modal[data-name=delete]")
    .find(".app-modal-footer .cancel")
    .on("click", function () {
      app_modal({
        show: false,
        name: "delete",
      });
    });
  $("body").on("click", ".settings-btn", function (e) {
    e.preventDefault();
    app_modal({
      show: true,
      name: "settings",
    });
  });
  $("#update-settings").on("submit", (e) => {
    e.preventDefault();
    updateSettings();
  });
  $(".app-modal[data-name=settings]")
    .find(".app-modal-footer .cancel")
    .on("click", function () {
      app_modal({
        show: false,
        name: "settings",
      });
      cancelUpdatingAvatar();
    });
  $("body").on("change", ".upload-avatar", (e) => {
    if (defaultAvatarInSettings == null) {
      defaultAvatarInSettings = $(".upload-avatar-preview").css(
        "background-image"
      );
    }
    let file = e.target.files[0];
    if (!attachmentValidate(file)) return false;
    let reader = new FileReader();
    reader.readAsDataURL(file);
    reader.addEventListener("loadstart", (e) => {
      $(".upload-avatar-preview").append(
        loadingSVG("42px", "upload-avatar-loading")
      );
    });
    reader.addEventListener("load", (e) => {
      $(".upload-avatar-preview").find(".loadingSVG").remove();
      if (!file.type.match("image.*")) {
        console.error("File you selected is not an image!");
      } else {
        $(".upload-avatar-preview").css(
          "background-image",
          'url("' + e.target.result + '")'
        );
      }
    });
  });
  $("body").on("click", ".update-messengerColor .color-btn", function () {
    messengerColor = $(this).attr("data-color");
    $(".update-messengerColor .color-btn").removeClass("m-color-active");
    $(this).addClass("m-color-active");
  });
  $("body").on("click", ".dark-mode-switch", function () {
    if ($(this).attr("data-mode") == "0") {
      $(this).attr("data-mode", "1");
      $(this).removeClass("far");
      $(this).addClass("fas");
      dark_mode = "dark";
    } else {
      $(this).attr("data-mode", "0");
      $(this).removeClass("fas");
      $(this).addClass("far");
      dark_mode = "light";
    }
  });
  actionOnScroll(
    ".m-body.messages-container",
    function () {
      fetchMessages(getMessengerId());
    },
    true
  );
  actionOnScroll(".messenger-tab.users-tab", function () {
    getContacts();
  });
  actionOnScroll(".messenger-tab.search-tab", function () {
    messengerSearch($(".messenger-search").val());
  });
});
let previousMessengerId = getMessengerId();
const observer = new MutationObserver(function (mutations) {
  if (getMessengerId() !== previousMessengerId) {
    previousMessengerId = getMessengerId();
    initClientChannel();
  }
});
const config = { subtree: true, childList: true };
observer.observe(document, config);
var resizeTimeout;
window.visualViewport.addEventListener("resize", (e) => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(function () {
    const h = e.target.height;
    if (h) {
      $(".messenger-messagingView").css({ height: h + "px" });
    }
  }, 100);
});
const emojiButton = document.querySelector(".emoji-button");

const emojiPicker = new EmojiButton({
  theme: messengerTheme,
  autoHide: false,
  position: "top-start",
});

emojiButton.addEventListener("click", (e) => {
  e.preventDefault();
  emojiPicker.togglePicker(emojiButton);
});

emojiPicker.on("emoji", (emoji) => {
  const el = messageInput[0];
  const startPos = el.selectionStart;
  const endPos = el.selectionEnd;
  const value = messageInput.val();
  const newValue =
    value.substring(0, startPos) +
    emoji +
    value.substring(endPos, value.length);
  messageInput.val(newValue);
  el.selectionStart = el.selectionEnd = startPos + emoji.length;
  el.focus();
});
function playNotificationSound(soundName, condition = false) {
  if ((document.hidden || condition) && chatify.sounds.enabled) {
    const sound = new Audio(
      `/${chatify.sounds.public_path}/${chatify.sounds[soundName]}`
    );
    sound.play();
  }
}
function updateElementsDateToTimeAgo() {
  $(".message-time").each(function () {
    const time = $(this).attr("data-time");
    $(this).find(".time").text(dateStringToTimeAgo(time));
  });
  $(".contact-item-time").each(function () {
    const time = $(this).attr("data-time");
    $(this).text(dateStringToTimeAgo(time));
  });
}
setInterval(() => {
  updateElementsDateToTimeAgo();
}, 60000);
