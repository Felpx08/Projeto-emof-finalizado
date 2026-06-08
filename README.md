# 🏭 FactoryTrack - Sistema de Gerenciamento de Fábrica

Um sistema web completo para gerenciamento de ordens de produção, produtos, clientes e usuários em uma indústria de manufatura.

## 📋 Sobre o Projeto

**FactoryTrack** é um sistema desenvolvido em **Node.js + Express** no backend e **HTML/CSS/JavaScript vanilla** no frontend, com banco de dados **SQLite**. O sistema permite gerenciar:

- 📊 **Dashboard** com resumo de produção
- 📋 **Ordens de Produção** com rastreamento de status
- 🔩 **Catálogo de Produtos** com especificações técnicas
- 🏢 **Gestão de Clientes** com dados de contato
- 🔐 **Controle de Usuários** (Operadores, Líderes, Administradores)
- ⚙️ **Interface de Produção** para líderes de linha

---

## 🚀 Quick Start (5 minutos)

### 1️⃣ Clone o Repositório


### 2️⃣ Instale as Dependências

```bash
npm install
```

### 3️⃣ Crie o Banco de Dados e Usuários

```bash
node seed.js
```

**Usuários padrão criados:**
- **Admin**: `admin@metaltech.com` / `123456`
- **Líder**: `lider@metaltech.com` / `123456`
- **Operador**: `operador@metaltech.com` / `123456`

### 4️⃣ Inicie o Servidor

```bash
npm start
```

Ou em modo desenvolvimento (com auto-reload):

```bash
npm run dev
```

### 5️⃣ Acesse a Aplicação

Abra seu navegador e vá para:

```
http://localhost:3000
```

Login com qualquer um dos usuários criados no passo 3.

---

## 📦 Pré-requisitos

