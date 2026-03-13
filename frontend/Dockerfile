# Frontend Dockerfile
# Estágio de Build
FROM node:18-alpine as build-stage

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Estágio de Produção
FROM nginx:stable-alpine as production-stage

COPY --from=build-stage /app/dist /usr/share/nginx/html

# Configuração customizada do Nginx para suportar roteamento do React (opcional mas recomendado)
RUN echo "server { \
    listen 5175; \
    location /apphub/ { \
    alias /usr/share/nginx/html/; \
    index index.html index.htm; \
    try_files \$uri \$uri/ /apphub/index.html; \
    } \
    }" > /etc/nginx/conf.d/default.conf

EXPOSE 5175

CMD ["nginx", "-g", "daemon off;"]
