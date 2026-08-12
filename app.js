"use strict";

/*
    ANGHEZI CHAT
    WebSocket Client
*/

const WS_URL = "wss://anghezi-chat-server.onrender.com/ws";

let socket = null;
let username = "";
let reconnectTimer = null;
let reconnectAttempts = 0;

const modal = document.getElementById("usernameModal");
const usernameInput = document.getElementById("usernameInput");
const joinButton = document.getElementById("joinButton");

const messages = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");

const onlineCount = document.getElementById("onlineCount");
const usersList = document.getElementById("usersList");

const connectionStatus =
    document.getElementById("connectionStatus");

const typingStatus =
    document.getElementById("typingStatus");

const emojiButton =
    document.getElementById("emojiButton");


/* -----------------------------
   USERNAME
----------------------------- */

const savedUsername =
    localStorage.getItem("anghezi_username");

if (savedUsername) {
    username = savedUsername;
    modal.style.display = "none";
    connect();
} else {
    modal.style.display = "grid";
}

joinButton.addEventListener("click", joinChat);

usernameInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        joinChat();
    }
});

function joinChat() {

    const name =
        usernameInput.value.trim();

    if (!name) {
        usernameInput.focus();
        return;
    }

    if (name.length < 2) {
        alert("نام کاربری باید حداقل ۲ حرف باشد.");
        return;
    }

    username =
        name.substring(0, 20);

    localStorage.setItem(
        "anghezi_username",
        username
    );

    modal.style.display = "none";

    connect();
}


/* -----------------------------
   WEBSOCKET
----------------------------- */

function connect() {

    if (
        socket &&
        (
            socket.readyState === WebSocket.OPEN ||
            socket.readyState === WebSocket.CONNECTING
        )
    ) {
        return;
    }

    updateConnection("در حال اتصال...");

    try {

        socket = new WebSocket(WS_URL);

    } catch (error) {

        updateConnection("خطا در اتصال");

        scheduleReconnect();

        return;
    }


    socket.addEventListener("open", () => {

        reconnectAttempts = 0;

        updateConnection("🟢 متصل");

        send({
            type: "join",
            username: username
        });

        messageInput.disabled = false;
        sendButton.disabled = false;

        messageInput.focus();

    });


    socket.addEventListener("message", event => {

        try {

            const data =
                JSON.parse(event.data);

            handleServerMessage(data);

        } catch (error) {

            console.error(
                "Invalid server message:",
                error
            );
        }

    });


    socket.addEventListener("close", () => {

        updateConnection("🔴 قطع شد");

        messageInput.disabled = true;
        sendButton.disabled = true;

        addSystemMessage(
            "اتصال قطع شد؛ تلاش برای اتصال مجدد..."
        );

        scheduleReconnect();

    });


    socket.addEventListener("error", error => {

        console.error(
            "WebSocket error:",
            error
        );

    });
}


/* -----------------------------
   RECONNECT
----------------------------- */

function scheduleReconnect() {

    if (reconnectTimer) {
        return;
    }

    reconnectAttempts++;

    const delay =
        Math.min(
            10000,
            1000 * reconnectAttempts
        );

    reconnectTimer =
        setTimeout(() => {

            reconnectTimer = null;

            connect();

        }, delay);
}


/* -----------------------------
   SERVER MESSAGES
----------------------------- */

function handleServerMessage(data) {

    if (data.type === "message") {

        addMessage(
            data.username,
            data.message,
            data.time
        );

        return;
    }


    if (data.type === "system") {

        addSystemMessage(
            data.message
        );

        return;
    }


    if (data.type === "online") {

        const count =
            Number(data.count) || 0;

        onlineCount.textContent =
            count;

        updateUsersCount(count);

        return;
    }
}


/* -----------------------------
   SEND MESSAGE
----------------------------- */

sendButton.addEventListener(
    "click",
    sendMessage
);

messageInput.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {

            event.preventDefault();

            sendMessage();

        }

    }
);


