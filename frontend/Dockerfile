FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json vite.config.ts tsconfig.json ./
COPY src ./src
RUN npm ci && npm run build

FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx","-g","daemon off;"]
