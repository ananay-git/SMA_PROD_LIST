# Stage 1: build public/assets/products.js from data/*.csv
FROM node:22.12-alpine AS build
WORKDIR /app
COPY data ./data
COPY tools ./tools
COPY public ./public
RUN node tools/build-data.js

# Stage 2: serve the static site
FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/public /usr/share/nginx/html
EXPOSE 80
