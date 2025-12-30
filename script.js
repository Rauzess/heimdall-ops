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
  addDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

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
const FAKE_DOMAIN = "@heimdall.ops";

// DOM
const loginScreen = document.getElementById("login-screen");
const appContent = document.getElementById("app-content");
const btnLogout = document.getElementById("btn-logout");
const msgLogin = document.getElementById("login-msg");

const formLogin = document.getElementById("form-login");
const formRegister = document.getElementById("form-register");
const linkCriar = document.getElementById("link-criar");
const linkVoltar = document.getElementById("link-voltar");
const loginUser = document.getElementById("login-user");
const loginPass = document.getElementById("login-pass");
const btnEntrar = document.getElementById("btn-entrar");
const regName = document.getElementById("reg-name");
const regSurname = document.getElementById("reg-surname");
const regUser = document.getElementById("reg-user");
const regPass = document.getElementById("reg-pass");
const btnCadastrar = document.getElementById("btn-cadastrar");

const listaAtividadesDiv = document.getElementById("lista-atividades");
const btnAdd = document.getElementById("btn-add");
const btnPdf = document.getElementById("btn-pdf");
const btnSaveRetro = document.getElementById("btn-save-retro");
const dataInput = document.getElementById("dataRelatorio");
const turnoInput = document.getElementById("turnoRelatorio");
const responsavelInput = document.getElementById("responsavel");

const btnOpenPresets = document.getElementById("btn-open-presets");
const modalPresets = document.getElementById("modal-presets");
const btnCloseModal = document.getElementById("btn-close-modal");
const presetsListUl = document.getElementById("presets-list");
const msgEmptyPresets = document.getElementById("msg-empty-presets");
const inputPresetName = document.getElementById("input-preset-name");
const btnSavePreset = document.getElementById("btn-save-preset");

const btnOpenHistory = document.getElementById("btn-open-history");
const modalHistory = document.getElementById("modal-history");
const btnCloseHistory = document.getElementById("btn-close-history");
const historyListUl = document.getElementById("history-list");
const msgEmptyHistory = document.getElementById("msg-empty-history");

// Stats Elements
const statRondas = document.getElementById("stat-rondas");
const statAtividades = document.getElementById("stat-atividades");
const statHoras = document.getElementById("stat-horas");

const SETORES = [
  "Geral",
  "Reversa",
  "Returns",
  "Volumoso",
  "PTW",
  "Mono",
  "Esteiras",
];

// 1. AUTH
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

btnEntrar.addEventListener("click", () => {
  const username = loginUser.value.trim();
  const password = loginPass.value.trim();
  if (!username || !password)
    return showMsg("Preencha usuário e senha.", "red");
  showMsg("Verificando...", "#c5a059");
  signInWithEmailAndPassword(auth, username + FAKE_DOMAIN, password).catch(
    (err) => showMsg("Erro: " + err.code, "red"),
  );
});

btnCadastrar.addEventListener("click", () => {
  const nome = regName.value.trim();
  const sobrenome = regSurname.value.trim();
  const username = regUser.value.trim();
  const password = regPass.value.trim();
  if (!nome || !sobrenome || !username || !password)
    return showMsg("Preencha tudo.", "red");
  if (password.length < 6) return showMsg("Senha curta (min 6).", "red");
  showMsg("Registrando...", "#c5a059");
  createUserWithEmailAndPassword(auth, username + FAKE_DOMAIN, password)
    .then((res) =>
      updateProfile(res.user, { displayName: `${nome} ${sobrenome}` }).then(
        () => window.location.reload(),
      ),
    )
    .catch((err) => showMsg("Erro: " + err.code, "red"));
});

function showMsg(txt, color) {
  msgLogin.innerText = txt;
  msgLogin.style.color = color;
}
if (btnLogout)
  btnLogout.addEventListener("click", () => {
    if (confirm("Sair?")) signOut(auth).then(() => window.location.reload());
  });

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    mostrarApp(user);
    calcularEstatisticas();
  } else {
    currentUser = null;
    mostrarTelaLogin();
  }
});

function mostrarApp(user) {
  loginScreen.classList.add("hidden");
  appContent.classList.remove("hidden");
  const nome = user.displayName || user.email.split("@")[0];
  if (responsavelInput) responsavelInput.value = nome;
}
function mostrarTelaLogin() {
  loginScreen.classList.remove("hidden");
  appContent.classList.add("hidden");
  formLogin.classList.remove("hidden");
  formRegister.classList.add("hidden");
}

