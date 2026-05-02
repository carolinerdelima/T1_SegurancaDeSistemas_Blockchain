// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * EvidenceRegistry — Registro imutável de evidências em cadeia de custódia.
 *
 * Conceitos de segurança demonstrados:
 *   - HASH (SHA-256): o fileHash é a "impressão digital" do arquivo original.
 *     Qualquer alteração no arquivo muda completamente o hash (efeito avalanche).
 *   - INTEGRIDADE: comparando o hash armazenado com o hash recalculado do arquivo,
 *     provamos que o conteúdo não foi adulterado desde o registro.
 *   - ASSINATURA DIGITAL: msg.sender é o endereço Ethereum de quem assinou a transação
 *     com sua chave privada — garante autoria e não-repúdio.
 *   - IMUTABILIDADE: dados gravados na blockchain não podem ser alterados ou deletados.
 */
contract EvidenceRegistry {

    struct Evidence {
        string  fileHash;    // SHA-256 do arquivo — identificador de integridade
        string  description; // Descrição da evidência
        address registrant;  // Endereço Ethereum — equivale à assinatura digital
        uint256 timestamp;   // Momento do registro na cadeia (em segundos Unix)
    }

    // Mapeamento hash → evidência; separamos a flag exists para consulta barata
    mapping(string => Evidence) private evidences;
    mapping(string => bool)     private registered;

    // Evento emitido a cada registro — serve como log auditável e imutável on-chain
    event EvidenceRegistered(
        string  indexed fileHash,
        address indexed registrant,
        uint256         timestamp
    );

    // Registra evidência; reverte se o hash já existir (evita sobrescrever registros)
    function registerEvidence(string calldata fileHash, string calldata description) external {
        require(!registered[fileHash], "Evidencia ja registrada nesta blockchain");
        evidences[fileHash] = Evidence(fileHash, description, msg.sender, block.timestamp);
        registered[fileHash] = true;
        emit EvidenceRegistered(fileHash, msg.sender, block.timestamp);
    }

    // Consulta evidência pelo hash; reverte se não existir
    function getEvidence(string calldata fileHash)
        external view
        returns (string memory, string memory, address, uint256)
    {
        require(registered[fileHash], "Evidencia nao encontrada");
        Evidence memory e = evidences[fileHash];
        return (e.fileHash, e.description, e.registrant, e.timestamp);
    }

    // Verificação rápida de existência (sem revert) — usada para testar adulteração
    function evidenceExists(string calldata fileHash) external view returns (bool) {
        return registered[fileHash];
    }
}
