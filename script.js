// --- IMPORTS DO FIREBASE ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// --- CONFIGURAÇÃO ---
const firebaseConfig = {
  apiKey: "AIzaSyAQmTmhHYA3t4O2tPeHFbcjL8fkdiq64TY",
  authDomain: "gerador-de-pdf-ronda.firebaseapp.com",
  projectId: "gerador-de-pdf-ronda",
  storageBucket: "gerador-de-pdf-ronda.firebasestorage.app",
  messagingSenderId: "117930037824",
  appId: "1:117930037824:web:7ff8604bbb735cd0d985a5",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
let currentUser = null;

// --- DOM ELEMENTS ---
const loginScreen = document.getElementById("login-screen");
const appContent = document.getElementById("app-content");
const btnLogin = document.getElementById("btn-login");
const btnLogout = document.getElementById("btn-logout");
const msgLogin = document.getElementById("login-msg");

const listaAtividadesDiv = document.getElementById("lista-atividades");
const btnAdd = document.getElementById("btn-add");
const btnPdf = document.getElementById("btn-pdf");
const dataInput = document.getElementById("dataRelatorio");
const turnoInput = document.getElementById("turnoRelatorio");
const responsavelInput = document.getElementById("responsavel");

const btnOpenPresets = document.getElementById("btn-open-presets");
const modalPresets = document.getElementById("modal-presets");
const btnCloseModal = document.getElementById("btn-close-modal");
const presetsListUl = document.getElementById("presets-list");
const msgEmpty = document.getElementById("msg-empty");
const inputPresetName = document.getElementById("input-preset-name");
const btnSavePreset = document.getElementById("btn-save-preset");

// LISTA DE SETORES
const SETORES = [
  "Geral",
  "Reversa",
  "Returns",
  "Volumoso",
  "PTW",
  "Mono",
  "Esteiras",
];

// ==========================================
// 1. AUTENTICAÇÃO
// ==========================================

if (btnLogin) {
  btnLogin.addEventListener("click", () => {
    msgLogin.innerText = "Conectando ao Heimdall...";
    msgLogin.style.color = "#c5a059";
    signInWithPopup(auth, provider)
      .then((result) => verificarAcesso(result.user))
      .catch((error) => {
        console.error(error);
        msgLogin.innerText = "Erro: " + error.message;
        msgLogin.style.color = "#ff4d4d";
      });
  });
}

if (btnLogout) {
  btnLogout.addEventListener("click", () => {
    if (confirm("Encerrar sessão?"))
      signOut(auth).then(() => window.location.reload());
  });
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    verificarAcesso(user);
  } else {
    currentUser = null;
    mostrarTelaLogin();
  }
});

function verificarAcesso(user) {
  const email = user.email;
  // Permite @mercadolivre.com OU seu email específico
  const isMercadoLivre = email.endsWith("@mercadolivre.com");
  const isAdmin = email === "guilherme.rauzes@gmail.com";

  if (isMercadoLivre || isAdmin) {
    mostrarApp(user);
  } else {
    msgLogin.innerText = `Acesso negado: ${email}`;
    msgLogin.style.color = "#ff4d4d";
    signOut(auth);
  }
}

function mostrarApp(user) {
  loginScreen.classList.add("hidden");
  appContent.classList.remove("hidden");
  if (responsavelInput) responsavelInput.value = user.displayName;
}

function mostrarTelaLogin() {
  loginScreen.classList.remove("hidden");
  appContent.classList.add("hidden");
}

// ==========================================
// 2. LÓGICA DE ATIVIDADES (COM FOTO E SETORES)
// ==========================================

window.addEventListener("DOMContentLoaded", () => {
  if (dataInput) dataInput.valueAsDate = new Date();
  adicionarLinha();
});

// Gera os botões de setor (Suporta Multi-Select)
function gerarBotoesSetor(setoresTexto = "Geral") {
  const setoresAtivos = setoresTexto.split(", ");
  return SETORES.map((setor) => {
    const activeClass = setoresAtivos.includes(setor) ? "active" : "";
    return `<button class="btn-mini-sector ${activeClass}" data-value="${setor}">${setor}</button>`;
  }).join("");
}

