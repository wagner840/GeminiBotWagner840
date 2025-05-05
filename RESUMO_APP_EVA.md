# Resumo da Aplicação e Empresa EVA

## Funcionamento da Aplicação

A aplicação é um chatbot full-stack que permite aos usuários interagir por texto e identificar plantas através do envio de imagens. O frontend é construído com React, TypeScript, Vite e Tailwind CSS. O backend utiliza Node.js, TypeScript e Express. Para armazenamento, é usado Drizzle ORM com SQLite.

Inicialmente, o chatbot utilizava diretamente as APIs do Google Gemini para conversação e Perenual para identificação de plantas. No entanto, o plano atual do projeto é integrar o backend com um servidor MCP (Model Context Protocol) chamado EVA. Essa integração visa substituir as chamadas diretas às APIs externas, utilizando ferramentas fornecidas pelo servidor EVA, como `identificar_planta_texto` e `identificar_planta_imagem`. A comunicação com o servidor MCP EVA ocorrerá via STDIO.

O fluxo de interação envolve o usuário inserindo texto ou imagem no frontend, que envia a requisição para o backend. O backend, por sua vez, se comunicará com o servidor MCP EVA para processar a requisição (identificação de planta por texto ou imagem) e obter uma resposta. Essa resposta, possivelmente refinada pelo backend, é então enviada de volta ao frontend para ser exibida ao usuário.

## Finalidade da Aplicação

A finalidade principal da aplicação é fornecer aos usuários uma ferramenta interativa para obter informações sobre plantas. Isso inclui a capacidade de conversar sobre plantas e, crucialmente, identificar espécies de plantas a partir de imagens fornecidas pelo usuário. Ao integrar com o servidor MCP EVA, a aplicação busca centralizar e aprimorar o processo de identificação e obtenção de informações sobre plantas, possivelmente agregando dados de diferentes fontes (como PlantNet e Perenual, conforme indicado no diagrama de arquitetura).

## Resumo sobre a Empresa EVA

Com base nas informações disponíveis nos documentos `README.md` e `PLAN.md`, a "EVA" parece estar associada a um servidor MCP (Model Context Protocol) que fornece ferramentas específicas para a identificação de plantas (`identificar_planta_texto` e `identificar_planta_imagem`). O plano do projeto indica que o chatbot se tornará um cliente deste servidor MCP EVA para realizar suas funcionalidades principais de identificação de plantas. Isso sugere que a EVA é a entidade (empresa, projeto ou serviço) responsável por este servidor MCP especializado em informações e identificação de plantas, atuando como um provedor de contexto e ferramentas para aplicações como este chatbot.
