// -----------------------------
// Config
// -----------------------------
const INTUITION_RPC = "https://testnet.rpc.intuition.systems";
const CHAIN_ID_HEX = "0x350B"; // 13579 in hex
const TARGET_ADDRESS = "0x5abc8a77cb6a174a6991aa62752cc4ad07ac517b";
const PAYMENT_AMOUNT = "0.0001"; // TRUST

let providerForEthers, signer, connectedAddress;

// UI refs
let connectBtn, walletMessage, startBtn, paymentStatus;

// -----------------------------
// Wallet connection
// -----------------------------
async function connectWallet() {
  setWalletMsg("Connecting...");
  connectBtn.disabled = true;

  try {
    if (window.ethereum) {
      providerForEthers = new ethers.providers.Web3Provider(window.ethereum, "any");
      await window.ethereum.request({ method: "eth_requestAccounts" });

      try {
        await window.ethereum.request({ method:"wallet_switchEthereumChain", params:[{ chainId: CHAIN_ID_HEX }] });
      } catch {
        await window.ethereum.request({
          method:"wallet_addEthereumChain",
          params:[{ chainId: CHAIN_ID_HEX, chainName:"Intuition Testnet", rpcUrls:[INTUITION_RPC],
          nativeCurrency:{ name:"TRUST", symbol:"TRUST", decimals:18 }}]
        });
      }

      signer = providerForEthers.getSigner();
      connectedAddress = await signer.getAddress();
      setWalletMsg("Connected: " + shortAddr(connectedAddress));
      setPayStatus("Ready — press Start", "pending");
      startBtn.disabled = false;
      return;
    }
  } catch (err) {
    setWalletMsg("Connection failed");
    setPayStatus("Error: " + err.message, "error");
    connectBtn.disabled = false;
  }
}

async function signTxAndWait() {
  if (!signer) return false;
  try {
    setPayStatus("Sending tx...", "pending");
    const tx = await signer.sendTransaction({
      to: TARGET_ADDRESS,
      value: ethers.utils.parseUnits(PAYMENT_AMOUNT, 18)
    });
    setPayStatus("Waiting for confirm...", "pending");
    await tx.wait(1);
    setPayStatus("Confirmed!", "success");
    return true;
  } catch (err) {
    setPayStatus("Tx failed: " + err.message, "error");
    return false;
  }
}

function setWalletMsg(t){ walletMessage.textContent=t; }
function setPayStatus(t,cls){ paymentStatus.textContent=t; paymentStatus.className="payment-status "+(cls||""); }
function shortAddr(a){ return a.slice(0,6)+"…"+a.slice(-4); }

// -----------------------------
// Game
// -----------------------------
let canvas, ctx, scoreEl, gameOverEl, finalScoreEl, startMenu, gameSection, countdownEl;
let snake=[{x:200,y:200}], direction={x:0,y:0}, food={x:0,y:0}, score=0, running=false, speed=150, loop;
let grid=20;
let snakeImg=new Image(), foodImg=new Image();
snakeImg.src="snake.png"; foodImg.src="food.png";

function initGame(){
  connectBtn=document.getElementById("connectWalletBtn");
  walletMessage=document.getElementById("walletMessage");
  startBtn=document.getElementById("startBtn");
  paymentStatus=document.getElementById("paymentStatus");
  connectBtn.addEventListener("click", connectWallet);
  startBtn.addEventListener("click", async ()=>{
    startBtn.disabled=true;
    const ok=await signTxAndWait();
    if(ok) startGame();
    else startBtn.disabled=false;
  });

  canvas=document.getElementById("gameCanvas"); ctx=canvas.getContext("2d");
  scoreEl=document.getElementById("score");
  gameOverEl=document.getElementById("gameOver");
  finalScoreEl=document.getElementById("finalScore");
  startMenu=document.getElementById("startMenu");
  gameSection=document.getElementById("gameSection");

  countdownEl=document.createElement("div");
  countdownEl.style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:60px;font-weight:bold;color:white;";
  countdownEl.id="countdown"; countdownEl.className="hidden";
  document.body.appendChild(countdownEl);

  document.addEventListener("keydown",keyPress);
  genFood();
}

// --- Start Game ---
function startGame(){
  snake=[{x:200,y:200}]; direction={x:0,y:0}; score=0; speed=150;
  scoreEl.textContent=score; gameOverEl.classList.add("hidden");
  startMenu.classList.add("hidden"); gameSection.classList.remove("hidden");
  clearInterval(loop); countdown(3);
}

// --- Retry Game (with new tx) ---
async function retryGame() {
  const retryBtn = document.getElementById("retryBtn");
  retryBtn.disabled = true;
  setPayStatus("Preparing transaction...", "pending");

  const ok = await signTxAndWait();
  if (ok) {
    setTimeout(() => {
      setPayStatus("Starting game...", "success");
      startGame();
      retryBtn.disabled = false;
    }, 500);
  } else {
    setPayStatus("Retry failed", "error");
    retryBtn.disabled = false;
  }
}

function countdown(n){
  countdownEl.classList.remove("hidden"); countdownEl.textContent=n;
  if(n>0) setTimeout(()=>countdown(n-1),1000);
  else{ countdownEl.textContent="Go!"; setTimeout(()=>{countdownEl.classList.add("hidden"); begin();},700); }
}

function begin(){ direction={x:1,y:0}; running=true; loop=setInterval(frame,speed); }
function frame(){ update(); draw(); }

function update(){
  if(!running)return;
  let head={x:snake[0].x+direction.x*grid,y:snake[0].y+direction.y*grid};
  if(head.x<0||head.y<0||head.x>=canvas.width||head.y>=canvas.height) return end();
  for(let p of snake) if(p.x===head.x&&p.y===head.y) return end();
  snake.unshift(head);
  if(head.x===food.x&&head.y===food.y){ score+=2; scoreEl.textContent=score; genFood();
    if(score%10===0&&speed>50){ speed-=10; clearInterval(loop); loop=setInterval(frame,speed); }
  } else snake.pop();
}

function draw(){
  ctx.fillStyle="#1a1f2e"; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(foodImg,food.x,food.y,grid,grid);
  for(let s of snake) ctx.drawImage(snakeImg,s.x,s.y,grid,grid);
}

function genFood(){ food.x=Math.floor(Math.random()*(canvas.width/grid))*grid; food.y=Math.floor(Math.random()*(canvas.height/grid))*grid; }

function end(){ running=false; clearInterval(loop); finalScoreEl.textContent=score; gameOverEl.classList.remove("hidden"); startMenu.classList.remove("hidden"); gameSection.classList.add("hidden"); }

function keyPress(e){
  if(!running)return;
  if(e.key==="ArrowUp"&&direction.y===0)direction={x:0,y:-1};
  else if(e.key==="ArrowDown"&&direction.y===0)direction={x:0,y:1};
  else if(e.key==="ArrowLeft"&&direction.x===0)direction={x:-1,y:0};
  else if(e.key==="ArrowRight"&&direction.x===0)direction={x:1,y:0};
}

function setDirection(d){
  if(!running)return;
  if(d==="up"&&direction.y===0)direction={x:0,y:-1};
  else if(d==="down"&&direction.y===0)direction={x:0,y:1};
  else if(d==="left"&&direction.x===0)direction={x:-1,y:0};
  else if(d==="right"&&direction.x===0)direction={x:1,y:0};
}

window.onload=initGame;