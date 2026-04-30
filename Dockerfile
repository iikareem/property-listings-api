FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build


FROM node:22-alpine
RUN apk add --no-cache curl

WORKDIR /app

COPY --from=builder /app/ ./

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

CMD ["sh", "./docker-entrypoint.sh"]