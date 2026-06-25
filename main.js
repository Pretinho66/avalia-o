/**
 * ========================================================
 * GERADOR DE SENHAS SEGURO - main.js
 * ========================================================
 * Utiliza Web Crypto API (crypto.getRandomValues) para
 * geração criptograficamente segura de senhas.
 * Toda lógica roda no client-side - nenhum dado é enviado.
 * ========================================================
 */

(function() {
    'use strict';

    // ---------- ELEMENTOS DOM ----------
    const senhaInput = document.getElementById('senhaInput');
    const gerarBtn = document.getElementById('gerarBtn');
    const copiarBtn = document.getElementById('copiarBtn');
    const toggleVisib = document.getElementById('toggleVisibilidade');
    const tamanhoSlider = document.getElementById('tamanhoSlider');
    const tamanhoValor = document.getElementById('tamanhoValor');
    const forcaBarra = document.getElementById('forcaBarra');
    const forcaLabel = document.getElementById('forcaLabel');
    const listaHist = document.getElementById('listaHistorico');
    const limparHistBtn = document.getElementById('limparHistorico');
    const toast = document.getElementById('toast');

    // Checkboxes
    const chkMaiusculas = document.getElementById('chkMaiusculas');
    const chkMinusculas = document.getElementById('chkMinusculas');
    const chkNumeros = document.getElementById('chkNumeros');
    const chkSimbolos = document.getElementById('chkSimbolos');

    // ---------- CONSTANTES ----------
    const CHARS = {
        maiusculas: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        minusculas: 'abcdefghijklmnopqrstuvwxyz',
        numeros: '0123456789',
        simbolos: '!@#$%^&*()_+-=[]{}|;:,.<>?/~'
    };

    // ---------- ESTADO ----------
    let senhaAtual = '';
    let historico = [];

    // ---------- CARREGAR HISTÓRICO DO sessionStorage ----------
    function carregarHistorico() {
        try {
            const dados = sessionStorage.getItem('historicoSenhas');
            if (dados) {
                historico = JSON.parse(dados);
                if (!Array.isArray(historico)) historico = [];
            }
        } catch (_) {
            historico = [];
        }
        // Garantir que só tenha 5 itens
        if (historico.length > 5) historico = historico.slice(0, 5);
        renderizarHistorico();
    }

    /**
     * Salva o histórico no sessionStorage.
     * Mantém no máximo 5 senhas.
     */
    function salvarHistorico() {
        try {
            if (historico.length > 5) historico = historico.slice(0, 5);
            sessionStorage.setItem('historicoSenhas', JSON.stringify(historico));
        } catch (_) {
            /* ignora erros de storage */
        }
        renderizarHistorico();
    }

    // ---------- RENDERIZAR HISTÓRICO ----------
    function renderizarHistorico() {
        if (!listaHist) return;
        if (historico.length === 0) {
            listaHist.innerHTML = '<span class="vazio">Nenhuma senha gerada ainda.</span>';
            return;
        }
        let html = '';
        historico.forEach((senha, index) => {
            // Escapa caracteres especiais para evitar XSS (por segurança)
            const safe = senha.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            html += `
                <span class="chip-senha">
                    ${safe}
                    <button data-index="${index}" class="copiarChip" title="Copiar esta senha">📋</button>
                </span>
            `;
        });
        listaHist.innerHTML = html;

        // Adiciona eventos aos botões de copiar do histórico
        document.querySelectorAll('.copiarChip').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const idx = parseInt(this.getAttribute('data-index'), 10);
                if (!isNaN(idx) && historico[idx]) {
                    copiarSenha(historico[idx]);
                }
            });
        });
    }

    // ---------- ADICIONAR AO HISTÓRICO ----------
    function adicionarHistorico(senha) {
        if (!senha || senha.length === 0) return;
        // Remove duplicatas
        historico = historico.filter(item => item !== senha);
        // Insere no início
        historico.unshift(senha);
        // Mantém 5
        if (historico.length > 5) historico.pop();
        salvarHistorico();
    }

    // ---------- LIMPAR HISTÓRICO ----------
    function limparHistorico() {
        historico = [];
        salvarHistorico();
        mostrarToast('🧹 Histórico limpo');
    }

    /**
     * Gera uma senha criptograficamente segura usando
     * window.crypto.getRandomValues()
     * 
     * @returns {string} Senha gerada ou string vazia se nenhum tipo selecionado
     */
    function gerarSenha() {
        const comprimento = parseInt(tamanhoSlider.value, 10);
        const usarMaius = chkMaiusculas.checked;
        const usarMinus = chkMinusculas.checked;
        const usarNumeros = chkNumeros.checked;
        const usarSimbolos = chkSimbolos.checked;

        // Valida se pelo menos uma opção está marcada
        if (!usarMaius && !usarMinus && !usarNumeros && !usarSimbolos) {
            mostrarToast('⚠️ Selecione pelo menos um tipo de caractere');
            return '';
        }

        // Monta o alfabeto com base nas opções
        let alfabeto = '';
        if (usarMaius) alfabeto += CHARS.maiusculas;
        if (usarMinus) alfabeto += CHARS.minusculas;
        if (usarNumeros) alfabeto += CHARS.numeros;
        if (usarSimbolos) alfabeto += CHARS.simbolos;

        // Usa Uint32Array para obter valores criptograficamente fortes
        const randomValues = new Uint32Array(comprimento);
        window.crypto.getRandomValues(randomValues);

        let senha = '';
        const alphabetLength = alfabeto.length;
        for (let i = 0; i < comprimento; i++) {
            // Índice aleatório usando o valor criptográfico
            const idx = randomValues[i] % alphabetLength;
            senha += alfabeto.charAt(idx);
        }

        return senha;
    }

    // ---------- ATUALIZAR INTERFACE COM NOVA SENHA ----------
    function atualizarSenha() {
        const nova = gerarSenha();
        if (nova === '') return;
        senhaAtual = nova;
        senhaInput.value = nova;
        atualizarForca(nova);
        adicionarHistorico(nova);
        // Pequena animação
        senhaInput.style.animation = 'none';
        requestAnimationFrame(() => {
            senhaInput.style.animation = 'fadeIn 0.2s ease';
        });
    }

    /**
     * Avalia a força da senha baseado em:
     * - Comprimento
     * - Presença de maiúsculas, minúsculas, números e símbolos
     * 
     * Classifica como: FRACA, MÉDIA ou FORTE
     */
    function atualizarForca(senha) {
        if (!senha || senha.length === 0) {
            forcaBarra.style.width = '0%';
            forcaLabel.textContent = '—';
            return;
        }

        const len = senha.length;
        let score = 0;

        // Critérios de pontuação
        if (len >= 12) score += 25;
        else if (len >= 8) score += 15;
        else score += 5;

        if (/[A-Z]/.test(senha)) score += 15;
        if (/[a-z]/.test(senha)) score += 15;
        if (/\d/.test(senha)) score += 15;
        if (/[^A-Za-z0-9]/.test(senha)) score += 20;

        // Bônus por comprimento extra
        if (len >= 20) score += 10;
        if (len >= 30) score += 10;

        // Limita em 100
        score = Math.min(100, score);

        let cor, texto;
        if (score < 40) {
            cor = '#f87171';   // vermelho
            texto = 'FRACA';
        } else if (score < 65) {
            cor = '#fbbf24';   // amarelo
            texto = 'MÉDIA';
        } else {
            cor = '#34d399';   // verde
            texto = 'FORTE';
        }

        forcaBarra.style.width = score + '%';
        forcaBarra.style.background = cor;
        forcaLabel.textContent = texto;
        forcaLabel.style.color = cor;
    }

    /**
     * Copia a senha usando Clipboard API com fallback
     * para document.execCommand('copy')
     */
    function copiarSenha(senha) {
        if (!senha || senha.length === 0) {
            mostrarToast('⚠️ Nenhuma senha para copiar');
            return;
        }

        // Tenta usar a Clipboard API moderna
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(senha)
                .then(() => {
                    mostrarToast('✅ Senha copiada!');
                })
                .catch(() => {
                    // Fallback: seleciona e usa o comando copy
                    fallbackCopiar(senha);
                });
        } else {
            fallbackCopiar(senha);
        }
    }

    /**
     * Fallback para copiar usando input temporário
     */
    function fallbackCopiar(senha) {
        const temp = document.createElement('input');
        temp.value = senha;
        temp.style.position = 'absolute';
        temp.style.left = '-9999px';
        temp.style.top = '-9999px';
        document.body.appendChild(temp);
        temp.select();
        try {
            const ok = document.execCommand('copy');
            if (ok) {
                mostrarToast('✅ Senha copiada!');
            } else {
                mostrarToast('❌ Erro ao copiar. Selecione manualmente.');
            }
        } catch (_) {
            mostrarToast('❌ Erro ao copiar. Selecione manualmente.');
        }
        document.body.removeChild(temp);
    }

    // ---------- TOAST (notificações) ----------
    let timeoutToast = null;

    function mostrarToast(mensagem) {
        toast.textContent = mensagem;
        toast.classList.add('visivel');
        clearTimeout(timeoutToast);
        timeoutToast = setTimeout(() => {
            toast.classList.remove('visivel');
        }, 2600);
    }

    // ---------- TOGGLE VISIBILIDADE ----------
    let visivel = true;

    function toggleVisibilidade() {
        visivel = !visivel;
        if (visivel) {
            senhaInput.type = 'text';
            toggleVisib.textContent = '👁️';
        } else {
            senhaInput.type = 'password';
            toggleVisib.textContent = '🙈';
        }
    }

    // ---------- EVENTOS ----------
    gerarBtn.addEventListener('click', atualizarSenha);

    copiarBtn.addEventListener('click', function() {
        copiarSenha(senhaAtual);
    });

    toggleVisib.addEventListener('click', toggleVisibilidade);

    tamanhoSlider.addEventListener('input', function() {
        tamanhoValor.textContent = this.value;
    });

    limparHistBtn.addEventListener('click', limparHistorico);

    // Tecla Enter no campo regenera a senha
    senhaInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            gerarBtn.click();
        }
    });

    // ---------- INICIALIZAÇÃO ----------
    function init() {
        carregarHistorico();
        tamanhoValor.textContent = tamanhoSlider.value;
        // Gera a primeira senha
        atualizarSenha();
        // Se não tiver histórico, adiciona a atual
        if (historico.length === 0 && senhaAtual) {
            adicionarHistorico(senhaAtual);
        }
    }

    init();

    // Expõe funções para debug (opcional)
    window.__gerador = { gerarSenha, atualizarSenha, copiarSenha, historico };

})();
