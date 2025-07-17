# Dockerfile
FROM node:20-slim

WORKDIR /app

COPY . .

RUN npm install

EXPOSE 8000

CMD ["node", "server.js"]
