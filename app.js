// Firebase Config (já configurado para seu projeto)
const firebaseConfig = {
  apiKey: "AIzaSyDYmKSkQ8IMzMbN2xYkhTJHUbC3r20KWpY",
  authDomain: "gestao-empenhos-luiz.firebaseapp.com",
  projectId: "gestao-empenhos-luiz",
  storageBucket: "gestao-empenhos-luiz.appspot.com",
  messagingSenderId: "374624984511",
  appId: "1:374624984511:web:4590c1d3da85ddfcb0950a"
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

document.addEventListener("DOMContentLoaded", () => {
  const loginScreen=document.getElementById("loginScreen");
  const appScreen=document.getElementById("app");
  const loginBtn=document.getElementById("loginBtn");
  const logoutBtn=document.getElementById("logoutBtn");

  const cliente=document.getElementById("cliente");
  const produtos=document.getElementById("produtos");
  const quantidade=document.getElementById("quantidade");
  const tipo=document.getElementById("tipo");
  const motivo=document.getElementById("motivo");
  const liberacaoParcial=document.getElementById("liberacaoParcial");
  const dataRecebimento=document.getElementById("dataRecebimento");
  const dataEntrega=document.getElementById("dataEntrega");
  const dataPrevista=document.getElementById("dataPrevista");

  const pendentes=document.getElementById("pendentes");
  const programados=document.getElementById("programados");
  const liberados=document.getElementById("liberados");

  const searchEmpenho=document.getElementById("searchEmpenho");
  const itemChegou=document.getElementById("itemChegou");
  const verPendentes=document.getElementById("verPendentes");
  const indicadores=document.getElementById("indicadores");
  const exportExcelBtn=document.getElementById("exportExcel");

  loginBtn.addEventListener("click",()=>signInWithPopup(auth,provider));
  logoutBtn.addEventListener("click",()=>signOut(auth));

  onAuthStateChanged(auth,user=>{
    if(user){loginScreen.style.display="none";appScreen.style.display="flex";carregarEmpenhos();}
    else{loginScreen.style.display="flex";appScreen.style.display="none";}
  });

  window.salvarEmpenho=async function(){
    if(!cliente.value||!produtos.value||!quantidade.value)return;
    await addDoc(collection(db,"empenhos"),{
      cliente:cliente.value,
      produtos:produtos.value.split("\n"),
      quantidade:parseInt(quantidade.value),
      tipo:tipo.value,
      motivo:motivo.value,
      liberacaoParcial:liberacaoParcial.checked,
      dataRecebimento:dataRecebimento.value,
      dataEntrega:dataEntrega.value,
      dataPrevista:dataPrevista.value
    });
    cliente.value="";produtos.value="";quantidade.value="";dataRecebimento.value="";dataEntrega.value="";dataPrevista.value="";liberacaoParcial.checked=false;
    carregarEmpenhos();
  };

  async function carregarEmpenhos(){
    pendentes.innerHTML="";programados.innerHTML="";liberados.innerHTML="";
    indicadores.innerHTML="";

    let snapshot=await getDocs(collection(db,"empenhos"));
    let eventos=[];
    let contMotivo={}, contItem={}, contStatus={pendente:0,programado:0,liberado:0};

    snapshot.forEach(doc=>{
      let e=doc.data(); e.id=doc.id;
      contStatus[e.tipo]++; 
      contMotivo[e.motivo]=(contMotivo[e.motivo]||0)+1;
      e.produtos.forEach(p=>{contItem[p]=(contItem[p]||0)+1;});

      if(searchEmpenho.value && !doc.id.includes(searchEmpenho.value)) return;
      const itemFiltro=itemChegou.value.toLowerCase();
      if(itemFiltro && !e.produtos.some(p=>p.toLowerCase().includes(itemFiltro))) return;

      let alerta=false;
      if(e.tipo==="pendente" && e.dataEntrega){
        const hoje=new Date(); const limite=new Date(e.dataEntrega);
        const diff=(limite-hoje)/(1000*60*60*24);
        if(diff<=3) alerta=true;
      }

      const card=document.createElement("div");
      card.className="card"+(alerta?" alerta-vencimento":"");
      card.innerHTML=`<div class="card-header">${e.cliente} <span>&#9660;</span></div>
        <div class="card-body">
        Produtos: ${e.produtos.join(", ")}<br>
        Qtd: ${e.quantidade}<br>
        Motivo: ${e.motivo}<br>
        Liberacao Parcial: ${e.liberacaoParcial?'Sim':'Nao'}<br>
        Recebimento: ${e.dataRecebimento}<br>
        Limite: ${e.dataEntrega}<br>
        Prevista: ${e.dataPrevista}<br>
        <div class="status-bar ${e.tipo}"></div>
        Status: <select class="mudarStatus">
          <option value="pendente" ${e.tipo==='pendente'?'selected':''}>Pendente</option>
          <option value="programado" ${e.tipo==='programado'?'selected':''}>Programado</option>
          <option value="liberado" ${e.tipo==='liberado'?'selected':''}>Liberado</option>
        </select>
        <button class="delete-btn">Excluir</button>
        </div>`;

      const header=card.querySelector(".card-header");
      const body=card.querySelector(".card-body");
      body.style.display="none";
      header.addEventListener("click",()=>{body.style.display = body.style.display==="none"?"block":"none";});

      card.querySelector(".mudarStatus").addEventListener("change",async ev=>{
        await updateDoc(doc(db,"empenhos",e.id),{tipo:ev.target.value});
        carregarEmpenhos();
      });

      card.querySelector(".delete-btn").addEventListener("click",async ()=>{
        if(confirm("Deseja realmente excluir este empenho?")){
          await deleteDoc(doc(db,"empenhos",e.id));
          carregarEmpenhos();
        }
      });

      if(e.tipo==="pendente") pendentes.appendChild(card);
      if(e.tipo==="programado") programados.appendChild(card);
      if(e.tipo==="liberado") liberados.appendChild(card);

      if(e.dataPrevista) eventos.push({title:e.cliente,start:e.dataPrevista,color:e.tipo==="pendente"?"#f1c40f":e.tipo==="programado"?"#e67e22":"#2ecc71"});
    });

    for(let key in contStatus){
      const barWidth=Math.min(100,contStatus[key]*10)+'%';
      indicadores.innerHTML+=`<div class="indicador">${key.toUpperCase()}: ${contStatus[key]}
        <div class="indicador-bar" style="width:${barWidth};background:${key==='pendente'?'#f1c40f':key==='programado'?'#e67e22':'#2ecc71'}"></div></div>`;
    }
  }

  searchEmpenho.addEventListener("input",()=>carregarEmpenhos());
  verPendentes.addEventListener("click",()=>carregarEmpenhos());

});