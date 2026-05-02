# Blockchain — Cadeia de Custódia de Evidências Digitais

Projeto de demonstração prática para trabalho acadêmico de **Segurança de Sistemas**.  
Usa Ganache (Ethereum local) + Solidity + ethers.js v6 para demonstrar:

| Conceito de Segurança | Como é demonstrado |
|---|---|
| **Hash criptográfico** | SHA-256 do conteúdo do arquivo (Node.js `crypto`) |
| **Integridade de dados** | Hash armazenado on-chain vs. hash recalculado do arquivo |
| **Assinatura digital** | `msg.sender` — endereço derivado da chave privada do assinante |
| **Não-repúdio** | Endereço do registrante gravado permanentemente no contrato |
| **Imutabilidade** | Dados em blockchain não podem ser alterados após confirmação |
| **Cadeia de custódia** | Hash + assinante + timestamp registrados atomicamente |

---

## Estrutura do Projeto

```
├── contracts/
│   └── EvidenceRegistry.sol   # Smart contract Solidity
├── scripts/
│   ├── deploy.js              # Compila + faz deploy no Ganache
│   └── demo.js                # Demonstração completa (5 etapas)
├── deployment.json            # Gerado pelo deploy (endereço + ABI)
├── package.json
└── README.md
```

---

## Pré-requisitos

### 1. Node.js (versão 18 ou superior) — OBRIGATÓRIO

ethers.js v6 requer Node.js 18+. Verifique sua versão:

```bash
node --version   # precisa ser v18.x.x ou superior
```

**Se estiver em versão antiga (como v12), atualize via nvm (recomendado):**

```bash
# Instalar o nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Recarregar o shell (ou abrir novo terminal)
source ~/.bashrc

# Instalar e ativar Node.js 20 LTS
nvm install 20
nvm use 20

# Confirmar
node --version   # deve mostrar v20.x.x
```

### 2. Dependências de compilação (necessárias para o pacote `solc`)

```bash
sudo apt-get install -y build-essential python3
```

### 3. Ganache (blockchain Ethereum local)

```bash
# Instalar globalmente (uma vez só)
npm install -g ganache

# Verificar instalação
ganache --version
```

---

## Instalação

```bash
# Entrar na pasta do projeto
cd puc/seguranca

# Instalar dependências Node.js (ethers.js + solc)
npm install
```

> A instalação do `solc` pode levar alguns minutos pois compila código nativo.

---

## Execução

### Passo 1 — Iniciar o Ganache (terminal separado)

```bash
ganache --deterministic
```

Deixe este terminal aberto. O Ganache cria automaticamente 10 contas com 1000 ETH cada  
e expõe um nó Ethereum local em `http://127.0.0.1:8545`.

A flag `--deterministic` garante que as contas e chaves privadas sejam sempre as mesmas  
(útil para replicar resultados em apresentações).

### Passo 2 — Deploy do contrato (novo terminal)

```bash
npm run deploy
# ou: node scripts/deploy.js
```

Este script:
1. Lê `contracts/EvidenceRegistry.sol`
2. Compila com o compilador Solidity (pacote `solc`)
3. Faz o deploy no Ganache via ethers.js
4. Salva `deployment.json` com o endereço e a ABI do contrato

Saída esperada:
```
╔══════════════════════════════════════════╗
║         DEPLOY — EvidenceRegistry        ║
╚══════════════════════════════════════════╝

Deployer : 0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1
Saldo    : 1000.0 ETH
Compilando contrato...
Compilado com sucesso.
Aguardando confirmação do bloco... OK

Contrato deployado em: 0x...
Informações salvas em deployment.json
```

### Passo 3 — Executar a demonstração

```bash
npm run demo
# ou: node scripts/demo.js
```

O script percorre **5 etapas** e imprime no terminal:

1. **Conexão** — lista contas disponíveis no Ganache
2. **Hash SHA-256** — gera a "impressão digital" de um arquivo fictício
3. **Registro** — grava o hash na blockchain (transação assinada digitalmente)
4. **Verificação** — consulta e compara os hashes (prova de integridade)
5. **Adulteração** — modifica o arquivo e mostra que o hash não bate (efeito avalanche)

### Atalho (deploy + demo em sequência)

```bash
npm start
```

---

## Solução de Problemas

| Erro | Solução |
|---|---|
| `Cannot connect to Ganache` | Certifique-se que `ganache --deterministic` está rodando |
| `deployment.json não encontrado` | Execute `npm run deploy` antes do `npm run demo` |
| `Erro ao instalar solc` | Execute `sudo apt-get install build-essential python3` |
| `node: command not found` | Instale o Node.js 18+ conforme instruções acima |

---

## Referências Teóricas

- **SHA-256**: FIPS PUB 180-4 — Secure Hash Standard (NIST)
- **Assinaturas digitais em Ethereum**: ECDSA com curva secp256k1
- **Imutabilidade em blockchain**: Nakamoto, S. (2008). *Bitcoin: A Peer-to-Peer Electronic Cash System*
- **Smart contracts**: Wood, G. (2014). *Ethereum: A Secure Decentralised Generalised Transaction Ledger*
- **Cadeia de custódia digital**: ISO/IEC 27037:2012 — Guidelines for identification, collection, acquisition and preservation of digital evidence
