# Propostas Temeron

Sistema para enviar propostas comerciais como link de site, no lugar do PDF.

Você preenche no painel só o que muda de cliente para cliente — nome, datas, textos de
diagnóstico, range e pacotes — e o sistema gera um endereço único para mandar ao cliente. Ele abre
no celular, lê, se identifica pelo primeiro nome e clica no botão do WhatsApp, que chega até você
já dizendo quem é e qual pacote quer.

Várias propostas rodam ao mesmo tempo, cada uma com seu link, seu status e sua validade.

---

## Índice

1. [Como funciona](#1-como-funciona)
2. [Ver funcionando agora](#2-ver-funcionando-agora)
3. [Colocar no ar](#3-colocar-no-ar)
4. [O dia a dia](#4-o-dia-a-dia)
5. [Como o cliente é reconhecido](#5-como-o-cliente-é-reconhecido)
6. [Estrutura dos arquivos](#6-estrutura-dos-arquivos)
7. [Segurança](#7-segurança)
8. [Problemas comuns](#8-problemas-comuns)

---

## 1. Como funciona

| Peça         | O que é                            | Onde fica                  |
| ------------ | ---------------------------------- | -------------------------- |
| **Painel**   | Onde você escreve a proposta       | `/admin` (só você entra)   |
| **Banco**    | Onde as propostas ficam guardadas  | Supabase                   |
| **Proposta** | A página que o cliente abre        | `/p/easyfoot-x7k2p9`       |

Não há etapa de compilação: HTML, CSS e JavaScript direto. Nada de Node, nada de `npm install`.

O visual segue o PDF original slide a slide, inclusive o ritmo entre páginas claras e escuras:
capa clara, divisória escura com o nome do cliente, diagnóstico e objetivo claros, **range em
fundo escuro**, divisórias escuras abrindo cada capítulo ("Serviços", "Bônus", "Cases",
"Pacotes"), a faixa vermelha do antes/depois e o encerramento escuro.

---

## 2. Ver funcionando agora

Abra o PowerShell na pasta do projeto:

```bash
powershell -ExecutionPolicy Bypass -File ferramentas/servidor-local.ps1
```

Depois:

- **<http://localhost:8080/p/demo>** — a proposta da Easyfoot
- **<http://localhost:8080/admin>** — o painel

Sem o Supabase configurado, o painel roda em **modo demonstração**: funciona inteiro, salvando só
no seu navegador. `Ctrl+C` na janela para parar.

---

## 3. Colocar no ar

### 3.1 Banco (Supabase)

1. No projeto do Supabase, vá em **SQL Editor** → **New query**.
2. Cole o conteúdo de `supabase/schema.sql` e clique em **Run**.
   O e-mail `ricardo@temeron.com.br` já está configurado como administrador.
3. Em **Authentication** → **Users** → **Add user** → **Create new user**: use
   `ricardo@temeron.com.br`, defina a senha e **marque "Auto Confirm User"** (sem isso o login
   não passa).
4. Em **Authentication** → **Providers** → **Email**: desligue **Enable sign ups** e salve.

### 3.2 Chave da API

Em **Project Settings** → **API Keys**, copie a chave **anon public**. Ela é longa e começa com
`eyJ`. Cole em `assets/js/config.js`:

```js
supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
```

Cuidado com uma confusão comum: o endereço `https://...supabase.co/rest/v1/` que aparece na mesma
tela **não é a chave** — é o endereço da API. A chave é o texto comprido de três blocos separados
por ponto.

Nunca use a chave `service_role` aqui: ela ignora todas as regras de segurança.

### 3.3 Site (Vercel)

O repositório já está conectado. Cada `git push` publica sozinho.

O arquivo `vercel.json` cuida das reescritas de URL — é ele que faz `/p/qualquer-coisa` abrir a
proposta certa — e dos cabeçalhos de segurança.

Para um domínio próprio (`propostas.temeron.com.br`): **Settings** → **Domains** no painel da
Vercel.

> O `netlify.toml` continua no repositório para o caso de você migrar um dia. A Vercel ignora ele.

---

## 4. O dia a dia

### Criar e enviar

1. Entre em `seusite.vercel.app/admin`.
2. **Nova proposta**.
3. Preencha os quatro blocos: **Cliente**, **Textos**, **Pacotes**, **Publicação**.
4. Em Publicação, clique em **Gerar** para criar o endereço.
5. **Salvar e publicar**, **Copiar** o link e mandar no WhatsApp.

Enquanto for **rascunho**, o link não abre para ninguém.

### O que o painel edita (e o que não)

O painel só pede o que muda de cliente para cliente:

- nome do cliente, artigo ("a" Easyfoot / "o" Grêmio), logo, datas
- os parágrafos do diagnóstico e do objetivo
- redes sociais
- range de valores
- pacotes: nome, preço, quantidades e o checklist do que entra

Tudo o mais — o texto sobre a Temeron, os serviços, o Método Âncora, os bônus, os cases e os
depoimentos — vem pronto de `assets/js/modelo.js` e é igual em toda proposta. Para mudar esse
padrão, edite aquele arquivo. Propostas já criadas guardam a versão que tinham quando foram
salvas, de propósito: uma proposta que já está com o cliente não deve mudar sozinha.

### O checklist dos pacotes

Cada linha tem uma caixa de seleção e um campo de quantidade:

- **marcada** → aparece normal na proposta, com a quantidade ("4x"). Campo vazio vira "Sim".
- **desmarcada** → aparece acinzentada com um travessão

É esse contraste que mostra ao cliente o que ele ganha subindo de pacote. Por isso as linhas são
as mesmas nos três: adicionar ou remover uma linha mexe em todos os pacotes ao mesmo tempo, para
a comparação nunca sair do lugar.

Use **+ Nova linha em todos os pacotes** para incluir um serviço que não está na lista.

### Personalizar textos com o nome de quem lê

Em qualquer campo de texto do painel você pode escrever `{nome}`:

> `{nome}, o foco desta proposta é fazer o digital da Easyfoot contar a mesma história...`

Se a pessoa se identificou, vira "Mauro, o foco desta proposta...". Se não, o marcador some e a
frase é recapitalizada sozinha: "O foco desta proposta...". Nos dois casos o texto fica correto.

Alguns títulos já fazem isso sem você precisar escrever nada: "Mauro, vamos começar?", "Mauro,
são três formatos possíveis".

### Salvar em PDF

Tem um botão **PDF** na barra do topo e um **Salvar em PDF** no fim da proposta. Ele abre a caixa
de impressão do navegador, onde se escolhe "Salvar como PDF".

O layout de impressão é feito para isso: mantém as cores da marca, esconde botões, começa cada
capítulo em página nova e imprime o telefone por escrito (já que o botão de WhatsApp não funciona
no papel).

### Várias propostas ao mesmo tempo

A tela inicial lista tudo com status e validade, com filtros e busca por cliente.

**Duplicar** copia uma proposta inteira como rascunho — o caminho rápido para um cliente parecido.
**Arquivar** desliga o link sem apagar o histórico.

---

## 5. Como o cliente é reconhecido

Logo abaixo da capa, a proposta pergunta o primeiro nome de quem está lendo. A partir dali o nome
aparece nos títulos e, principalmente, **na mensagem que sai para o WhatsApp**:

> Olá, Ricardo! Aqui é o Mauro, da Easyfoot. Vi a proposta e quero seguir com o pacote Premium
> (R$ 1.500,00/mensal).

Você sabe quem é, de onde é e o que quer, antes de responder.

### Por que não é por IP

A ideia de guardar por IP parece resolver, mas quebra justamente no caso que importa: **dois
sócios lendo a mesma proposta**. Eles quase sempre estão no mesmo escritório, atrás do mesmo
roteador — ou seja, com o **mesmo IP público**. O segundo sócio a abrir seria chamado pelo nome do
primeiro.

Some a isso: IP de celular muda a cada troca de rede, operadoras compartilham um mesmo IP entre
milhares de clientes (CGNAT), e IP é dado pessoal sob a LGPD, o que traria obrigação de aviso e
guarda.

O sistema usa o armazenamento do navegador. Cada aparelho guarda o seu nome, então dois sócios em
dois celulares são duas pessoas diferentes sem nenhum esforço — que é exatamente o que se queria.

O limite honesto: se a mesma pessoa abrir no celular e depois no computador, ela é perguntada de
novo. E há o botão **"Não sou eu"**, para quando o link é aberto no aparelho de outra pessoa.

---

## 6. Estrutura dos arquivos

```
proposta/
├── index.html               Página inicial
├── proposta.html            O molde da proposta — o cliente vê isto
├── vercel.json              Reescritas de URL e segurança (Vercel)
├── netlify.toml             O mesmo, para Netlify (reserva)
│
├── admin/
│   ├── index.html           Login e lista
│   └── editor.html          Formulário
│
├── assets/
│   ├── css/
│   │   ├── tokens.css       Cores, tipografia, espaçamentos
│   │   ├── base.css         Reset e botões
│   │   ├── proposta.css     Aparência da proposta
│   │   └── admin.css        Aparência do painel
│   ├── js/
│   │   ├── config.js        >>> SUAS CHAVES DO SUPABASE <<<
│   │   ├── modelo.js        Formato da proposta e textos institucionais
│   │   ├── dados.js         Conversa com o banco
│   │   ├── leitor.js        Nome de quem está lendo
│   │   ├── utils.js         Datas, moeda, links
│   │   ├── ui.js            Avisos e confirmações
│   │   ├── proposta.js      Monta a página do cliente
│   │   ├── admin.js         Login e listagem
│   │   └── editor.js        Formulário
│   └── img/
│       ├── cases/           Imagens extraídas do PDF original
│       ├── og-padrao.png    Prévia do link no WhatsApp
│       └── favicon.svg
│
├── dados/propostas/demo.json    Proposta de demonstração
├── supabase/schema.sql          Cole no SQL Editor
└── ferramentas/servidor-local.ps1
```

### Cores

Em `assets/css/tokens.css`, extraídas do PDF:

| Cor      | Código    | Onde aparece                          |
| -------- | --------- | ------------------------------------- |
| Osso     | `#ede4d3` | Fundo das seções claras               |
| Tinta    | `#191919` | Divisórias, range e encerramento      |
| Vermelho | `#da291c` | Acentos, faixa do antes/depois, CTA   |

---

## 7. Segurança

Já resolvido:

- **Link não adivinhável** — cada proposta ganha um código aleatório no fim.
- **Rascunho é invisível** — a regra está no banco, não só na tela.
- **Fora do Google** — propostas e painel pedem para não serem indexados.
- **Só administradores editam** — a tabela `administradores` no Supabase manda.

Depende de você:

- Desligar o cadastro público no Supabase (passo 3.1.4).
- Não colar a chave `service_role` no `config.js`.
- **Não commitar a senha do painel em lugar nenhum.** Ela vive só no Supabase e no seu gerenciador
  de senhas. O repositório é público: qualquer coisa commitada aqui fica no histórico do Git para
  sempre, mesmo que você apague depois.
- Lembrar que quem tem o link vê a proposta. É como mandar um PDF.

---

## 8. Problemas comuns

**"Esta proposta não existe ou ainda não foi publicada."**
O status está como rascunho ou arquivada.

**"Sem permissão para esta operação."**
Seu e-mail não está na tabela `administradores`, ou está escrito diferente do e-mail do login.
Confira: `select * from public.administradores;`

**O login não passa, mas a senha está certa.**
O usuário não foi confirmado. Apague e crie de novo marcando **Auto Confirm User**.

**A página fica em "Carregando a proposta…" para sempre.**
Provavelmente a `supabaseAnonKey` está errada ou vazia em `assets/js/config.js`. Abra o console do
navegador (F12) para ver o erro.

**Abri o `proposta.html` com dois cliques e ficou em branco.**
Esperado: o navegador bloqueia leitura de arquivos locais. Use o `servidor-local.ps1`.

**O link no WhatsApp aparece sem imagem de prévia.**
A imagem `assets/img/og-padrao.png` existe, mas a prévia mostra sempre a genérica da Temeron, não
o nome do cliente — o WhatsApp lê o HTML antes do JavaScript rodar. Dá para resolver com uma
função na Vercel, se algum dia valer a pena.
