FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npm run build 2>/dev/null || true

EXPOSE 3000

CMD ["node", "server.js"]
