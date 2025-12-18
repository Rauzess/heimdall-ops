// --- IMPORTS DO FIREBASE ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
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
let currentUser = null;

// DOMÍNIO FANTASMA (Para autenticar username como email)
const FAKE_DOMAIN = "@heimdall.ops";

// --- DOM ---
const loginScreen = document.getElementById("login-screen");
const appContent = document.getElementById("app-content");
const btnLogout = document.getElementById("btn-logout");
const msgLogin = document.getElementById("login-msg");

// Forms Auth
const formLogin = document.getElementById("form-login");
const formRegister = document.getElementById("form-register");
const linkCriar = document.getElementById("link-criar");
const linkVoltar = document.getElementById("link-voltar");

// Inputs Login
const loginUser = document.getElementById("login-user");
const loginPass = document.getElementById("login-pass");
const btnEntrar = document.getElementById("btn-entrar");

// Inputs Register
const regName = document.getElementById("reg-name");
const regSurname = document.getElementById("reg-surname");
const regUser = document.getElementById("reg-user");
const regPass = document.getElementById("reg-pass");
const btnCadastrar = document.getElementById("btn-cadastrar");

// App Inputs
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
// 1. LÓGICA DE AUTH (LOGIN & CADASTRO)
// ==========================================

// Alternar entre Login e Cadastro
linkCriar.addEventListener("click", () => {
  formLogin.classList.add("hidden");
  formRegister.classList.remove("hidden");
  msgLogin.innerText = "";
});

linkVoltar.addEventListener("click", () => {
  formRegister.classList.add("hidden");
  formLogin.classList.remove("hidden");
  msgLogin.innerText = "";
});

// --- LOGIN ---
btnEntrar.addEventListener("click", () => {
  const username = loginUser.value.trim();
  const password = loginPass.value.trim();

  if (!username || !password)
    return showMsg("Preencha usuário e senha.", "red");

  // Adiciona o domínio falso para o Firebase aceitar
  const emailFake = username + FAKE_DOMAIN;

  showMsg("Verificando credenciais...", "#c5a059");

  signInWithEmailAndPassword(auth, emailFake, password)
    .then((result) => {
      // Sucesso - o onAuthStateChanged vai lidar com o resto
    })
    .catch((error) => {
      console.error(error);
      if (error.code === "auth/invalid-credential")
        showMsg("Usuário ou senha incorretos.", "red");
      else showMsg("Erro: " + error.code, "red");
    });
});

// --- CADASTRO ---
btnCadastrar.addEventListener("click", () => {
  const nome = regName.value.trim();
  const sobrenome = regSurname.value.trim();
  const username = regUser.value.trim();
  const password = regPass.value.trim();

  if (!nome || !sobrenome || !username || !password)
    return showMsg("Preencha todos os campos.", "red");
  if (password.length < 6)
    return showMsg("A senha precisa ter 6+ caracteres.", "red");

  const emailFake = username + FAKE_DOMAIN;
  const nomeCompleto = `${nome} ${sobrenome}`;

  showMsg("Criando guardião...", "#c5a059");

  createUserWithEmailAndPassword(auth, emailFake, password)
    .then((result) => {
      // Usuário criado! Agora atualizamos o Nome de Exibição (displayName)
      updateProfile(result.user, {
        displayName: nomeCompleto,
      }).then(() => {
        // Recarrega para pegar o nome atualizado
        window.location.reload();
      });
    })
    .catch((error) => {
      console.error(error);
      if (error.code === "auth/email-already-in-use")
        showMsg("Usuário já existe!", "red");
      else showMsg("Erro: " + error.code, "red");
    });
});

function showMsg(txt, color) {
  msgLogin.innerText = txt;
  msgLogin.style.color = color;
}

// Logout
if (btnLogout) {
  btnLogout.addEventListener("click", () => {
    if (confirm("Encerrar sessão?"))
      signOut(auth).then(() => window.location.reload());
  });
}

// Observer de Estado
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    mostrarApp(user);
  } else {
    currentUser = null;
    mostrarTelaLogin();
  }
});

function mostrarApp(user) {
  loginScreen.classList.add("hidden");
  appContent.classList.remove("hidden");
  // Se tiver displayName (Nome Sobrenome), usa. Se não, usa o "email" sem o dominio.
  const nomeExibicao = user.displayName || user.email.split("@")[0];
  if (responsavelInput) responsavelInput.value = nomeExibicao;
}

