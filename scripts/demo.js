/**
 * demo.js — Demonstração prática dos conceitos de segurança via blockchain.
 *
 * Conceitos ilustrados em cada etapa:
 *   ETAPA 1 — Conexão    : apresenta a infraestrutura blockchain (contas, saldos)
 *   ETAPA 2 — Hash       : SHA-256 como "impressão digital" do arquivo
 *   ETAPA 3 — Registro   : imutabilidade; transação assinada digitalmente grava o hash
 *   ETAPA 4 — Verificação: consulta prova que os dados não mudaram desde o registro
 *   ETAPA 5 — Adulteração: efeito avalanche do hash detecta qualquer alteração no conteúdo
 *
 * Pré-requisito: rodar `node scripts/deploy.js` antes desta demonstração.
 */

const { ethers } = require('ethers');
const crypto     = require('crypto');  // módulo nativo do Node.js — não precisa instalar
const fs         = require('fs');
const path       = require('path');

// ── Utilitários ───────────────────────────────────────────────────────────────

// Calcula SHA-256 de qualquer string e retorna em hexadecimal (64 caracteres)
// SHA-256 é uma função de hash criptográfico: determinística, one-way, resistente a colisões
function sha256(content) {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

function sep(char = '─', len = 60) {
    return char.repeat(len);
}

function titulo(n, texto) {
    console.log(`\n${sep()}`);
    console.log(`  ETAPA ${n}: ${texto}`);
    console.log(sep());
}

function ok(label, valor) {
    console.log(`  ✔  ${label.padEnd(28)} ${valor}`);
}

function info(label, valor) {
    console.log(`  ·  ${label.padEnd(28)} ${valor}`);
}

// ── Demo principal ────────────────────────────────────────────────────────────

async function main() {
    console.log('\n' + sep('═'));
    console.log('  DEMONSTRAÇÃO: Cadeia de Custódia de Evidências Digitais');
    console.log('  Conceitos: Hash · Integridade · Assinatura Digital · Imutabilidade');
    console.log(sep('═'));

    // Verifica se o deploy já foi executado
    const deploymentPath = path.join(__dirname, '..', 'deployment.json');
    if (!fs.existsSync(deploymentPath)) {
        console.error('\nERRO: deployment.json não encontrado.');
        console.error('Execute primeiro: node scripts/deploy.js\n');
        process.exit(1);
    }

    // ── ETAPA 1: CONEXÃO ──────────────────────────────────────────────────────
    titulo(1, 'CONEXÃO COM A BLOCKCHAIN');

    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');

    try {
        await provider.getBlockNumber();
    } catch {
        console.error('\nERRO: Ganache não está rodando em http://127.0.0.1:8545');
        console.error('Execute: npx ganache --deterministic\n');
        process.exit(1);
    }

    const network = await provider.getNetwork();
    const blockN  = await provider.getBlockNumber();

    info('Endpoint RPC', 'http://127.0.0.1:8545');
    info('Chain ID', network.chainId.toString());
    info('Bloco atual', blockN.toString());

    // eth_accounts retorna a lista de contas gerenciadas pelo nó (Ganache as cria automaticamente)
    // Em produção, cada conta representa uma chave privada distinta — base da assinatura digital
    const rawAccounts = await provider.send('eth_accounts', []);
    console.log(`\n  Contas disponíveis no Ganache (${rawAccounts.length} total, exibindo 3):`);
    for (const addr of rawAccounts.slice(0, 3)) {
        const bal = ethers.formatEther(await provider.getBalance(addr));
        console.log(`    ${addr}  (${bal} ETH)`);
    }

    // Carrega o contrato já deployado (endereço + ABI salvos pelo deploy.js)
    const { address, abi } = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    const signer   = await provider.getSigner(0);   // conta que vai assinar as transações
    const registry = new ethers.Contract(address, abi, signer);

    info('\n  Contrato EvidenceRegistry', address);
    info('  Assinante (deployer)', await signer.getAddress());

    // ── ETAPA 2: GERAÇÃO DE HASH ──────────────────────────────────────────────
    titulo(2, 'GERAÇÃO DE HASH SHA-256 (INTEGRIDADE)');

    // Simula o conteúdo de um arquivo de evidência digital
    const fileContent = 'Laudo Pericial Nº 042/2026 — Evidência coletada em 2026-05-02.\n'
                      + 'Dispositivo: smartphone modelo X, IMEI 35-209900-176148-1.\n'
                      + 'Conteúdo integro e autenticado pelo perito João da Silva.';

    const fileHash = sha256(fileContent);

    console.log('\n  Conteúdo do arquivo (simulado):');
    fileContent.split('\n').forEach(l => console.log(`    "${l}"`));
    console.log();
    ok('SHA-256 calculado', fileHash);
    console.log('\n  Propriedades do hash SHA-256:');
    console.log('    · Determinístico   — mesmo input sempre gera o mesmo hash');
    console.log('    · One-way          — impossível recuperar o original a partir do hash');
    console.log('    · Efeito avalanche — 1 bit diferente → hash completamente diferente');
    console.log('    · Tamanho fixo     — sempre 256 bits / 64 caracteres hex');

    // ── ETAPA 3: REGISTRO NA BLOCKCHAIN ──────────────────────────────────────
    titulo(3, 'REGISTRO NA BLOCKCHAIN (ASSINATURA DIGITAL + IMUTABILIDADE)');

    const description = 'Laudo Pericial 042/2026 — Smartphone coletado em flagrante';

    console.log('\n  Enviando transação para o contrato...');

    // registerEvidence assina a transação com a chave privada do signer
    // msg.sender no contrato = endereço derivado da chave pública do assinante
    // → isso garante AUTORIA (apenas quem tem a chave privada pode assinar) e NÃO-REPÚDIO
    const tx      = await registry.registerEvidence(fileHash, description);

    process.stdout.write('  Aguardando mineração do bloco');
    const receipt = await tx.wait();
    console.log(' OK\n');

    ok('Hash da transação', tx.hash);
    ok('Bloco minerado', receipt.blockNumber.toString());
    ok('Gas consumido', receipt.gasUsed.toString() + ' unidades');
    ok('Status', receipt.status === 1 ? 'SUCESSO' : 'FALHA');

    console.log('\n  Sobre imutabilidade:');
    console.log('    · A evidência está gravada no bloco ' + receipt.blockNumber);
    console.log('    · Para alterar esse bloco, um atacante precisaria refazer TODOS');
    console.log('      os blocos seguintes E ter mais de 50% do poder de mineração da rede');
    console.log('    · No Ganache (demo local) isso é trivial, mas em redes públicas é');
    console.log('      computacionalmente inviável (custo > benefício)');

    // ── ETAPA 4: CONSULTA E VERIFICAÇÃO ──────────────────────────────────────
    titulo(4, 'CONSULTA E VERIFICAÇÃO DA EVIDÊNCIA');

    // getEvidence é uma chamada de leitura (view) — não custa gas, não cria transação
    const [storedHash, storedDesc, registrant, timestamp] = await registry.getEvidence(fileHash);
    const registeredAt = new Date(Number(timestamp) * 1000).toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
    });

    console.log();
    ok('Hash armazenado (blockchain)', storedHash.slice(0, 16) + '…');
    ok('Hash recalculado (arquivo)',   fileHash.slice(0, 16) + '…');
    ok('Hashes idênticos?', storedHash === fileHash ? 'SIM ✔ — arquivo íntegro' : 'NÃO ✘ — adulterado!');
    ok('Registrante (assinatura)',     registrant);
    ok('Timestamp registrado',         registeredAt);
    info('Descrição', storedDesc);

    console.log('\n  Verificação completa:');
    console.log('    · O hash armazenado on-chain bate com o hash recalculado do arquivo');
    console.log('    · O endereço do registrante prova quem assinou — não-repúdio');
    console.log('    · O timestamp prova QUANDO foi registrado — cadeia de custódia');

    // ── ETAPA 5: TENTATIVA DE ADULTERAÇÃO ────────────────────────────────────
    titulo(5, 'TENTATIVA DE ADULTERAÇÃO — DETECTANDO VIOLAÇÃO DE INTEGRIDADE');

    // Simula um atacante que tenta trocar o conteúdo do arquivo
    const tamperedContent = 'Laudo Pericial Nº 042/2026 — Evidência coletada em 2026-05-02.\n'
                          + 'Dispositivo: smartphone modelo X, IMEI 35-209900-176148-1.\n'
                          + 'Conteúdo ALTERADO pelo acusado para encobrir o crime.';   // ← diferença

    const tamperedHash = sha256(tamperedContent);

    console.log('\n  Arquivo ORIGINAL (última linha):');
    console.log('    "…autenticado pelo perito João da Silva."');
    console.log('\n  Arquivo ADULTERADO (última linha):');
    console.log('    "…ALTERADO pelo acusado para encobrir o crime."');

    console.log();
    ok('Hash original',     fileHash);
    ok('Hash adulterado',   tamperedHash);
    ok('Hashes iguais?',    fileHash === tamperedHash ? 'SIM' : 'NÃO — efeito avalanche!');

    // Consulta na blockchain: o hash adulterado jamais foi registrado
    const adulteradoExiste = await registry.evidenceExists(tamperedHash);
    ok('Hash adulterado na blockchain?', adulteradoExiste
        ? 'SIM (inesperado!)'
        : 'NÃO ✔ — adulteração detectada!');

    console.log('\n  Conclusão da etapa:');
    console.log('    · A mínima alteração no arquivo gerou um hash completamente diferente');
    console.log('    · O hash adulterado não existe na blockchain — adulteração detectada');
    console.log('    · O atacante não pode "atualizar" o registro original — imutabilidade');
    console.log('    · Para enganar o sistema, o atacante precisaria alterar a blockchain');
    console.log('      inteira — computacionalmente inviável em redes reais');

    // ── RESUMO FINAL ──────────────────────────────────────────────────────────
    console.log('\n' + sep('═'));
    console.log('  RESUMO DOS CONCEITOS DEMONSTRADOS');
    console.log(sep('═'));
    console.log('  HASH SHA-256       → Impressão digital única do arquivo (Etapa 2)');
    console.log('  INTEGRIDADE        → Hash on-chain ≠ hash do arquivo adulterado (Etapa 5)');
    console.log('  ASSINATURA DIGITAL → msg.sender assinou com chave privada (Etapa 3)');
    console.log('  NÃO-REPÚDIO        → Endereço do registrante gravado permanentemente (Etapa 4)');
    console.log('  IMUTABILIDADE      → Dados na blockchain não podem ser alterados (Etapa 3)');
    console.log('  CADEIA DE CUSTÓDIA → Timestamp + hash + assinante provam origem (Etapa 4)');
    console.log(sep('═') + '\n');
}

main().catch(err => {
    console.error('\nErro fatal na demonstração:', err.message);
    process.exit(1);
});
