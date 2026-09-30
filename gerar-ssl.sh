#!/bin/bash

# Define os diretórios e nomes
DOMAIN="deviceacademy.local"
CERTS_DIR="./certs"

echo "=============================================="
echo "🛡️ Gerando Certificado SSL para o AppHub"
echo "=============================================="

# Cria a pasta certs se ela não existir
mkdir -p "$CERTS_DIR"

# Verifica se o OpenSSL está instalado
if ! command -v openssl &> /dev/null; then
    echo "Erro: OpenSSL não está instalado. Por favor, instale o openssl para gerar o certificado."
    exit 1
fi

# Gera a chave privada e o certificado autoassinado (Válido por 10 anos)
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout "$CERTS_DIR/server.key" \
  -out "$CERTS_DIR/server.crt" \
  -subj "/C=BR/ST=Ceara/L=Fortaleza/O=Apple Developer Academy IFCE/OU=AppHub/CN=$DOMAIN" \
  -addext "subjectAltName=DNS:$DOMAIN,DNS:localhost,IP:127.0.0.1"

echo ""
echo "✅ Sucesso! Certificados gerados na pasta '$CERTS_DIR':"
echo "   - server.key (Chave Privada)"
echo "   - server.crt (Certificado Público)"
echo ""
echo "O Nginx do AppHub utilizará esses arquivos automaticamente para habilitar o HTTPS."
echo "=============================================="
