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

# Configuração customizada do Nginx para suportar roteamento do React e HTTPS
RUN echo "server { \
    listen 80; \
    listen 443 ssl; \
    ssl_certificate /etc/nginx/certs/server.crt; \
    ssl_certificate_key /etc/nginx/certs/server.key; \
    client_max_body_size 0; \
    location /apphub/api/ { \
        proxy_pass http://apphub-backend:5002/api/; \
    } \
    location /apphub/uploads/ { \
        proxy_pass http://apphub-backend:5002/uploads/; \
    } \
    location = /apphub { \
        return 301 /apphub/; \
    } \
    location /apphub/ { \
        alias /usr/share/nginx/html/; \
        index index.html index.htm; \
        try_files \$uri \$uri/ /apphub/index.html; \
    } \
    }" > /etc/nginx/conf.d/default.conf

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
