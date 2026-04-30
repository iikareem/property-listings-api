FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app

COPY --from=builder /app/ ./

EXPOSE 3000

CMD ["sh", "-c", "node_modules/.bin/ts-node --transpile-only -r tsconfig-paths/register node_modules/typeorm/cli.js migration:run -d data-source.ts && node_modules/.bin/ts-node --transpile-only -r tsconfig-paths/register seeds/seeder.ts && node dist/main"]
