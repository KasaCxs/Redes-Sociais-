document.addEventListener('DOMContentLoaded', () => {
    console.log("Chroma Flow: DOM Carregado.");

    // --- Seletores Globais e Verificações Iniciais ---
    const canvas = document.getElementById('infiniteFlowCanvas');
    const container = document.querySelector('.container');
    const fullscreenButton = document.getElementById('fullscreenBtn');
    // const viewCountElement = document.getElementById('viewCountDisplay'); // REMOVIDO
    const gifImageElement = document.getElementById('bgImage'); // Seleciona o elemento da imagem/GIF

    // Verifica se os elementos essenciais foram encontrados
    if (!canvas) console.error("ERRO CRÍTICO: Canvas 'infiniteFlowCanvas' não encontrado!");
    if (!container) console.error("ERRO CRÍTICO: Container '.container' não encontrado!");
    if (!fullscreenButton) console.warn("AVISO: Botão 'fullscreenBtn' não encontrado.");
    // Verificação do contador removida
    if (!gifImageElement) console.warn("AVISO: Elemento de Imagem/GIF 'bgImage' não encontrado!"); // Adicionada verificação da imagem

    // --- Configuração do Canvas de Fundo ---
    let ctx = null;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let animationFrameIdBg;
    const DARK_BG_CLEAR = 'rgba(5, 5, 5, 0.1)';

    if (canvas) {
        try {
            ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Falha ao obter contexto 2D do canvas");
            canvas.width = width;
            canvas.height = height;
            console.log("Canvas inicializado com sucesso.");
        } catch (e) {
            console.error("ERRO ao inicializar o Canvas:", e);
            ctx = null;
        }
    }

    // --- Simplex Noise para Animação ---
    let noiseGen = null;
    try {
        if (typeof SimplexNoise !== 'undefined') {
            noiseGen = new SimplexNoise();
            console.log("SimplexNoise carregado.");
        } else {
            console.warn("Biblioteca SimplexNoise não definida. Animação de fundo complexa desativada.");
        }
    } catch (e) {
        console.error("ERRO ao instanciar SimplexNoise:", e);
    }

    let noiseTime = Math.random() * 100;
    let noiseTime2 = Math.random() * 100;

    // --- Partículas RGB Flutuantes ---
    const particles = [];
    const numParticles = 80;
    const particleMinSize = 0.5;
    const particleMaxSize = 2.0;
    const particleBaseSpeed = 0.15;
    const particleAddedSpeed = 0.3;
    const particleFlowStrength = 0.25;
    const particleHueSpeed = 0.5;

    class Particle {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * particleBaseSpeed;
            this.vy = (Math.random() - 0.5) * particleBaseSpeed;
            this.size = particleMinSize + Math.random() * (particleMaxSize - particleMinSize);
            this.hue = Math.random() * 360;
            this.saturation = 90 + Math.random() * 10;
            this.lightness = 60 + Math.random() * 15;
            this.life = 0;
            this.maxLife = 1 + Math.random() * 1;
            this.lifeRatio = 0;
        }

        update(noiseScale, time) {
            try {
                if (!noiseGen) return;
                const angle = noiseGen.noise3D(this.x * noiseScale, this.y * noiseScale, time * 0.3) * Math.PI * 2;
                const flowX = Math.cos(angle) * particleFlowStrength;
                const flowY = Math.sin(angle) * particleFlowStrength;
                this.vx = (this.vx * 0.96) + flowX + (Math.random() - 0.5) * particleAddedSpeed;
                this.vy = (this.vy * 0.96) + flowY + (Math.random() - 0.5) * particleAddedSpeed;
                this.x += this.vx;
                this.y += this.vy;
                this.hue = (this.hue + particleHueSpeed) % 360;
                if (this.life < this.maxLife) {
                    this.life += 0.01;
                }
                this.lifeRatio = Math.min(1, this.life / this.maxLife);
                if (this.x < -this.size || this.x > width + this.size || this.y < -this.size || this.y > height + this.size) {
                    this.lifeRatio -= 0.05;
                    if (this.lifeRatio <= 0) this.reset();
                } else if (this.life >= this.maxLife) {
                    this.lifeRatio -= 0.015;
                    if (this.lifeRatio <= 0) this.reset();
                }
            } catch (e) {
                console.error("Erro em Particle.update:", e);
                this.reset();
            }
        }

        draw() {
            try {
                if (!ctx) return;
                ctx.fillStyle = `hsl(${this.hue}, ${this.saturation}%, ${this.lightness}%)`;
                ctx.globalAlpha = Math.sin(this.lifeRatio * Math.PI) * 0.9;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * this.lifeRatio, 0, Math.PI * 2);
                ctx.fill();
            } catch (e) {
                console.error("Erro em Particle.draw:", e);
            }
        }
    }

    function initializeParticles() {
        try {
            particles.length = 0;
            if (!canvas) return;
            for (let i = 0; i < numParticles; i++) {
                particles.push(new Particle());
            }
            console.log("Partículas RGB inicializadas:", particles.length);
        } catch (e) {
            console.error("Erro ao inicializar partículas:", e);
        }
    }

    // --- Loop de Animação Principal do Fundo (Canvas) ---
    const noiseScale1 = 0.0025;
    const noiseScale2 = 0.009;
    const noiseSpeed1 = 0.00015;
    const noiseSpeed2 = 0.0004;

    function animateBackground(timestamp) {
        try {
            if (!ctx || !noiseGen) {
                if (animationFrameIdBg) cancelAnimationFrame(animationFrameIdBg);
                console.warn("Animação de fundo parada: Ctx ou NoiseGen indisponível.");
                if(ctx) {
                    ctx.fillStyle = '#101010';
                    ctx.fillRect(0, 0, width, height);
                }
                return;
            }

            ctx.fillStyle = DARK_BG_CLEAR;
            ctx.fillRect(0, 0, width, height);
            ctx.globalAlpha = 1;

            // --- Desenha fundo com ruído (Comentado por performance) ---
            /*
            try {
                const imageData = ctx.getImageData(0, 0, width, height);
                const data = imageData.data;
                noiseTime += noiseSpeed1;
                noiseTime2 += noiseSpeed2;
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const v1 = noiseGen.noise3D(x * noiseScale1, y * noiseScale1, noiseTime);
                        const v2 = noiseGen.noise3D(x * noiseScale2 + 50, y * noiseScale2 + 25, noiseTime2);
                        const combinedValue = (v1 * 0.5 + v2 * 0.5);
                        const intensity = (combinedValue + 1) / 2;
                        const bgColor = Math.floor(2 + intensity * 8);
                        const idx = (y * width + x) * 4;
                        data[idx] = bgColor; data[idx + 1] = bgColor; data[idx + 2] = bgColor; data[idx + 3] = 255;
                    }
                }
                ctx.putImageData(imageData, 0, 0);
            } catch (imgDataError) {
                console.error("Erro ao processar ImageData:", imgDataError);
                ctx.fillStyle = '#101010'; ctx.fillRect(0, 0, width, height);
            }
            */

            // --- Desenha as partículas ---
            ctx.globalAlpha = 1;
            particles.forEach(p => {
                p.update(noiseScale2, noiseTime2);
                p.draw();
            });
            ctx.globalAlpha = 1;

            animationFrameIdBg = requestAnimationFrame(animateBackground);

        } catch (e) {
            console.error("Erro CRÍTICO no loop animateBackground:", e);
            if (animationFrameIdBg) cancelAnimationFrame(animationFrameIdBg);
        }
    }

    // --- Lógica do Contador Removida ---

    // --- Lógica do Botão Tela Cheia ---
    if (fullscreenButton) {
        fullscreenButton.addEventListener('click', () => {
            try {
                const elem = document.documentElement;
                const isAlreadyFullscreen = document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement;

                if (!isAlreadyFullscreen) {
                    let requestPromise = null;
                    if (elem.requestFullscreen) { requestPromise = elem.requestFullscreen(); }
                    else if (elem.mozRequestFullScreen) { requestPromise = elem.mozRequestFullScreen(); }
                    else if (elem.webkitRequestFullscreen) { requestPromise = elem.webkitRequestFullscreen(); }
                    else if (elem.msRequestFullscreen) { requestPromise = elem.msRequestFullscreen(); }

                    if (requestPromise) {
                        requestPromise.then(() => { console.log("Entrou em modo Tela Cheia."); })
                                      .catch(err => { console.error(`Erro ao ENTRAR em Tela Cheia: ${err.name} - ${err.message}`, err); });
                    } else {
                        console.error("API de Tela Cheia não suportada neste navegador.");
                    }
                } else {
                    let exitPromise = null;
                    if (document.exitFullscreen) { exitPromise = document.exitFullscreen(); }
                    else if (document.mozCancelFullScreen) { exitPromise = document.mozCancelFullScreen(); }
                    else if (document.webkitExitFullscreen) { exitPromise = document.webkitExitFullscreen(); }
                    else if (document.msExitFullscreen) { exitPromise = document.msExitFullscreen(); }

                    if (exitPromise) {
                        exitPromise.then(() => { console.log("Saiu do modo Tela Cheia."); })
                                   .catch(err => { console.error(`Erro ao SAIR da Tela Cheia: ${err.name} - ${err.message}`, err); });
                    } else {
                        console.error("API para sair da Tela Cheia não suportada neste navegador.");
                    }
                }
            } catch (e) {
                console.error("Erro inesperado no evento de clique do botão Tela Cheia:", e);
            }
        });

        const fsIcon = fullscreenButton.querySelector('i');
        const fsTextSpan = fullscreenButton.querySelector('span');
        const updateFsButton = () => {
            try {
                const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
                if (isFs) {
                    if (fsIcon) fsIcon.classList.replace('fa-expand', 'fa-compress');
                    if (fsTextSpan) fsTextSpan.textContent = " Sair";
                } else {
                    if (fsIcon) fsIcon.classList.replace('fa-compress', 'fa-expand');
                    if (fsTextSpan) fsTextSpan.textContent = " Tela Cheia";
                }
            } catch (e) {
                console.error("Erro ao atualizar o botão de Tela Cheia:", e);
            }
        };

        document.addEventListener('fullscreenchange', updateFsButton);
        document.addEventListener('webkitfullscreenchange', updateFsButton);
        document.addEventListener('mozfullscreenchange', updateFsButton);
        document.addEventListener('MSFullscreenChange', updateFsButton);

        setTimeout(updateFsButton, 150);
        console.log("Listeners de Tela Cheia configurados.");
    }

    // --- REMOVIDO Bloco de Listeners de Evento do Vídeo ---


    // --- Função de Inicialização/Redimensionamento Geral ---
    function initialize() {
        try {
            console.log("Inicializando/Redimensionando...");
            width = window.innerWidth;
            // Ajuste a altura para considerar a rolagem, se necessário,
            // mas para o canvas fixo, a altura da janela ainda é relevante.
            height = window.innerHeight;

            if (canvas && ctx) {
                canvas.width = width;
                canvas.height = height;
            } else {
                console.warn("Canvas não disponível, pulando inicialização da animação de fundo.");
                return;
            }

            if (noiseGen && ctx) {
                initializeParticles();
                if (animationFrameIdBg) {
                    cancelAnimationFrame(animationFrameIdBg);
                }
                animationFrameIdBg = requestAnimationFrame(animateBackground);
                console.log("Animação de fundo reiniciada.");
            } else {
                 if(ctx) {
                     ctx.fillStyle = '#101010';
                     ctx.fillRect(0,0,width, height);
                     console.log("Pintando fundo estático (NoiseGen ou Ctx não pronto).");
                 }
            }
        } catch (e) {
            console.error("Erro na função initialize:", e);
            if (animationFrameIdBg) cancelAnimationFrame(animationFrameIdBg);
        }
    }

    window.addEventListener('resize', initialize);

    // --- Primeira Inicialização ---
    if (noiseGen && ctx) {
        initialize();
    } else {
        console.warn("Aguardando para tentativa de inicialização tardia (NoiseGen ou Ctx não prontos)...");
        setTimeout(() => {
            if (!ctx && canvas) { try { ctx = canvas.getContext('2d'); } catch(e){} }
            if (typeof SimplexNoise !== 'undefined' && !noiseGen) { try { noiseGen = new SimplexNoise(); } catch(e){} }

            if (noiseGen && ctx) {
                console.log("Tentativa de inicialização tardia...");
                initialize();
            } else {
                console.error(`Falha na inicialização tardia: Noise=${!!noiseGen}, Ctx=${!!ctx}`);
                initialize(); // Tenta inicializar mesmo sem tudo, pode pintar o fundo estático
            }
        }, 500);
    }

    console.log("Setup inicial do script concluído.");

}); // Fim do DOMContentLoaded
