# Cars Character Vault

Catálogo HTML local de personagens, alimentado pela API MediaWiki da Pixar Cars Wiki.

## Abrir

Você pode dar dois cliques diretamente em `index.html`. A base também é gerada como `data.js`, evitando o bloqueio de segurança que os navegadores aplicam à leitura de JSON em páginas `file://`.

Como alternativa, `abrir-site.bat` abre o catálogo em `http://localhost:8765`.

## Atualizar os dados

Clique com o botão direito em `atualizar-dados.ps1`, escolha **Executar com PowerShell** e aguarde. O script:

- consulta categorias reais da wiki;
- segue a paginação da API;
- remove duplicatas;
- obtém resumo, imagem e categorias de cada página;
- grava uma nova versão de `characters.json`.
- gera `sitemap.xml` com o índice de todas as fichas importadas.

O sitemap público padrão do domínio Fandom respondeu com bloqueio HTTP 403 durante a criação deste projeto. Por isso, o atualizador usa o índice de categorias da API MediaWiki como fonte de descoberta e gera um sitemap XML local verificável a partir das páginas realmente importadas.

Para mudar o escopo, edite a lista `$sourceCategories` no começo do script.

## Limites e licença

Este é um projeto local não oficial, sem afiliação com Disney, Pixar ou Fandom. Os dados comunitários vêm da Pixar Cars Wiki, cujo conteúdo textual é disponibilizado sob CC BY-SA. Imagens podem estar sujeitas a licenças próprias. A API pode impor limites, mudar de formato ou ficar temporariamente indisponível. Algumas páginas não oferecem resumo ou imagem pela API.