function sendMessage() {

    const text =
        messageInput.value.trim();

    if (!text) {
        return;
    }

    if (
        !socket ||
        socket.readyState !== WebSocket.OPEN
    ) {

        addSystemMessage(
            "اتصال به سرور برقرار نیست."
        );

        return;
    }


    if (text.length > 500) {

        addSystemMessage(
            "پیام نمی‌تواند بیشتر از ۵۰۰ کاراکتر باشد."
        );

        return;
    }


    send({
        type: "message",
        message: text
    });

    messageInput.value = "";

    messageInput.focus();
}


function send(data) {

    if (
        socket &&
        socket.readyState === WebSocket.OPEN
    ) {

        socket.send(
            JSON.stringify(data)
        );

    }
}


/* -----------------------------
   DISPLAY MESSAGE
----------------------------- */

function addMessage(
    sender,
    text,
    time
) {

    const wrapper =
        document.createElement("div");

    const isOwn =
        sender === username;

    wrapper.className =
        `message ${isOwn ? "own" : "other"}`;


    const head =
        document.createElement("div");

    head.className =
        "message-head";


    const name =
        document.createElement("span");

    name.className =
        "message-name";

    name.textContent =
        sender;


    const clock =
        document.createElement("span");

    clock.textContent =
        time || "";


    head.appendChild(name);
    head.appendChild(clock);


    const bubble =
        document.createElement("div");

    bubble.className =
        "message-bubble";

    bubble.textContent =
        text;


    wrapper.appendChild(head);
    wrapper.appendChild(bubble);

    messages.appendChild(wrapper);

    scrollToBottom();
}


/* -----------------------------
   SYSTEM MESSAGE
----------------------------- */

function addSystemMessage(text) {

    const element =
        document.createElement("div");

    element.className =
        "system-message";

    element.textContent =
        text;

    messages.appendChild(element);

    scrollToBottom();
}


/* -----------------------------
   USERS
----------------------------- */

function updateUsersCount(count) {

    if (count <= 0) {

        usersList.innerHTML = "";

        return;
    }

    /*
        سرور فعلی فقط تعداد کاربران را
        می‌فرستد، نه اسم همه کاربران.
        فعلاً کاربر فعلی را نمایش می‌دهیم.
    */

    usersList.innerHTML = "";

    const user =
        document.createElement("div");

    user.className =
        "user-item";


    const dot =
        document.createElement("span");

    dot.className =
        "user-dot";


    const name =
        document.createElement("span");

    name.textContent =
        username || "شما";


    user.appendChild(dot);
    user.appendChild(name);

    usersList.appendChild(user);


    if (count > 1) {

        const other =
            document.createElement("div");

        other.className =
            "user-item";

        other.innerHTML =
            `
            <span class="user-dot"></span>
            <span>${count - 1} کاربر دیگر</span>
            `;

        usersList.appendChild(other);
    }
}


/* -----------------------------
   CONNECTION STATUS
----------------------------- */

function updateConnection(text) {

    connectionStatus.textContent =
        text;
}


/* -----------------------------
   SCROLL
----------------------------- */

function scrollToBottom() {

    requestAnimationFrame(() => {

        messages.scrollTop =
            messages.scrollHeight;

    });
}


/* -----------------------------
   EMOJI
----------------------------- */

const emojis = [
    "😀",
    "😂",
    "😍",
    "😎",
    "🔥",
    "⚽",
    "🏆",
    "❤️",
    "👏",
    "💙",
    "💪",
    "🤣",
    "😱",
    "🎉"
];

let emojiIndex = 0;

emojiButton.addEventListener(
    "click",
    () => {

        messageInput.value +=
            emojis[emojiIndex];

        emojiIndex++;

        if (
            emojiIndex >= emojis.length
        ) {
            emojiIndex = 0;
        }

        messageInput.focus();

    }
);


/* -----------------------------
   TYPING PLACEHOLDER
----------------------------- */

let typingTimeout = null;

messageInput.addEventListener(
    "input",
    () => {

        typingStatus.textContent =
            messageInput.value.length > 0
                ? "در حال نوشتن..."
                : "";

        clearTimeout(typingTimeout);

        typingTimeout =
            setTimeout(() => {

                typingStatus.textContent = "";

            }, 1200);

    }
);


/* -----------------------------
   START
----------------------------- */

messageInput.disabled = true;
sendButton.disabled = true;

updateConnection("در انتظار ورود...");

