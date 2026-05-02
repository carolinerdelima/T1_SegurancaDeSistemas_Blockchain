/**
 * deploy.js — Compila e faz o deploy do contrato EvidenceRegistry no Ganache local.
 *
 * Fluxo:
 *   1. Conecta ao nó Ethereum local (Ganache) via JSON-RPC
 *   2. Lê o source Solidity e compila em memória com o pacote `solc`
 *   3. Faz o deploy usando ethers.js v6
 *   4. Salva endereço + ABI em deployment.json para o demo.js ler
 */

const { ethers } = require('ethers');
const solc       = require('solc');
const fs         = require('fs');
const path       = require('path');

// ── Compilação ────────────────────────────────────────────────────────────────

function compileContract() {
    const sourcePath = path.join(__dirname, '..', 'contracts', 'EvidenceRegistry.sol');
    const source     = fs.readFileSync(sourcePath, 'utf8');

    // Formato de entrada padrão do compilador Solidity (Standard JSON Input)
    const input = {
        language: 'Solidity',
        sources:  { 'EvidenceRegistry.sol': { content: source } },
        settings: { outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } } },
    };

    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    // Exibe avisos e aborta em caso de erros de compilação
    if (output.errors) {
        output.errors.forEach(e => {
            const printer = e.severity === 'error' ? console.error : console.warn;
            printer(`[solc ${e.severity}] ${e.formattedMessage}`);
        });
        if (output.errors.some(e => e.severity === 'error')) {
            process.exit(1);
        }
    }

    const compiled = output.contracts['EvidenceRegistry.sol']['EvidenceRegistry'];
    return {
        abi:      compiled.abi,
        bytecode: '0x' + compiled.evm.bytecode.object,
    };
}

// ── Deploy ────────────────────────────────────────────────────────────────────

async function main() {
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║         DEPLOY — EvidenceRegistry        ║');
    console.log('╚══════════════════════════════════════════╝\n');

    // Conecta ao Ganache (nó local Ethereum)
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');

    // Verifica conectividade antes de prosseguir
    try {
        await provider.getBlockNumber();
    } catch {
        console.error('ERRO: Não foi possível conectar ao Ganache em http://127.0.0.1:8545');
        console.error('Execute: npx ganache --deterministic');
        process.exit(1);
    }

    // Usa a primeira conta do Ganache como deployer
    // Em ethers v6, getSigner(index) obtém o assinante pelo índice da lista eth_accounts
    const signer      = await provider.getSigner(0);
    const deployerAddr = await signer.getAddress();
    const balance      = ethers.formatEther(await provider.getBalance(deployerAddr));

    console.log(`Deployer : ${deployerAddr}`);
    console.log(`Saldo    : ${balance} ETH`);
    console.log('Compilando contrato...');

    const { abi, bytecode } = compileContract();
    console.log('Compilado com sucesso.');

    // ContractFactory recebe ABI + bytecode e assina o deploy com o signer
    // A transação de deploy é uma transação Ethereum normal — assinada pela chave privada do signer
    const factory  = new ethers.ContractFactory(abi, bytecode, signer);
    const contract = await factory.deploy();

    process.stdout.write('Aguardando confirmação do bloco...');
    const receipt = await contract.waitForDeployment();
    console.log(' OK');

    const contractAddress = await contract.getAddress();
    console.log(`\nContrato deployado em: ${contractAddress}`);
    console.log(`Bloco              : ${receipt.deploymentTransaction().blockNumber ?? '(pendente)'}`);

    // Persiste endereço e ABI para que o demo.js possa carregar o contrato sem recompilar
    const deploymentInfo = { address: contractAddress, abi };
    fs.writeFileSync(
        path.join(__dirname, '..', 'deployment.json'),
        JSON.stringify(deploymentInfo, null, 2),
    );

    console.log('\nInformações salvas em deployment.json');
    console.log('Agora execute: node scripts/demo.js\n');
}

main().catch(err => {
    console.error('\nErro fatal no deploy:', err.message);
    process.exit(1);
});