function adicionarLinha(
  dados = { inicio: "", fim: "", descricao: "", detalhe: "", setor: "Geral" },
) {
  if (!listaAtividadesDiv) return;

  const id = Date.now().toString() + Math.random().toString(16).slice(2);
  const horaAtual = new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const valInicio = dados.inicio || horaAtual;
  const valFim = dados.fim || horaAtual;
  const setorAtual = dados.setor || "Geral";

  const div = document.createElement("div");
  div.className = "atividade-row";
  div.dataset.id = id;

  div.innerHTML = `
    <div class="row-top">
      <div class="row-inputs">
        <div class="time-group">
          <input type="time" class="input-time input-inicio" value="${valInicio}" aria-label="Início">
          <span style="color: #666">-</span>
          <input type="time" class="input-time input-fim" value="${valFim}" aria-label="Fim">
        </div>
        <input type="text" class="input-desc" list="lista-global-atividades" placeholder="Atividade..." value="${dados.descricao}">

        <div class="attach-group">
          <input type="file" class="hidden-input-file" accept="image/*">
          <button class="btn-attach" title="Anexar Evidência">📎</button>

          <div class="img-preview-container">
            <img src="" class="img-thumb">
            <div class="btn-remove-img">X</div>
          </div>
        </div>

        <button class="btn-remove" aria-label="Remover">✕</button>
      </div>
      <textarea class="input-detalhe" placeholder="Detalhes (opcional)...">${dados.detalhe}</textarea>
    </div>

    <div class="row-bottom-sectors">
      <span class="sector-label">SETORES:</span>
      <div class="mini-sector-grid">
        ${gerarBotoesSetor(setorAtual)}
      </div>
      <input type="hidden" class="input-setor" value="${setorAtual}">
    </div>
  `;

  // --- LÓGICA DA FOTO ---
  const btnAttach = div.querySelector(".btn-attach");
  const inputFile = div.querySelector(".hidden-input-file");
  const previewContainer = div.querySelector(".img-preview-container");
  const imgThumb = div.querySelector(".img-thumb");
  const btnRemoveImg = div.querySelector(".btn-remove-img");

  // Abrir seletor
  btnAttach.addEventListener("click", () => inputFile.click());

  // Ao selecionar arquivo
  inputFile.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (evt) {
        imgThumb.src = evt.target.result; // Base64
        previewContainer.classList.add("visible"); // Mostra preview
        previewContainer.style.display = "block";
        btnAttach.style.display = "none"; // Esconde ícone
      };
      reader.readAsDataURL(file);
    }
  });

  // Remover foto
  btnRemoveImg.addEventListener("click", () => {
    inputFile.value = "";
    imgThumb.src = "";
    previewContainer.classList.remove("visible");
    previewContainer.style.display = "none";
    btnAttach.style.display = "block";
  });

  // --- LÓGICA DE SETORES (Multi-Select) ---
  const botoesSetor = div.querySelectorAll(".btn-mini-sector");
  const inputSetor = div.querySelector(".input-setor");

  botoesSetor.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      btn.classList.toggle("active"); // Liga/Desliga

      const ativos = [];
      div
        .querySelectorAll(".btn-mini-sector.active")
        .forEach((b) => ativos.push(b.dataset.value));

      inputSetor.value = ativos.join(", ");
    });
  });

  // Remover linha
  div
    .querySelector(".btn-remove")
    .addEventListener("click", () => div.remove());
  listaAtividadesDiv.appendChild(div);

  if (!dados.descricao) {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }
}

