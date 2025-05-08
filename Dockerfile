# Dockerfile para a aplicação Node.js Express (Backend)

# 1. Estágio de Dependências/Build
FROM node:20-alpine AS deps

WORKDIR /app

# Copie o package.json e o lock file (se existir, como package-lock.json ou pnpm-lock.yaml)
COPY package.json package-lock.json* pnpm-lock.yaml* ./

# Instale as dependências
# Se estiver usando pnpm, primeiro instale pnpm globalmente
# RUN npm install -g pnpm
# RUN pnpm install --frozen-lockfile
# Se estiver usando npm
RUN npm ci

# 2. Estágio de Produção
FROM node:20-alpine

WORKDIR /app

# Copie as dependências instaladas do estágio anterior
COPY --from=deps /app/node_modules ./node_modules

# Copie o código da aplicação
COPY . .

# Exponha a porta que a aplicação vai rodar (geralmente 3001 ou outra definida no .env)
# A variável PORT será fornecida pelo Railway ou definida no .env
EXPOSE ${PORT:-3001}

# Comando para iniciar a aplicação
CMD ["npm", "start"]
