# Plano Detalhado: Transformação do Chatbot em Cliente MCP

**Objetivo:** Integrar o backend do chatbot (Node.js/Express) com o servidor MCP EVA via STDIO, utilizando as ferramentas `identificar_planta_texto` e `identificar_planta_imagem` do EVA para substituir as chamadas diretas às APIs Gemini e Perenual.

**Local da Implementação:** Backend (`server/` directory).

---

### Fase 1: Configuração do Ambiente e Dependências

1.  **Instalar SDK do Cliente MCP:** Adicionar o pacote `@modelcontextprotocol/sdk` (ou o SDK Node.js apropriado para MCP) às dependências do projeto no `package.json` do backend.
    - Executar `npm install` ou `yarn install` no diretório raiz do projeto (ou onde o `package.json` do backend estiver).
2.  **Configurar Lançamento do Servidor EVA:** Definir como o processo do servidor MCP EVA será iniciado e gerenciado pelo backend do chatbot.
    - **Opção A (Recomendada para Desenvolvimento):** Configurar o backend para iniciar o servidor EVA como um subprocesso filho usando `child_process` do Node.js. A comunicação ocorrerá via `stdin`/`stdout` do subprocesso.
    - **Opção B (Para Produção/Flexibilidade):** Assumir que o servidor EVA já está rodando externamente e conectar-se a ele via STDIO (menos comum para STDIO, geralmente usado para SSE, mas tecnicamente possível se o processo EVA for gerenciado separadamente). _Esta opção exigiria um mecanismo externo para garantir que o servidor EVA esteja sempre em execução._
    - Adicionar variáveis de ambiente (se necessário) para configurar o caminho do executável do servidor EVA ou outros parâmetros de inicialização.

---

### Fase 2: Implementação do Cliente MCP no Backend

1.  **Criar Módulo Cliente MCP (`mcpClient.ts`):**
    - Criar um novo arquivo `server/mcpClient.ts`.
    - Implementar uma classe ou conjunto de funções para gerenciar a conexão com o servidor MCP EVA.
    - Utilizar o SDK MCP para:
      - Iniciar o subprocesso do servidor EVA (se Opção A da Fase 1 foi escolhida).
      - Estabelecer a conexão via `StdioClientTransport`.
      - Realizar o handshake `initialize` com o servidor EVA.
      - Implementar funções wrapper para chamar as ferramentas `identificar_planta_texto` e `identificar_planta_imagem`, tratando o envio dos parâmetros e o recebimento dos resultados/erros.
      - Gerenciar o ciclo de vida da conexão (reiniciar em caso de falha, etc.).
      - Exportar uma instância única (singleton) ou funções para serem usadas em outras partes do backend.
2.  **Inicializar Cliente MCP:**
    - No `server/index.ts`, importar o módulo `mcpClient.ts`.
    - Chamar a função de inicialização/conexão do cliente MCP após a configuração do Express e antes de iniciar o servidor HTTP. Garantir que o servidor Express só inicie após a conexão MCP ser estabelecida com sucesso.

---

### Fase 3: Integração com a Lógica Existente

1.  **Modificar `server/storage.ts` (`generateAIResponse`):**
    - Importar o cliente MCP (`mcpClient.ts`).
    - **Remover Lógica Existente:** Excluir as seções de código que chamam diretamente:
      - A API Gemini para identificação de plantas (Step 1).
      - As rotas internas `/api/perenual/search` e `/api/perenual/detail/:id` (Step 2).
      - A API Gemini para geração da resposta final (Step 3), _exceto_ se for decidido manter o Gemini para refinar a `resposta_eva`.
    - **Implementar Chamadas às Ferramentas MCP:**
      - **Se `imageBase64` existir:**
        - Chamar a função wrapper do cliente MCP para `identificar_planta_imagem`.
        - Passar a `imageBase64` e o `prompt` (como `nomeOpcional`).
        - **Tratamento da Imagem:** A forma como `imageBase64` é passada via STDIO precisa ser compatível com o servidor EVA. O cliente MCP pode precisar:
          - Salvar a imagem temporariamente em disco e passar o caminho.
          - Ou, se o SDK/servidor EVA suportar, passar o base64 diretamente ou via um mecanismo de stream binário. _Isso pode exigir consulta à documentação específica do SDK MCP ou do servidor EVA._
      - **Se apenas `prompt` existir:**
        - Chamar a função wrapper do cliente MCP para `identificar_planta_texto`.
        - Passar o `prompt` como `nome`.
    - **Processar Resultado da Ferramenta MCP:**
      - Receber o objeto de resultado da ferramenta MCP EVA (que contém `nome_detectado`, `info_perenual`, `resposta_eva`, etc.).
      - Verificar se houve erro (`result.error`).
      - **Decisão sobre Resposta Final:**
        - **Opção 1 (Simples):** Usar diretamente a `resposta_eva` do resultado da ferramenta como a resposta final a ser retornada.
        - **Opção 2 (Refinada):** Pegar a `resposta_eva` e talvez outras informações (`nome_detectado`, `info_perenual`) e passá-las como contexto adicional para uma chamada final à API Gemini (mantendo a lógica do Step 3, mas com contexto vindo do MCP EVA), para gerar uma resposta mais fluida e alinhada à persona EVA. _Esta opção mantém a capacidade de conversação do Gemini._
    - **Atualizar Histórico:** Adicionar a mensagem do usuário e a resposta final (seja da `resposta_eva` ou do Gemini) ao histórico da conversa, como já é feito.