// Coleta dados da tela (incluindo Imagem Base64)
function atualizarListaInterna() {
  const lista = [];
  const rows = document.querySelectorAll(".atividade-row");
  rows.forEach((row) => {
    // Checa se tem imagem visível
    const imgThumb = row.querySelector(".img-thumb");
    const hasImage =
      row.querySelector(".img-preview-container").style.display === "block";
    const imagemBase64 = hasImage ? imgThumb.src : null;

    lista.push({
      inicio: row.querySelector(".input-inicio").value,
      fim: row.querySelector(".input-fim").value,
      descricao: row.querySelector(".input-desc").value,
      detalhe: row.querySelector(".input-detalhe").value,
      setor: row.querySelector(".input-setor").value,
      imagem: imagemBase64, // Guarda a foto
    });
  });
  return lista;
}

if (btnAdd) btnAdd.addEventListener("click", () => adicionarLinha());

// ==========================================
// 3. PRESETS (MODELOS) - SEM FOTO
// ==========================================

if (btnOpenPresets) {
  btnOpenPresets.addEventListener("click", async () => {
    modalPresets.classList.remove("hidden");
    msgEmpty.innerText = "Acessando banco de dados...";
    presetsListUl.innerHTML = "";
    await carregarPresetsDoFirestore();
  });
}

if (btnCloseModal)
  btnCloseModal.addEventListener("click", () =>
    modalPresets.classList.add("hidden"),
  );

if (btnSavePreset) {
  btnSavePreset.addEventListener("click", async () => {
    const nomeModelo = inputPresetName.value.trim();
    if (!nomeModelo) return alert("Dê um nome ao modelo!");

    // Pega os dados
    const dadosBrutos = atualizarListaInterna();
    if (dadosBrutos.length === 0) return alert("Adicione atividades.");
    if (!currentUser) return alert("Erro de usuário.");

    // REMOVE AS FOTOS ANTES DE SALVAR NO BANCO (Pra não estourar cota)
    const dadosParaSalvar = dadosBrutos.map((item) => ({
      ...item,
      imagem: null, // Limpa a imagem
    }));

    try {
      btnSavePreset.textContent = "Salvando...";
      btnSavePreset.disabled = true;

      const docRef = doc(db, "usuarios_presets", currentUser.uid);
      const docSnap = await getDoc(docRef);
      let presetsAtuais = docSnap.exists() ? docSnap.data().presets : {};

      presetsAtuais[nomeModelo] = dadosParaSalvar;

      await setDoc(docRef, { presets: presetsAtuais });

      alert("Modelo salvo com sucesso (sem fotos)!");
      inputPresetName.value = "";
      await carregarPresetsDoFirestore();
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar: " + error.message);
    } finally {
      btnSavePreset.textContent = "Salvar";
      btnSavePreset.disabled = false;
    }
  });
}

async function carregarPresetsDoFirestore() {
  if (!currentUser) return;
  try {
    const docRef = doc(db, "usuarios_presets", currentUser.uid);
    const docSnap = await getDoc(docRef);
    presetsListUl.innerHTML = "";
    if (docSnap.exists() && Object.keys(docSnap.data().presets).length > 0) {
      msgEmpty.style.display = "none";
      const presets = docSnap.data().presets;
      Object.keys(presets).forEach((nome) => criarItemLista(nome, presets));
    } else {
      msgEmpty.innerText = "Nenhum modelo salvo.";
      msgEmpty.style.display = "block";
    }
  } catch (error) {
    console.error(error);
  }
}

function criarItemLista(nome, todosPresets) {
  const li = document.createElement("li");
  li.className = "preset-item";
  li.innerHTML = `<span>${nome}</span><div class="preset-actions"><button class="btn-load">Carregar</button><button class="btn-delete">✕</button></div>`;
  li.querySelector(".btn-load").addEventListener("click", () => {
    listaAtividadesDiv.innerHTML = "";
    todosPresets[nome].forEach((item) => adicionarLinha(item));
    modalPresets.classList.add("hidden");
  });
  li.querySelector(".btn-delete").addEventListener("click", async () => {
    if (confirm(`Excluir modelo "${nome}"?`)) {
      delete todosPresets[nome];
      await setDoc(doc(db, "usuarios_presets", currentUser.uid), {
        presets: todosPresets,
      });
      carregarPresetsDoFirestore();
    }
  });
  presetsListUl.appendChild(li);
}

