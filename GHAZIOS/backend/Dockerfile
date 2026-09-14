FROM node:18-alpine
RUN addgroup -g 1001 -S ghazios && adduser -S ghazios -u 1001 -G ghazios
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY . .
RUN mkdir -p /app/receipts && chown -R ghazios:ghazios /app
USER ghazios
EXPOSE 4001
CMD ["node", "server.js"]