2.  **Modificar `server/routes.ts` (Opcional):**
    - Se a lógica de tratamento de imagem precisar salvar o arquivo temporariamente, ajustar a rota `/api/chat/generate` para lidar com isso antes de chamar `storage.generateAIResponse`.
    - Considerar se as rotas `/api/perenual/*` ainda são necessárias ou se podem ser removidas/desativadas, já que a busca de detalhes será feita pelo servidor EVA.

---

### Fase 4: Testes e Refinamento

1.  **Testes Unitários:** Testar o módulo `mcpClient.ts` isoladamente (se possível, com um mock do servidor EVA).
2.  **Testes de Integração:**
    - Executar o backend do chatbot junto com o servidor MCP EVA real.
    - Testar os cenários:
      - Identificação por texto.
      - Identificação por imagem (com e sem `nomeOpcional`).
      - Casos de erro (planta não identificada, falha na API Perenual dentro do EVA, falha na conexão MCP).
      - Manutenção do histórico da conversa.
3.  **Refinamento:** Ajustar a lógica de processamento da resposta, tratamento de erros e formatação conforme necessário.

---

### Diagrama de Arquitetura Proposta (Mermaid)

```mermaid
graph LR
    subgraph Chatbot Frontend (Client)
        F[Interface do Usuário]
    end

    subgraph Chatbot Backend (Server - Node.js/Express)
        R[Rotas (routes.ts)] --- S[Storage (storage.ts)]
        S --- MC[Cliente MCP (mcpClient.ts)]
        MC ---|STDIO| EVA[Servidor MCP EVA (Subprocesso)]
        S ---|Opcional| G[API Gemini (Resposta Final)]
    end

    subgraph Servidor MCP EVA
        EVA_T1[Tool: identificar_planta_texto]
        EVA_T2[Tool: identificar_planta_imagem]
        EVA --- EVA_T1
        EVA --- EVA_T2
        EVA_T1 --- G_EVA[API Gemini (Tradução)]
        EVA_T1 --- P_EVA[API Perenual]
        EVA_T2 --- PN_EVA[API PlantNet]
        EVA_T2 --- G_EVA
        EVA_T2 --- P_EVA
    end

    F --> R
```

**Explicação do Diagrama:**

1.  O **Frontend** envia a requisição (texto e/ou imagem) para as **Rotas** do backend.
2.  As **Rotas** chamam o **Storage**.
3.  O **Storage** utiliza o **Cliente MCP** para se comunicar com o **Servidor MCP EVA** via STDIO.
4.  O **Cliente MCP** chama a ferramenta apropriada (`identificar_planta_texto` ou `identificar_planta_imagem`) no **Servidor MCP EVA**.
5.  O **Servidor MCP EVA** executa a ferramenta, interagindo com as APIs externas (PlantNet, Gemini, Perenual).
6.  O **Servidor MCP EVA** retorna o resultado para o **Cliente MCP**.
7.  O **Storage** processa o resultado. Opcionalmente, pode chamar a **API Gemini** uma última vez para refinar a resposta.
8.  O **Storage** retorna a resposta final para as **Rotas**.
9.  As **Rotas** enviam a resposta para o **Frontend**.

---
