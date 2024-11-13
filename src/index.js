import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { OpenAI } from "openai";
import dotenv from "dotenv";
dotenv.config();

// ESモジュールの形式で__dirnameを設定
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 静的ファイルのサービング
app.use(express.static(path.join(__dirname, "public")));

// サーバーの作成
const server = http.createServer(app);
const PORT = 8080;

server.listen(PORT, () => {
  console.log(`server start!!: ${PORT}`);
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Socket.IOの設定
const io = new Server(server);

io.on("connection", (socket) => {
  socket.emit("mylogin", socket.id.substring(0, 6));
  io.emit("login", socket.id.substring(0, 6));

  socket.on("disconnect", () => {
    io.emit("logout", socket.id.substring(0, 6));
  });

  socket.on("post", (data) => {
    const regexp = /角野卓造/;
    io.emit("post", { id: socket.id.substring(0, 6), post: data });
    if (regexp.test(data)) {
      data = "角野卓造じゃねーよ";
      io.emit("post", { id: "Computer", post: data });
    }
  });

  socket.on("aibot", async function (data) {
    io.sockets.emit("post", { id: socket.id.substr(0, 6), post: data });
    let text = await getAnswer(data);
    console.log(text);
    //console.log(response.data.choices[0].text);
    io.sockets.emit("aibot", {
      id: "AI_bot",
      post: text,
    });
  });

  socket.on("stamp", (data) => {
    io.emit("stamp", { id: socket.id.substring(0, 6), stamp: data });
  });

  socket.on("icon", (data) => {
    io.emit("icon", { id: socket.id.substring(0, 6), icon: data });
  });

  socket.on("img", (data) => {
    io.emit("img", { id: socket.id.substring(0, 6), img: data });
  });

  socket.on("sound", (data) => {
    io.emit("sound", { id: socket.id.substring(0, 6), sound: data });
  });

  socket.on("join", (room) => {
    socket.join(room);
    console.log(`New room(${room}) created.`);
  });

  socket.on("sensor", (data) => {
    io.to(data.room).emit("sensor", data);
  });

  socket.on("sensor-toall", (data) => {
    io.emit("sensor", data);
  });
});

/*

import dotenv from "dotenv";
dotenv.config();
const { OpenAI } = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY2,
});

// Express
const express = require("express"),
  https = require("http"),
  app = express();

// Gatten System
app.use(express.static(__dirname + "/public"));

const server = https.createServer(app).listen(8080);
console.log("server start!!:", 8080);

// Socket.IO
const io = require("socket.io")(server);

io.sockets.on("connection", function (socket) {
  socket.emit("mylogin", socket.id.substr(0, 6));
  io.sockets.emit("login", socket.id.substr(0, 6));

  socket.on("disconnect", function () {
    io.sockets.emit("logout", socket.id.substr(0, 6));
  });

  socket.on("post", async function (data) {
    io.sockets.emit("post", { id: socket.id.substr(0, 6), post: data });
  });

  socket.on("aibot", async function (data) {
    io.sockets.emit("post", { id: socket.id.substr(0, 6), post: data });
    let text = await getAnswer(data);
    console.log(text);
    //console.log(response.data.choices[0].text);
    io.sockets.emit("aibot", {
      id: "AI_bot",
      post: text,
    });
  });

  socket.on("stamp", function (data) {
    io.sockets.emit("stamp", { id: socket.id.substr(0, 6), stamp: data });
  });

  socket.on("img", function (data) {
    io.sockets.emit("img", { id: socket.id.substr(0, 6), img: data });
  });
});
*/
const maxUserTokens = 5;
const systemTokens = [
  {
    role: "system",
    content:
      "私は、猫です。7歳でメスです。名前はムギと言います。語尾にニャンをつけて可愛く答えます。回答は60字以内。",
    //別の面白いプロンプトの例：
    //"入力した仕様のp5.jsのプログラムコードを出力します。出力するのはJavaScriptのコードのみで言葉は一切出力しません。"
  },
];
const userTokens = [];
async function getAnswer(text) {
  userTokens.push({ role: "user", content: text });
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: systemTokens.concat(userTokens),
    // temperature: 1,
    // max_tokens: 256,
    // top_p: 1,
    // frequency_penalty: 0,
    // presence_penalty: 0,
  });
  console.log(response);
  const answer = response.choices[0].message.content;
  userTokens.push({ role: "assistant", content: answer });
  if (userTokens.length - 2 >= maxUserTokens * 2) {
    userTokens.splice(0, 2);
  }
  console.log(userTokens);
  return answer;
}
