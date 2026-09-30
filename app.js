const $ = x => document.getElementById(x);
let current = null;

const DEMO_EQUIPMENT = {
  "EQ-00400": {
    eqId:"EQ-00400", make:"Konica Minolta", model:"bizhub C554e",
    serial:"A79R0112345", location:"Main Office", branch:"Chicago"
  },
  "EQ-00401": {
    eqId:"EQ-00401", make:"Canon", model:"imageRUNNER ADVANCE C5535",
    serial:"DEMO123456", location:"Accounting", branch:"Joliet"
  }
};

function norm(v){
  return (v||"").toUpperCase().replace(/^EQ-/,"").replace(/[^A-Z0-9]/g,"");
}

function lookup(){
  const n = norm($("eq").value);
  if(!n){ $("message").textContent = "Enter an Equipment ID."; return; }

  const id = "EQ-" + n;
  const e = DEMO_EQUIPMENT[id] || {
    eqId:id, make:"", model:"", serial:"", location:"", branch:""
  };

  current = id;
  $("eqView").textContent = id;
  $("make").value = e.make || "";
  $("model").value = e.model || "";
  $("serial").value = e.serial || "";
  $("location").value = e.location || "";
  $("branch").value = e.branch || "";

  $("identify").classList.add("hidden");
  $("equipmentCard").classList.remove("hidden");
  $("message").textContent = "";
}

$("continue").onclick = lookup;
$("eq").onkeydown = e => { if(e.key === "Enter") lookup(); };

$("change").onclick = () => {
  $("equipmentCard").classList.add("hidden");
  $("identify").classList.remove("hidden");
  $("eq").focus();
};

$("barcode").onclick = async () => {
  if(!("BarcodeDetector" in window)){
    $("message").textContent =
      "Barcode scanning is not supported by this browser. Enter the EQ number instead.";
    return;
  }
  try{
    const supported = await BarcodeDetector.getSupportedFormats();
    const formats = supported.filter(x => ["code_128","code_39","qr_code"].includes(x));
    if(!formats.length) throw new Error("No supported barcode format.");

    const detector = new BarcodeDetector({formats});
    const stream = await navigator.mediaDevices.getUserMedia({
      video:{facingMode:{ideal:"environment"}}
    });
    const video = document.createElement("video");
    video.srcObject = stream;
    await video.play();
    video.style.cssText =
      "position:fixed;inset:0;width:100%;height:100%;object-fit:cover;z-index:20;background:#000";
    document.body.appendChild(video);

    const loop = async () => {
      try{
        const codes = await detector.detect(video);
        if(codes.length){
          const raw = codes[0].rawValue || "";
          stream.getTracks().forEach(t => t.stop());
          video.remove();
          $("eq").value = raw;
          lookup();
          return;
        }
      }catch(e){}
      requestAnimationFrame(loop);
    };
    loop();
  }catch(e){
    $("message").textContent =
      "Camera access was not available. Enter the EQ number instead.";
  }
};

document.querySelectorAll(".tab").forEach(t => {
  t.onclick = () => {
    document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(x => x.classList.remove("active"));
    t.classList.add("active");
    $(t.dataset.panel).classList.add("active");
  };
});

function nextRequestId(){
  const key = "attoRequestCounter";
  const n = (parseInt(localStorage.getItem(key) || "0",10) || 0) + 1;
  localStorage.setItem(key,String(n));
  return "TEST-" + String(n).padStart(6,"0");
}

function saveRequest(type){
  const equipment = {
    eqId:current,
    make:$("make").value,
    model:$("model").value,
    serial:$("serial").value,
    location:$("location").value,
    branch:$("branch").value
  };

  let details = {};
  if(type === "toner"){
    details = {
      cyan:+$("cyan").value||0, magenta:+$("magenta").value||0,
      yellow:+$("yellow").value||0, black:+$("black").value||0
    };
  }
  if(type === "service"){
    details = {
      problem:$("problem").value, user:$("user").value,
      phone:$("phone").value, extension:$("ext").value,
      preferred:$("preferred").value
    };
  }
  if(type === "clicks"){
    details = {
      black:$("mb").value, color:$("mc").value,
      scan:$("ms").value, total:$("mt").value,
      user:$("meterUser").value
    };
  }

  const request = {
    requestId:nextRequestId(),
    submittedAt:new Date().toISOString(),
    type, eqId:current, equipment, details
  };

  const key = "attoEquipmentRequests";
  const requests = JSON.parse(localStorage.getItem(key) || "[]");
  requests.push(request);
  localStorage.setItem(key, JSON.stringify(requests));

  $("success").classList.remove("hidden");
  $("success").innerHTML =
    "<b>TEST request saved on this device.</b><br>" +
    "Request ID: " + request.requestId +
    "<br>Submitted: " + new Date(request.submittedAt).toLocaleString() +
    "<br><br>This is a GitHub Pages test only; it is not yet sent to Atto's ERP.";
}

document.querySelectorAll(".submit").forEach(b =>
  b.onclick = () => saveRequest(b.dataset.type)
);
