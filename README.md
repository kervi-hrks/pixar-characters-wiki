# Pixar Characters Wiki

Catálogo HTML local de personagens, alimentado pela API MediaWiki da Pixar Cars Wiki.

## Abrir

Você pode dar dois cliques diretamente em `index.html`. A base também é gerada como `data.js`, evitando o bloqueio de segurança que os navegadores aplicam à leitura de JSON em páginas `file://`.

Como alternativa, `abrir-site.bat` abre o catálogo em `http://localhost:8765`.

## Atualização automática

O catálogo consulta a API MediaWiki da Pixar Cars Wiki automaticamente uma vez por dia. A cópia mais recente fica salva no navegador para abrir rápido, inclusive quando a wiki estiver temporariamente indisponível. Não é necessário atualizar arquivos no GitHub para renovar a lista de personagens.

## Limites e licença

Este é um projeto local não oficial, sem afiliação com Disney, Pixar ou Fandom. Os dados comunitários vêm da Pixar Cars Wiki, cujo conteúdo textual é disponibilizado sob CC BY-SA. Imagens podem estar sujeitas a licenças próprias. A API pode impor limites, mudar de formato ou ficar temporariamente indisponível. Algumas páginas não oferecem resumo ou imagem pela API.