function mostrarTelaLogin() {
  loginScreen.classList.remove("hidden");
  appContent.classList.add("hidden");
  formLogin.classList.remove("hidden");
  formRegister.classList.add("hidden");
}

// ==========================================
// 2. LÓGICA DE ATIVIDADES
// ==========================================

window.addEventListener("DOMContentLoaded", () => {
  if (dataInput) dataInput.valueAsDate = new Date();
  adicionarLinha();
});

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

  // Foto
  const btnAttach = div.querySelector(".btn-attach");
  const inputFile = div.querySelector(".hidden-input-file");
  const previewContainer = div.querySelector(".img-preview-container");
  const imgThumb = div.querySelector(".img-thumb");
  const btnRemoveImg = div.querySelector(".btn-remove-img");

  btnAttach.addEventListener("click", () => inputFile.click());

  inputFile.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (evt) {
        imgThumb.src = evt.target.result;
        previewContainer.classList.add("visible");
        previewContainer.style.display = "block";
        btnAttach.style.display = "none";
      };
      reader.readAsDataURL(file);
    }
  });

  btnRemoveImg.addEventListener("click", () => {
    inputFile.value = "";
    imgThumb.src = "";
    previewContainer.classList.remove("visible");
    previewContainer.style.display = "none";
    btnAttach.style.display = "block";
  });

  // Setores
  const botoesSetor = div.querySelectorAll(".btn-mini-sector");
  const inputSetor = div.querySelector(".input-setor");

  botoesSetor.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      btn.classList.toggle("active");
      const ativos = [];
      div
        .querySelectorAll(".btn-mini-sector.active")
        .forEach((b) => ativos.push(b.dataset.value));
      inputSetor.value = ativos.join(", ");
    });
  });

  div
    .querySelector(".btn-remove")
    .addEventListener("click", () => div.remove());
  listaAtividadesDiv.appendChild(div);

  if (!dados.descricao) {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }
}

function atualizarListaInterna() {
  const lista = [];
  const rows = document.querySelectorAll(".atividade-row");
  rows.forEach((row) => {
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
      imagem: imagemBase64,
    });
  });
  return lista;
}

if (btnAdd) btnAdd.addEventListener("click", () => adicionarLinha());

// ==========================================
// 3. PRESETS
// ==========================================

if (btnOpenPresets) {
  btnOpenPresets.addEventListener("click", async () => {
    modalPresets.classList.remove("hidden");
    msgEmpty.innerText = "Carregando...";
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

    const dadosBrutos = atualizarListaInterna();
    if (dadosBrutos.length === 0) return alert("Adicione atividades.");
    if (!currentUser) return alert("Erro de usuário.");

    const dadosParaSalvar = dadosBrutos.map((item) => ({
      ...item,
      imagem: null,
    }));

    try {
      btnSavePreset.textContent = "Salvando...";
      btnSavePreset.disabled = true;

      const docRef = doc(db, "usuarios_presets", currentUser.uid);
      const docSnap = await getDoc(docRef);
      let presetsAtuais = docSnap.exists() ? docSnap.data().presets : {};

      presetsAtuais[nomeModelo] = dadosParaSalvar;

      await setDoc(docRef, { presets: presetsAtuais });

      alert("Salvo com sucesso!");
      inputPresetName.value = "";
      await carregarPresetsDoFirestore();
    } catch (error) {
      console.error(error);
      alert("Erro: " + error.message);
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
    if (confirm(`Excluir "${nome}"?`)) {
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
// 4. PDF
// ==========================================

if (btnPdf) {
  btnPdf.addEventListener("click", () => {
    const dados = atualizarListaInterna();
    const responsavel = responsavelInput
      ? responsavelInput.value || "Não informado"
      : "Não informado";
    const turno = turnoInput ? turnoInput.value || "N/A" : "N/A";

    const dataRaw = dataInput ? dataInput.value : "";
    const dataFormatada = dataRaw ? dataRaw.split("-").reverse().join("/") : "";
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
                const detalhesStack = [
                  {
                    text: item.detalhe,
                    color: "#333",
                    fontSize: 10,
                    margin: [0, 0, 0, 5],
                  },
                ];

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
                  { stack: detalhesStack, margin: [0, 5] },
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

        {
          text: "\nGerado via Heimdall Ops",
          style: "footer",
          alignment: "center",
          fontSize: 8,
          color: "#999",
          margin: [0, 20, 0, 0],
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

    pdfMake.createPdf(docDefinition).open();
  });
}
