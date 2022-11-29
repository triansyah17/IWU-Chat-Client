import "../assets/styles/home.css";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import io from "socket.io-client";
import { useSearchParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import ListUser from "../components/ListUser";
import Profile from "../components/Profile";
import Chat from "../components/Chat";
import { getDetailReceiver, getDetailUser } from "../redux/actions/user";

export default function Home() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { detailUser, detailReceiver } = useSelector((state) => state);
  const [queryParams] = useSearchParams();
  const [tab, setTab] = useState("");

  const [socketio, setSocketio] = useState(null);
  const [message, setMessage] = useState("");
  const [listChat, setListChat] = useState([]);
  const [activeReceiver, setActiveReceiver] = useState("");

  useEffect(() => {
    document.title = `${process.env.REACT_APP_APP_NAME} - Home`;
    dispatch(getDetailUser(localStorage.getItem("id"), navigate));
  }, []);

  useEffect(() => {
    setTab("");
    if (queryParams.get("tab")) {
      setTab(queryParams.get("tab"));
    }
  }, [queryParams]);

  useEffect(() => {
    const socket = io(process.env.REACT_APP_API_URL);
    socket.on("send-message-response", (response) => {
      const receiver = localStorage.getItem("receiver");

      if (response.length) {
        if (
          receiver === response[0].sender_id ||
          receiver === response[0].receiver_id
        ) {
          setListChat(response);

          setTimeout(() => {
            const elem = document.getElementById("chatMenuMessage");
            elem.scrollTop = elem.scrollHeight;
          }, 500);
        }
      }
    });
    setSocketio(socket);
  }, []);

  const selectReceiver = (receiverId) => {
    setListChat([]);
    dispatch(getDetailReceiver(receiverId));
    setActiveReceiver(receiverId);
    localStorage.setItem("receiver", receiverId);
    socketio.emit("join-room", localStorage.getItem("id"));
    socketio.emit("chat-history", {
      sender: localStorage.getItem("id"),
      receiver: receiverId,
    });
  };

  const onSendMessage = (e) => {
    e.preventDefault();

    if (!message) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Message empty!",
      });
      return;
    }

    const data = {
      sender: localStorage.getItem("id"),
      receiver: activeReceiver,
      date: new Date(),
      chat: message,
    };
    socketio.emit("send-message", data);

    const payload = {
      sender_id: localStorage.getItem("id"),
      receiver_id: activeReceiver,
      photo: detailUser.data.photo,
      date: new Date(),
      chat: message,
      id: new Date(),
    };
    setListChat([...listChat, payload]);

    setMessage("");

    setTimeout(() => {
      const elem = document.getElementById("chatMenuMessage");
      elem.scrollTop = elem.scrollHeight;
    }, 100);
  };

  const onDeleteMessage = (chat) => {
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        const data = {
          sender: chat.sender_id,
          receiver: chat.receiver_id,
          chatId: chat.id,
        };
        socketio.emit("delete-message", data);
      }
    });
  };

  const onEditMessage = (newChat, chat) => {
    if (!newChat) {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Message empty!",
      });
      return;
    }

    const data = {
      sender: chat.sender_id,
      receiver: chat.receiver_id,
      chatId: chat.id,
      chat: newChat,
    };
    socketio.emit("edit-message", data);

    document.getElementById("close").click();
  };

  return (
    <div className="container-fluid">
      <div className="row">
        {tab === "profile" ? (
          <Profile />
        ) : (
          <ListUser setTab={setTab} selectReceiver={selectReceiver} />
        )}
        <Chat
          detailReceiver={detailReceiver}
          activeReceiver={activeReceiver}
          listChat={listChat}
          message={message}
          setMessage={setMessage}
          onSendMessage={onSendMessage}
          onDeleteMessage={onDeleteMessage}
          onEditMessage={onEditMessage}
        />
      </div>
    </div>
  );
}
