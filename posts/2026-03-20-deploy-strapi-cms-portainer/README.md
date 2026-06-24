# How to Deploy Strapi CMS via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Strapi, CMS, Portainer, Docker, Headless CMS, Content Management, Node.js

Description: Deploy Strapi headless CMS with PostgreSQL database via Portainer for a production-ready content management platform with a REST and GraphQL API for your frontend applications.

---

Strapi is the leading open-source headless CMS. It provides a customizable admin panel and auto-generated REST APIs for your content. With the GraphQL plugin installed, it can also expose a GraphQL API. Portainer makes it easy to deploy and manage a Strapi image alongside its database.

## Deploy Strapi Stack

Strapi 5 does not publish an official container image, so create a Strapi project first with `npx create-strapi@latest my-strapi-project` and choose PostgreSQL when the CLI asks which database to use so the `pg` dependency is installed. Then build a production image from that project, push it to a registry Portainer can access, and deploy the stack below.

```dockerfile
# Dockerfile.prod

FROM node:22-alpine AS build
RUN apk update && apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev vips-dev git > /dev/null 2>&1
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
WORKDIR /opt/
COPY package.json package-lock.json ./
RUN npm install -g node-gyp
RUN npm config set fetch-retry-maxtimeout 600000 -g && npm ci --only=production
ENV PATH=/opt/node_modules/.bin:$PATH
WORKDIR /opt/app
COPY . .
RUN npm run build

FROM node:22-alpine
RUN apk add --no-cache vips-dev
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
WORKDIR /opt/app
COPY --from=build /opt/node_modules ./node_modules
COPY --from=build /opt/app ./
ENV PATH=/opt/node_modules/.bin:$PATH

RUN chown -R node:node /opt/app
USER node
EXPOSE 1337
CMD ["npm", "run", "start"]
```

Build and push the image, for example:

```bash
docker build --build-arg NODE_ENV=production -t ghcr.io/your-org/strapi:latest -f Dockerfile.prod .
docker push ghcr.io/your-org/strapi:latest
```

```yaml
# strapi-stack.yml

version: "3.8"
services:
  strapi:
    image: ${STRAPI_IMAGE}
    environment:
      DATABASE_CLIENT: postgres
      DATABASE_HOST: postgres
      DATABASE_PORT: 5432
      DATABASE_NAME: strapi
      DATABASE_USERNAME: strapi
      DATABASE_PASSWORD: ${DATABASE_PASSWORD}
      DATABASE_POOL_MIN: 0
      JWT_SECRET: ${JWT_SECRET}
      APP_KEYS: ${APP_KEYS}
      API_TOKEN_SALT: ${API_TOKEN_SALT}
      ADMIN_JWT_SECRET: ${ADMIN_JWT_SECRET}
      TRANSFER_TOKEN_SALT: ${TRANSFER_TOKEN_SALT}
      NODE_ENV: production
    volumes:
      - strapi-uploads:/opt/app/public/uploads
    ports:
      - "1337:1337"
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - strapi-net

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: strapi
      POSTGRES_USER: strapi
      POSTGRES_PASSWORD: ${DATABASE_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U strapi -d strapi"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - strapi-net

volumes:
  strapi-uploads:
  postgres-data:

networks:
  strapi-net:
    driver: bridge
```

## Environment Variables in Portainer

Set these in Portainer's stack environment variables for security:

```text
STRAPI_IMAGE=ghcr.io/your-org/strapi:latest
DATABASE_PASSWORD=<strong-password>
DATABASE_POOL_MIN=0
JWT_SECRET=<32-character-random-string>
APP_KEYS=<key1>,<key2>,<key3>,<key4>
API_TOKEN_SALT=<random-salt>
ADMIN_JWT_SECRET=<admin-jwt-secret>
TRANSFER_TOKEN_SALT=<random-salt>
```

Generate secrets with:

```bash
openssl rand -base64 32   # For JWT_SECRET and ADMIN_JWT_SECRET
openssl rand -base64 16   # For API_TOKEN_SALT and TRANSFER_TOKEN_SALT
```

## Accessing the Admin Panel

After deployment, navigate to `http://host:1337/admin` to:

1. Create your first admin user
2. Add content and manage media uploads for the content types already defined in your project
3. Configure API tokens for frontend access

In production mode, the Content-Type Builder is disabled. Define content types before building the image, or update them in code and redeploy.

## Using the Strapi API

Strapi auto-generates REST APIs for your content. If you install `@strapi/plugin-graphql`, Strapi also exposes a GraphQL API at `/graphql`:

```javascript
// Fetch blog posts from your Strapi API
const posts = await fetch(
  "http://strapi-host:1337/api/blog-posts?populate=*",
  {
    headers: {
      Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}`
    }
  }
).then(r => r.json());
```

## Nginx Reverse Proxy

Put Strapi behind Nginx for production:

```yaml
  nginx:
    image: nginx:stable-alpine
    volumes:
      - /opt/nginx/strapi.conf:/etc/nginx/conf.d/default.conf:ro
    ports:
      - "443:443"
    depends_on:
      - strapi
```

```nginx
server {
    listen 443 ssl http2;
    server_name cms.example.com;

    ssl_certificate /etc/letsencrypt/live/cms.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cms.example.com/privkey.pem;
    client_max_body_size 100m;

    location / {
        proxy_pass http://strapi:1337;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://strapi:1337/uploads/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Backup Strapi Data

Back up both the database and the uploads volume:

```bash
# Backup PostgreSQL
POSTGRES_CONTAINER=$(docker ps -q --filter label=com.docker.compose.service=postgres | head -n 1)
docker exec "$POSTGRES_CONTAINER" pg_dump -U strapi strapi > strapi-backup-$(date +%Y%m%d).sql

# Backup uploads volume
docker run --rm \
  -v strapi-uploads:/uploads:ro \
  -v /opt/backups:/backups \
  alpine tar czf "/backups/strapi-uploads-$(date +%Y%m%d).tar.gz" -C / uploads
```

## Summary

Strapi deployed via Portainer provides a production-ready headless CMS with auto-generated REST APIs and optional GraphQL support through the GraphQL plugin. The Portainer stack makes it easy to manage a custom Strapi image alongside its PostgreSQL database, and environment variables keep secrets out of your compose file.
