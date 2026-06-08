FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

FROM alpine:3.19

COPY --from=builder /app/dist /tmp/dist

CMD ["sh", "-c", "mkdir -p /app/dist && cp -r /tmp/dist/* /app/dist/"]