const express = require("express");
const axios = require("axios");

const app = express();

const PORT = process.env.PORT || 3000;

// =====================================
// TELEGRAM
// =====================================

const BOT_TOKEN =
"8946361967:AAGYJqEYyvi1eNILt0o0Y5BH2gUN1d6-8zs";

const CHAT_ID =
"761369515";

// =====================================
// PAIRS
// =====================================

const pairs = [

"BTCUSDT",
"ETHUSDT",
"BNBUSDT",
"XRPUSDT",
"SOLUSDT",
"DOGEUSDT",
"ADAUSDT",
"AVAXUSDT",
"LINKUSDT",
"SUIUSDT",
"INJUSDT",
"ARBUSDT",
"OPUSDT",
"SEIUSDT",
"WLDUSDT"

];

// =====================================
// LAST SIGNAL CACHE
// =====================================

let lastSignals = {};

// =====================================
// EMA
// =====================================

function ema(data, period){

let k = 2 / (period + 1);

let emaArray = [];

emaArray[0] = data[0];

for(let i=1;i<data.length;i++){

emaArray[i] =
data[i] * k +
emaArray[i-1] * (1-k);

}

return emaArray;

}

// =====================================
// RSI
// =====================================

function rsi(data,period=14){

let gains = 0;
let losses = 0;

for(let i=data.length-period;i<data.length;i++){

let diff =
data[i]-data[i-1];

if(diff>=0){

gains += diff;

}else{

losses -= diff;

}

}

let rs =
gains/(losses || 1);

return 100-(100/(1+rs));

}

// =====================================
// SMA
// =====================================

function sma(data,period){

let sliced =
data.slice(-period);

return sliced.reduce((a,b)=>a+b,0)/period;

}

// =====================================
// PATTERN
// =====================================

function detectPattern(candles){

let c1 = candles[candles.length-2];
let c2 = candles[candles.length-1];

let o1 = parseFloat(c1[1]);
let cl1 = parseFloat(c1[4]);

let o2 = parseFloat(c2[1]);
let h2 = parseFloat(c2[2]);
let l2 = parseFloat(c2[3]);
let cl2 = parseFloat(c2[4]);

// Bullish Engulfing

if(
cl1 < o1 &&
cl2 > o2 &&
cl2 > o1 &&
o2 < cl1
){

return{
pattern:"Bullish Engulfing",
signal:"BUY"
};

}

// Bearish Engulfing

if(
cl1 > o1 &&
cl2 < o2 &&
cl2 < o1 &&
o2 > cl1
){

return{
pattern:"Bearish Engulfing",
signal:"SELL"
};

}

// Hammer

let body =
Math.abs(cl2-o2);

let lower =
Math.min(cl2,o2)-l2;

let upper =
h2-Math.max(cl2,o2);

if(
lower > body*2 &&
upper < body
){

return{
pattern:"Hammer",
signal:"BUY"
};

}

// Shooting Star

if(
upper > body*2 &&
lower < body
){

return{
pattern:"Shooting Star",
signal:"SELL"
};

}

return{
pattern:"NONE",
signal:"WAIT"
};

}

// =====================================
// ANALYZE
// =====================================

function analyze(candles){

let closes =
candles.map(x=>parseFloat(x[4]));

let volumes =
candles.map(x=>parseFloat(x[5]));

let current =
closes[closes.length-1];

let ema20 =
ema(closes,20).pop();

let ema50 =
ema(closes,50).pop();

let currentRSI =
rsi(closes);

let currentVol =
volumes[volumes.length-1];

let volMA =
sma(volumes,20);

let pattern =
detectPattern(candles);

let bullishTrend =
ema20 > ema50;

let bearishTrend =
ema20 < ema50;

let volumeSpike =
currentVol > volMA;

let signal = "WAIT";

let hold = "NO TRADE";

let score = 40;

if(
pattern.signal=="BUY" &&
bullishTrend &&
currentRSI > 55 &&
volumeSpike
){

signal = "BUY";
hold = "Hold 1H to 4H";
score = 95;

}

if(
pattern.signal=="SELL" &&
bearishTrend &&
currentRSI < 45 &&
volumeSpike
){

signal = "SELL";
hold = "Hold 1H to 4H";
score = 95;

}

return{

signal,
pattern:pattern.pattern,
price:current,
hold,
score

};

}

// =====================================
// TELEGRAM ALERT
// =====================================

async function sendTelegram(message){

const url =
`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

await axios.post(url,{

chat_id:CHAT_ID,
text:message

});

}

// =====================================
// SCAN MARKET
// =====================================

async function scanMarket(){

console.log("Scanning Market...");

for(let pair of pairs){

try{

const response =
await axios.get(
`https://fapi.binance.com/fapi/v1/klines?symbol=${pair}&interval=15m&limit=120`
);

const candles =
response.data;

const result =
analyze(candles);

if(result.signal=="WAIT"){
continue;
}

if(lastSignals[pair]==result.signal){
continue;
}

lastSignals[pair]=result.signal;

const message = `

🚨 ELITE FUTURES ALERT 🚨

PAIR : ${pair}

SIGNAL : ${result.signal}

PATTERN : ${result.pattern}

AI SCORE : ${result.score}%

PRICE : ${result.price}

HOLD : ${result.hold}

TIMEFRAME : 15m

`;

await sendTelegram(message);

console.log(message);

}catch(err){

console.log(err.message);

}

}

}

// =====================================
// RUN EVERY 10 SEC
// =====================================

setInterval(scanMarket,10000);

// =====================================
// EXPRESS
// =====================================

app.get("/",(req,res)=>{

res.send("ELITE FUTURES BOT RUNNING");

});

app.listen(PORT,()=>{

console.log("SERVER STARTED");

});
