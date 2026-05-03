# How to Deploy a MERN Stack via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, MERN Stack, MongoDB, Express, React, Node.js, Docker Compose

Description: Learn how to deploy a MERN stack (MongoDB, Express.js, React, Node.js) via Portainer with a unified Docker Compose stack for development and production.

---

The MERN stack is the most popular JavaScript full-stack combination for modern web applications. Portainer simplifies deploying and managing all services together.

## Compose Stack

```yaml
version: "3.8"

services:
  mongo:
    image: mongo:7
    restart: unless-stopped
    volumes:
      - mongo_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: mongopass    # Change this

  backend:
    image: node:20-alpine
    restart: unless-stopped
    working_dir: /app
    depends_on:
      - mongo
    ports:
      - "5000:5000"
    environment:
      MONGODB_URI: mongodb://root:mongopass@mongo:27017/mernapp?authSource=admin
      PORT: 5000
      NODE_ENV: production
      # JWT secret for authentication
      JWT_SECRET: changeme-very-long-random-string
    volumes:
      - ./backend:/app
    command: sh -c "npm install && node index.js"

  frontend:
    image: node:20-alpine
    restart: unless-stopped
    working_dir: /app
    ports:
      - "3000:3000"
    environment:
      # Point React to the backend API (browser hits the host-exposed port)
      REACT_APP_API_URL: http://localhost:5000/api
    volumes:
      - ./frontend:/app
    command: sh -c "npm install && npm start"

volumes:
  mongo_data:
```

## Production Setup with Nginx

For production, serve the built React app from Nginx:

```yaml
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.frontend
    ports:
      - "80:80"
```

```dockerfile
# frontend/Dockerfile.frontend

FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Build the React app with production environment
RUN REACT_APP_API_URL=/api npm run build

FROM nginx:alpine
# Copy built assets to Nginx
COPY --from=build /app/build /usr/share/nginx/html
# Nginx config for React Router support
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

```nginx
# frontend/nginx.conf
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # Handle React Router - serve index.html for all paths
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls to the backend
    location /api {
        proxy_pass http://backend:5000;
    }
}
```

## Monitoring

Monitor `http://<host>:5000/api/health` with OneUptime. Alert if the backend becomes unreachable, as the React frontend will show connection errors to all users.