// ==========================================
// 4. GERAÇÃO DE PDF (COM FOTOS)
// ==========================================

if (btnPdf) {
  btnPdf.addEventListener("click", () => {
    const dados = atualizarListaInterna();
    const responsavel = responsavelInput
      ? responsavelInput.value || "Não informado"
      : "Não informado";
    const turno = turnoInput ? turnoInput.value || "N/A" : "N/A";

    // Tratamento de Data
    const dataRaw = dataInput ? dataInput.value : "";
    const dataFormatada = dataRaw ? dataRaw.split("-").reverse().join("/") : "";
    // Variável corrigida para nome do arquivo
    const dataArquivo = dataRaw
      ? dataRaw.split("-").reverse().join("-")
      : "sem-data";

    if (dados.length === 0) return alert("O relatório está vazio.");

    const docDefinition = {
      content: [
        { text: "RELATÓRIO BRPR01 - IS OPS", style: "header" },

        {
          columns: [
            {
              width: "auto",
              stack: [
                { text: `Data: ${dataFormatada}`, style: "subheader" },
                {
                  text: `Turno: ${turno}`,
                  style: "subheader",
                  bold: true,
                  color: "#333",
                },
              ],
            },
            { text: "", width: "*" },
            {
              width: "auto",
              text: `Responsável: ${responsavel}`,
              style: "subheader",
              alignment: "right",
              margin: [0, 10, 0, 0],
            },
          ],
        },

        { text: "\n" },

        {
          table: {
            headerRows: 1,
            // 5 Colunas: Início, Fim, Setor, Atividade, Detalhes (com Foto)
            widths: ["auto", "auto", "auto", 120, "*"],
            body: [
              [
                { text: "Início", style: "tableHeader" },
                { text: "Fim", style: "tableHeader" },
                { text: "Setor(es)", style: "tableHeader" },
                { text: "Atividade", style: "tableHeader" },
                { text: "Detalhes / Evidências", style: "tableHeader" },
              ],
              ...dados.map((item) => {
                // Monta a célula de detalhes
                const detalhesStack = [
                  {
                    text: item.detalhe,
                    color: "#333",
                    fontSize: 10,
                    margin: [0, 0, 0, 5],
                  },
                ];

                // Se tiver foto, adiciona na pilha
                if (item.imagem) {
                  detalhesStack.push({
                    image: item.imagem,
                    width: 150,
                    margin: [0, 5, 0, 0],
                  });
                }

                return [
                  { text: item.inicio, alignment: "center", margin: [0, 5] },
                  { text: item.fim, alignment: "center", margin: [0, 5] },
                  {
                    text: item.setor || "-",
                    bold: true,
                    color: "#1a237e",
                    alignment: "center",
                    fontSize: 9,
                    margin: [0, 5],
                  },
                  {
                    text: item.descricao,
                    bold: true,
                    fontSize: 10,
                    margin: [0, 5],
                  },
                  { stack: detalhesStack, margin: [0, 5] }, // Usa stack
                ];
              }),
            ],
          },
          layout: {
            fillColor: function (rowIndex) {
              return rowIndex % 2 === 0 && rowIndex !== 0 ? "#f5f5f5" : null;
            },
            hLineWidth: function (i, node) {
              return i === 0 || i === node.table.body.length ? 1 : 1;
            },
            vLineWidth: function (i, node) {
              return 0;
            },
            hLineColor: function (i, node) {
              return "#ddd";
            },
          },
        },
      ],

      styles: {
        header: {
          fontSize: 16,
          bold: true,
          margin: [0, 0, 0, 15],
          color: "#1a237e",
        },
        subheader: { fontSize: 11, margin: [0, 2, 0, 2], color: "#444" },
        tableHeader: {
          bold: true,
          fontSize: 10,
          color: "white",
          fillColor: "#2d3277",
          margin: [0, 8, 0, 8],
          alignment: "center",
        },
      },
    };

    // Abre em nova aba
    pdfMake.createPdf(docDefinition).open();
  });
}