// 2. DASHBOARD / ESTATÍSTICAS (Mensal)
async function calcularEstatisticas() {
  if (!currentUser) return;
  try {
    const q = query(
      collection(db, "historico_rondas"),
      where("uid", "==", currentUser.uid),
    );
    const snapshot = await getDocs(q);

    let totalRondas = 0;
    let totalAtividades = 0;
    let totalMinutos = 0;

    // Pega mês atual (0-11)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    snapshot.forEach((doc) => {
      const data = doc.data();

      // Verifica se a data do relatório (YYYY-MM-DD) é do mês atual
      const [y, m, d] = data.dataRaw.split("-").map(Number);

      if (y === currentYear && m - 1 === currentMonth) {
        totalRondas++;

        if (data.dados && Array.isArray(data.dados)) {
          totalAtividades += data.dados.length;
          data.dados.forEach((ativ) => {
            if (ativ.inicio && ativ.fim) {
              const minutos = diffMinutes(ativ.inicio, ativ.fim);
              totalMinutos += minutos;
            }
          });
        }
      }
    });

    const horas = Math.floor(totalMinutos / 60);
    const minRestantes = totalMinutos % 60;

    statRondas.innerText = totalRondas;
    statAtividades.innerText = totalAtividades;
    statHoras.innerText = `${horas}h ${minRestantes}m`;
  } catch (e) {
    console.error("Erro estatisticas:", e);
  }
}

function diffMinutes(start, end) {
  const [h1, m1] = start.split(":").map(Number);
  const [h2, m2] = end.split(":").map(Number);
  const min1 = h1 * 60 + m1;
  const min2 = h2 * 60 + m2;
  let diff = min2 - min1;
  if (diff < 0) diff += 24 * 60;
  return diff;
}