- **Node.js** 14+ ([Download](https://nodejs.org/))
- **npm** ou **yarn**
- Um navegador moderno (Chrome, Firefox, Edge, Safari)

Verificar instalação:

```bash
node --version
npm --version
```

---

## 🛠️ Instalação Completa (Passo a Passo)

### Windows

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/sistema-pizzaria.git
cd sistema-pizzaria

# 2. Instale as dependências
npm install

# 3. Crie o banco de dados e usuários iniciais
node seed.js

# 4. Inicie o servidor
npm start

# 5. Abra no navegador
start http://localhost:3000
```

### macOS / Linux

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/sistema-pizzaria.git
cd sistema-pizzaria

# 2. Instale as dependências
npm install

# 3. Crie o banco de dados e usuários iniciais
node seed.js

# 4. Inicie o servidor
npm start

# 5. Abra no navegador (macOS)
open http://localhost:3000

# ou (Linux)
xdg-open http://localhost:3000
```

---

## 📁 Estrutura do Projeto

```
sistema-pizzaria/
├── public/                      # Frontend - Arquivos estáticos
│   ├── index.html              # Página principal (HTML)
│   ├── script.js               # Lógica JavaScript do frontend
│   └── style.css               # Estilos CSS
│
├── src/
│   ├── database/
│   │   └── sqlite.js           # Conexão e inicialização do banco
│   │
│   ├── models/                 # Modelos de dados
│   │   ├── Usuario.js
│   │   ├── Cliente.js
│   │   ├── Produto.js
│   │   └── Ordem.js
│   │
│   ├── middlewares/
│   │   └── auth.js             # Autenticação e autorização
│   │
│   └── routes/
│       └── index.js            # Definição de todas as rotas
│
├── index.js                    # Arquivo principal (servidor Express)
├── seed.js                     # Script para criar dados iniciais
├── package.json                # Dependências do projeto
├── .env                        # Variáveis de ambiente
└── README.md                   # Este arquivo
```

---

## 🔑 Funcionalidades por Perfil

### 👤 Operador

- ✅ Visualizar Dashboard
- ✅ Visualizar Ordens
- ✅ Visualizar Produtos
- ✅ Visualizar Clientes

### 👨‍💼 Líder de Produção

- ✅ Todas as permissões do Operador
- ✅ Atualizar status de ordens
- ✅ Criar ordens do chão de fábrica
- ✅ Ver painel "Minhas Ordens"

### 🔐 Administrador

- ✅ Todas as permissões do Líder
- ✅ Gerenciar usuários (criar, editar)
- ✅ Gerenciar produtos (criar, editar)
- ✅ Gerenciar clientes (criar, editar)
- ✅ Gerenciar ordens completas

---

## 🌐 Endpoints da API

### Autenticação

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/login` | Fazer login |
| GET | `/logout` | Fazer logout |

### Usuários (Admin)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/usuarios` | Listar usuários |
| POST | `/usuarios` | Criar usuário |
| PUT | `/usuarios/:id` | Atualizar usuário |

### Produtos

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/produtos` | Listar produtos |
| POST | `/produtos` | Criar produto (Admin) |
| PUT | `/produtos/:id` | Atualizar produto (Admin) |

### Clientes

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/clientes` | Listar clientes |
| POST | `/clientes` | Criar cliente (Admin) |
| PUT | `/clientes/:id` | Atualizar cliente (Admin) |

### Ordens

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/ordens` | Listar ordens |
| POST | `/ordens` | Criar ordem |
| PUT | `/ordens/:id` | Atualizar ordem (Admin/Líder) |
| PUT | `/ordens/:id/status` | Atualizar status (Líder/Admin) |

---

## ⚙️ Configuração

### Arquivo `.env`

Crie um arquivo `.env` na raiz do projeto:

```env
# Porta do servidor
PORT=3000

# Banco de dados
DATABASE_PATH=./factorytrack.db

# Sessão
SESSION_SECRET=sua_chave_secreta_aqui_mude_em_producao

# Ambiente
NODE_ENV=development
```

---

## 💾 Banco de Dados

### Tabelas Principais

#### `usuarios`
- `id` - ID do usuário
- `nome` - Nome completo
- `email` - E-mail único
- `senha` - Senha criptografada
- `perfil` - Perfil (Operador, Lider, Administrador)
- `criado_em` - Data de criação

#### `clientes`
- `id` - ID do cliente
- `nome` - Nome da empresa
- `telefone` - Telefone de contato
- `endereco` - Endereço completo
- `criado_em` - Data de criação

#### `produtos`
- `id` - ID do produto
- `nome` - Nome do produto
- `categoria` - Categoria (Usinagem, Solda, etc)
- `especificacoes` - Detalhes técnicos
- `preco` - Preço unitário
- `disponivel` - Disponibilidade
- `criado_em` - Data de criação

#### `ordens`
- `id` - ID da ordem
- `cliente_id` - Cliente vinculado
- `status` - Status (aguardando_producao, em_producao, finalizado, cancelado)
- `data_prazo` - Data de entrega
- `observacoes` - Notas adicionais
- `criado_em` - Data de criação

#### `itens_ordem`
- `id` - ID do item
- `ordem_id` - Ordem vinculada
- `produto_id` - Produto vinculado
- `quantidade` - Quantidade pedida
- `subtotal` - Valor parcial

---

## 🚦 Começando a Usar

### 1. Fazer Login

1. Acesse `http://localhost:3000`
2. Use um dos usuários criados:
   - Email: `admin@metaltech.com`
   - Senha: `senha123`

### 2. Dashboard

Você verá um resumo com:
- Total de ordens
- Faturamento geral
- Quantidade de clientes
- Produtos no catálogo
- Ordens em produção

### 3. Cadastrar um Cliente

1. Clique em **"Clientes"** no menu
2. Clique em **"+ Novo Cliente"**
3. Preencha os dados:
   - Empresa (obrigatório)
   - Telefone (obrigatório)
   - Endereço
4. Clique em **"Salvar"**

### 4. Cadastrar um Produto

1. Clique em **"Produtos"** no menu
2. Clique em **"+ Novo Produto"**
3. Preencha:
   - Nome do produto (obrigatório)
   - Categoria
   - Especificações técnicas (obrigatório)
   - Preço unitário
   - Disponibilidade
4. Clique em **"Salvar"**

### 5. Criar uma Ordem de Produção

1. Clique em **"Ordens"** no menu
2. Clique em **"+ Nova Ordem"**
3. Selecione o **Cliente**
4. Defina o **Prazo de Entrega**
5. Clique em **"+ Produto"** para adicionar itens
6. Selecione produtos e quantidades
7. Escolha a **Forma de Pagamento**
8. Adicione **Observações** se necessário
9. Clique em **"Registrar Ordem"**

### 6. Acompanhar Ordens

1. No menu **"Ordens"** você pode:
   - Ver todas as ordens
   - Filtrar por status
   - Atualizar status (se líder/admin)
   - Ver detalhes de cada ordem

---

## 📊 Exemplos de Uso

### Cenário 1: Operador Consultando Dashboard

```
1. Faz login com credencial de operador
2. Vê resumo de produção
3. Consulta ordens pendentes
4. Verifica catálogo de produtos
5. Faz logout
```

### Cenário 2: Administrador Gerenciando Sistema

```
1. Faz login como admin
2. Cria novo cliente (AutoPeças XYZ Ltda)
3. Adiciona 5 novos produtos ao catálogo
4. Cria uma ordem grande para este cliente
5. Cria novo usuário (Líder de Produção)
6. Acompanha status das ordens
```

### Cenário 3: Líder Gerenciando Produção

```
1. Faz login como líder
2. Vê "Minhas Ordens" (ordens sob sua responsabilidade)
3. Atualiza status para "Em Produção"
4. Acompanha o progresso
5. Marca como "Finalizado" quando concluído
```

---

## 🐛 Solução de Problemas

### Erro: "Cannot find module 'express'"

**Solução:** Instale as dependências

```bash
npm install
```

### Erro: "EADDRINUSE: address already in use :::3000"

**Problema:** Porta 3000 já está em uso

**Soluções:**
- Feche a aplicação anterior
- Ou mude a porta no `.env`:
  ```env
  PORT=3001
  ```

### Erro: "Banco de dados não encontrado"

**Solução:** Execute o seed para criar o banco de dados

```bash
node seed.js
```

### Erro ao fazer login

- Verifique se o banco foi criado: `node seed.js`
- Confirme usuário e senha corretos
- Limpe cookies/cache do navegador e tente novamente

### Aplicação muito lenta

- Feche outras aplicações que usam muitos recursos
- Verifique a conexão de internet
- Reinicie o servidor: `npm start`

---

## 📦 Dependências Principais

```json
{
  "express": "4.x",           // Framework web
  "express-session": "1.x",   // Gerenciamento de sessões
  "sqlite3": "5.x",           // Banco de dados
  "bcryptjs": "2.x"           // Criptografia de senhas
}
```

---

## 🔄 Desenvolvimento Local

### Modo com Auto-Reload

```bash
npm run dev
```

Usa `nodemon` para reiniciar automaticamente ao detectar mudanças.

### Testes (Se implementado)

```bash
npm test
```

---

## 📝 Scripts Disponíveis

```bash
npm start          # Inicia o servidor
npm run dev        # Inicia em modo desenvolvimento com auto-reload
npm run seed       # Executa seed (cria dados iniciais)
```

---

## 🌍 Deployment

### Heroku

```bash
# 1. Instale Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# 2. Faça login
heroku login

# 3. Crie um app
heroku create seu-app-name

# 4. Configure variáveis de ambiente
heroku config:set NODE_ENV=production
heroku config:set SESSION_SECRET=sua_chave_segura

# 5. Faça push
git push heroku main
```

### Servidor VPS (Linux)

```bash
# 1. Faça SSH
ssh usuario@seu-servidor.com

# 2. Clone o repositório
git clone seu-repo-aqui

# 3. Instale dependências
npm install

# 4. Configure variáveis de ambiente
nano .env

# 5. Execute seed
node seed.js

# 6. Use PM2 para manter rodando
npm install -g pm2
pm2 start index.js --name "factorytrack"
pm2 startup
pm2 save
```

---

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo LICENSE para detalhes.

---

## 👨‍💻 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 📞 Suporte

Para dúvidas ou problemas, abra uma **Issue** no repositório GitHub.

---

## 🎯 Roadmap

- [ ] Relatórios e gráficos avançados
- [ ] Exportar ordens em PDF
- [ ] Notificações por email
- [ ] API REST completa
- [ ] Aplicativo mobile
- [ ] Integração com sistemas de pagamento
- [ ] Histórico de auditoria

---

## 🙏 Agradecimentos

Desenvolvido com ❤️ para a **MetalTech Indústria**

---

**Última atualização:** 08 de Junho de 2026

**Versão:** 1.0.0