// 3. ATIVIDADES
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
          <input type="time" class="input-time input-inicio" value="${valInicio}">
          <span style="color: #666">-</span>
          <input type="time" class="input-time input-fim" value="${valFim}">
        </div>
        <input type="text" class="input-desc" list="lista-global-atividades" placeholder="Atividade..." value="${dados.descricao}">
        <div class="attach-group">
          <input type="file" class="hidden-input-file" accept="image/*">
          <button class="btn-attach" title="Anexar Evidência">📎</button>
          <div class="img-preview-container"><img src="" class="img-thumb"><div class="btn-remove-img">X</div></div>
        </div>
        <button class="btn-remove">✕</button>
      </div>
      <textarea class="input-detalhe" placeholder="Detalhes...">${dados.detalhe}</textarea>
    </div>
    <div class="row-bottom-sectors">
      <span class="sector-label">SETORES:</span>
      <div class="mini-sector-grid">${gerarBotoesSetor(setorAtual)}</div>
      <input type="hidden" class="input-setor" value="${setorAtual}">
    </div>`;

  const btnAttach = div.querySelector(".btn-attach");
  const inputFile = div.querySelector(".hidden-input-file");
  const preview = div.querySelector(".img-preview-container");
  const thumb = div.querySelector(".img-thumb");
  const btnRemImg = div.querySelector(".btn-remove-img");

  btnAttach.addEventListener("click", () => inputFile.click());
  inputFile.addEventListener("change", (e) => {
    if (e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        thumb.src = evt.target.result;
        preview.style.display = "block";
        preview.classList.add("visible");
        btnAttach.style.display = "none";
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  });
  btnRemImg.addEventListener("click", () => {
    inputFile.value = "";
    thumb.src = "";
    preview.style.display = "none";
    preview.classList.remove("visible");
    btnAttach.style.display = "block";
  });

  const botoesSetor = div.querySelectorAll(".btn-mini-sector");
  const inputSetor = div.querySelector(".input-setor");
  botoesSetor.forEach((btn) =>
    btn.addEventListener("click", () => {
      btn.classList.toggle("active");
      const ativos = [];
      div
        .querySelectorAll(".btn-mini-sector.active")
        .forEach((b) => ativos.push(b.dataset.value));
      inputSetor.value = ativos.join(", ");
    }),
  );

  div
    .querySelector(".btn-remove")
    .addEventListener("click", () => div.remove());
  listaAtividadesDiv.appendChild(div);
  if (!dados.descricao)
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
}

function atualizarListaInterna() {
  const lista = [];
  document.querySelectorAll(".atividade-row").forEach((row) => {
    const hasImg =
      row.querySelector(".img-preview-container").style.display === "block";
    lista.push({
      inicio: row.querySelector(".input-inicio").value,
      fim: row.querySelector(".input-fim").value,
      descricao: row.querySelector(".input-desc").value,
      detalhe: row.querySelector(".input-detalhe").value,
      setor: row.querySelector(".input-setor").value,
      imagem: hasImg ? row.querySelector(".img-thumb").src : null,
    });
  });
  return lista;
}
if (btnAdd) btnAdd.addEventListener("click", () => adicionarLinha());

// 4. PRESETS E HISTÓRICO
btnOpenPresets.addEventListener("click", async () => {
  modalPresets.classList.remove("hidden");
  msgEmptyPresets.innerText = "Carregando...";
  presetsListUl.innerHTML = "";
  await carregarPresets();
});
btnCloseModal.addEventListener("click", () =>
  modalPresets.classList.add("hidden"),
);

async function carregarPresets() {
  if (!currentUser) return;
  try {
    const docSnap = await getDoc(doc(db, "usuarios_presets", currentUser.uid));
    presetsListUl.innerHTML = "";
    if (docSnap.exists() && Object.keys(docSnap.data().presets).length > 0) {
      msgEmptyPresets.style.display = "none";
      const presets = docSnap.data().presets;
      Object.keys(presets).forEach((nome) => {
        const li = document.createElement("li");
        li.className = "preset-item";
        li.innerHTML = `<span>${nome}</span><div class="preset-actions"><button class="btn-load">Carregar</button><button class="btn-delete">✕</button></div>`;
        li.querySelector(".btn-load").addEventListener("click", () => {
          listaAtividadesDiv.innerHTML = "";
          presets[nome].forEach((i) => adicionarLinha(i));
          modalPresets.classList.add("hidden");
        });
        li.querySelector(".btn-delete").addEventListener("click", async () => {
          if (confirm("Excluir?")) {
            delete presets[nome];
            await setDoc(doc(db, "usuarios_presets", currentUser.uid), {
              presets,
            });
            carregarPresets();
          }
        });
        presetsListUl.appendChild(li);
      });
    } else {
      msgEmptyPresets.innerText = "Nenhum modelo salvo.";
      msgEmptyPresets.style.display = "block";
    }
  } catch (e) {
    console.error(e);
  }
}

btnSavePreset.addEventListener("click", async () => {
  const nome = inputPresetName.value.trim();
  if (!nome) return alert("Dê um nome!");
  const dados = atualizarListaInterna().map((i) => ({ ...i, imagem: null }));
  try {
    btnSavePreset.textContent = "...";
    const ref = doc(db, "usuarios_presets", currentUser.uid);
    const snap = await getDoc(ref);
    const presets = snap.exists() ? snap.data().presets : {};
    presets[nome] = dados;
    await setDoc(ref, { presets });
    alert("Modelo salvo!");
    inputPresetName.value = "";
    carregarPresets();
  } catch (e) {
    alert("Erro: " + e.message);
  }
  btnSavePreset.textContent = "Salvar";
});

// HISTÓRICO COM EXCLUSÃO
btnOpenHistory.addEventListener("click", async () => {
  modalHistory.classList.remove("hidden");
  msgEmptyHistory.innerText = "Buscando...";
  historyListUl.innerHTML = "";
  await carregarHistorico();
});
btnCloseHistory.addEventListener("click", () =>
  modalHistory.classList.add("hidden"),
);

async function carregarHistorico() {
  try {
    const q = query(
      collection(db, "historico_rondas"),
      orderBy("timestamp", "desc"),
      limit(20),
    );
    const querySnapshot = await getDocs(q);
    historyListUl.innerHTML = "";
    if (!querySnapshot.empty) {
      msgEmptyHistory.style.display = "none";
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const id = docSnap.id; // ID para deletar
        const li = document.createElement("li");
        li.className = "preset-item";
        li.innerHTML = `<span>${data.dataFormatada} - ${data.turno} <br><small style="color:#888">${data.responsavel}</small></span>
          <div class="preset-actions">
            <button class="btn-load">Baixar PDF</button>
            <button class="btn-delete" style="color:#ff4444">🗑️</button>
          </div>`;
        li.querySelector(".btn-load").addEventListener("click", () =>
          gerarPDF(
            data.dados,
            data.responsavel,
            data.turno,
            data.dataRaw,
            true,
          ),
        );
        // Deletar do Histórico
        li.querySelector(".btn-delete").addEventListener("click", async () => {
          if (confirm("Apagar este registro? (Isso afetará as horas totais)")) {
            await deleteDoc(doc(db, "historico_rondas", id));
            carregarHistorico();
            calcularEstatisticas(); // Recalcula
          }
        });
        historyListUl.appendChild(li);
      });
    } else {
      msgEmptyHistory.innerText = "Nenhum registro.";
      msgEmptyHistory.style.display = "block";
    }
  } catch (e) {
    console.error(e);
    msgEmptyHistory.innerText = "Erro ao carregar.";
  }
}

// Salvar Retroativo (Sem PDF)
btnSaveRetro.addEventListener("click", () => {
  const dados = atualizarListaInterna();
  const resp = responsavelInput.value || "N/A";
  const turno = turnoInput.value || "N/A";
  const dataRaw = dataInput.value || new Date().toISOString().split("T")[0];
  const dataParts = dataRaw.split("-");
  const dataDisplay = dataParts.reverse().join("/");

  if (dados.length === 0) return alert("Preencha as atividades.");
  if (confirm(`Salvar ronda de ${dataDisplay} no histórico sem gerar PDF?`)) {
    salvarNoHistorico(dados, resp, turno, dataRaw, dataDisplay);
    alert("Salvo no histórico!");
    listaAtividadesDiv.innerHTML = ""; // Limpa tela
    adicionarLinha();
  }
});

async function salvarNoHistorico(
  dados,
  responsavel,
  turno,
  dataRaw,
  dataFormatada,
) {
  const dadosSemFoto = dados.map((i) => ({ ...i, imagem: null }));
  try {
    await addDoc(collection(db, "historico_rondas"), {
      dados: dadosSemFoto,
      responsavel,
      turno,
      dataRaw,
      dataFormatada,
      timestamp: new Date(),
      uid: currentUser.uid,
    });
    calcularEstatisticas();
  } catch (e) {
    console.error("Erro histórico:", e);
  }
}

// 5. PDF
function gerarPDF(dados, responsavel, turno, dataRaw, isHistory = false) {
  if (dados.length === 0) return alert("Relatório vazio.");
  const dataParts = dataRaw.split("-");
  const fileName = `RONDA_BRPR01_${dataParts[2]}_${dataParts[1]}_${dataParts[0]}.pdf`;
  const dataDisplay = dataParts.reverse().join("/");

  const docDefinition = {
    content: [
      { text: "RELATÓRIO BRPR01 - IS OPS", style: "header" },
      {
        columns: [
          {
            width: "auto",
            stack: [
              { text: `Data: ${dataDisplay}`, style: "subheader" },
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
              { text: "Início", style: "th" },
              { text: "Fim", style: "th" },
              { text: "Setor(es)", style: "th" },
              { text: "Atividade", style: "th" },
              { text: "Detalhes / Evidências", style: "th" },
            ],
            ...dados.map((item) => {
              const stack = [
                {
                  text: item.detalhe,
                  color: "#333",
                  fontSize: 10,
                  margin: [0, 0, 0, 5],
                },
              ];
              if (item.imagem) stack.push({ image: item.imagem, width: 150 });
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
                { stack: stack, margin: [0, 5] },
              ];
            }),
          ],
        },
        layout: {
          fillColor: (i) => (i % 2 === 0 && i !== 0 ? "#f5f5f5" : null),
          hLineWidth: () => 1,
          vLineWidth: () => 0,
          hLineColor: () => "#ddd",
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
      th: {
        bold: true,
        fontSize: 10,
        color: "white",
        fillColor: "#2d3277",
        margin: [0, 8, 0, 8],
        alignment: "center",
      },
    },
  };
  if (!isHistory)
    salvarNoHistorico(dados, responsavel, turno, dataRaw, dataDisplay);
  pdfMake.createPdf(docDefinition).open();
}

btnPdf.addEventListener("click", () => {
  const dados = atualizarListaInterna();
  const resp = responsavelInput.value || "N/A";
  const turno = turnoInput.value || "N/A";
  const dataRaw = dataInput.value || new Date().toISOString().split("T")[0];
  gerarPDF(dados, resp, turno, dataRaw, false);
});
