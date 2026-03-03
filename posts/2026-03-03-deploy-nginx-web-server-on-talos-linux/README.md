# How to Deploy Nginx Web Server on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, NGINX, Kubernetes, Web Server, Reverse Proxy, DevOps

Description: Deploy Nginx web server on Talos Linux as a reverse proxy, load balancer, and static file server with production-ready configurations.

---

Nginx is the most popular web server and reverse proxy in the world, powering a large portion of internet traffic. Deploying Nginx on Talos Linux gives you a battle-tested web server running on an immutable, secure operating system. Whether you need Nginx as a reverse proxy, load balancer, static file server, or ingress controller, Talos Linux provides the reliable Kubernetes foundation to run it.

This guide covers multiple Nginx deployment patterns on Talos Linux, from basic web serving to advanced reverse proxy configurations.

## Nginx Use Cases on Talos Linux

On a Talos Linux Kubernetes cluster, Nginx typically serves several roles:

- **Ingress Controller**: Managing external traffic routing to internal services
- **Reverse Proxy**: Forwarding requests to backend applications
- **Static File Server**: Serving static websites, SPAs, or documentation
- **Load Balancer**: Distributing traffic across backend pods

## Prerequisites

- Talos Linux cluster with at least one worker node
- `kubectl` configured
- A basic understanding of Nginx configuration

## Option 1: Nginx as an Ingress Controller

The most common Nginx deployment on Kubernetes is as an ingress controller:

```bash
# Install Nginx Ingress Controller using Helm
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

kubectl create namespace ingress-nginx

helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --set controller.replicaCount=2 \
  --set controller.resources.requests.memory=256Mi \
  --set controller.resources.requests.cpu=100m \
  --set controller.service.type=LoadBalancer
```

Configure Talos Linux with MetalLB or similar for LoadBalancer services if you are on bare metal:

```yaml
# ingress-resource.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  namespace: default
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - app.yourdomain.com
      secretName: app-tls
  rules:
    - host: app.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app
                port:
                  number: 80
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 8080
```

## Option 2: Nginx as a Static File Server

Deploy Nginx to serve static websites:

```yaml
# nginx-static-site.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: web
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-config
  namespace: web
data:
  nginx.conf: |
    worker_processes auto;
    error_log /var/log/nginx/error.log warn;
    pid /tmp/nginx.pid;

    events {
        worker_connections 1024;
        multi_accept on;
    }

    http {
        include /etc/nginx/mime.types;
        default_type application/octet-stream;

        # Logging format
        log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                        '$status $body_bytes_sent "$http_referer" '
                        '"$http_user_agent"';
        access_log /var/log/nginx/access.log main;

        # Performance settings
        sendfile on;
        tcp_nopush on;
        tcp_nodelay on;
        keepalive_timeout 65;
        types_hash_max_size 2048;

        # Gzip compression
        gzip on;
        gzip_vary on;
        gzip_proxied any;
        gzip_comp_level 6;
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        server {
            listen 8080;
            server_name _;
            root /usr/share/nginx/html;
            index index.html;

            # SPA routing - serve index.html for all routes
            location / {
                try_files $uri $uri/ /index.html;
            }

            # Cache static assets
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
            }

            # Health check endpoint
            location /healthz {
                access_log off;
                return 200 "ok";
            }
        }
    }
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: website-content
  namespace: web
data:
  index.html: |
    <!DOCTYPE html>
    <html>
    <head><title>Running on Talos Linux</title></head>
    <body>
      <h1>Welcome</h1>
      <p>This site is served by Nginx on Talos Linux.</p>
    </body>
    </html>
```

```yaml
# nginx-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-web
  namespace: web
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx-web
  template:
    metadata:
      labels:
        app: nginx-web
    spec:
      containers:
        - name: nginx
          image: nginx:1.25-alpine
          ports:
            - containerPort: 8080
          volumeMounts:
            - name: nginx-config
              mountPath: /etc/nginx/nginx.conf
              subPath: nginx.conf
            - name: website-content
              mountPath: /usr/share/nginx/html
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "128Mi"
              cpu: "200m"
          readinessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 10
          # Run as non-root
          securityContext:
            runAsNonRoot: true
            runAsUser: 101
            allowPrivilegeEscalation: false
      volumes:
        - name: nginx-config
          configMap:
            name: nginx-config
        - name: website-content
          configMap:
            name: website-content
---
apiVersion: v1
kind: Service
metadata:
  name: nginx-web
  namespace: web
spec:
  selector:
    app: nginx-web
  ports:
    - port: 80
      targetPort: 8080
  type: ClusterIP
```

```bash
kubectl apply -f nginx-static-site.yaml
kubectl apply -f nginx-deployment.yaml
```

## Option 3: Nginx as a Reverse Proxy

```yaml
# nginx-reverse-proxy.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-proxy-config
  namespace: web
data:
  nginx.conf: |
    worker_processes auto;
    pid /tmp/nginx.pid;

    events {
        worker_connections 4096;
    }

    http {
        # Upstream backends
        upstream api_backend {
            least_conn;
            server api-service.default.svc.cluster.local:8080;
            keepalive 32;
        }

        upstream auth_backend {
            server auth-service.default.svc.cluster.local:8081;
            keepalive 16;
        }

        # Rate limiting zone
        limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;

        server {
            listen 8080;
            server_name _;

            # API proxy
            location /api/ {
                limit_req zone=api_limit burst=50 nodelay;
                proxy_pass http://api_backend/;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;

                # Timeouts
                proxy_connect_timeout 10s;
                proxy_send_timeout 30s;
                proxy_read_timeout 30s;

                # Buffering
                proxy_buffering on;
                proxy_buffer_size 4k;
                proxy_buffers 8 4k;
            }

            # Auth proxy
            location /auth/ {
                proxy_pass http://auth_backend/;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
            }

            # WebSocket proxy
            location /ws/ {
                proxy_pass http://api_backend/ws/;
                proxy_http_version 1.1;
                proxy_set_header Upgrade $http_upgrade;
                proxy_set_header Connection "upgrade";
                proxy_read_timeout 86400;
            }

            # Health check
            location /healthz {
                access_log off;
                return 200;
            }

            # Metrics for Prometheus
            location /nginx_status {
                stub_status on;
                access_log off;
                allow 10.0.0.0/8;
                deny all;
            }
        }
    }
```

## Horizontal Pod Autoscaling

Scale Nginx pods based on CPU usage:

```yaml
# nginx-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: nginx-web-hpa
  namespace: web
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nginx-web
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

## Monitoring Nginx

Deploy the Nginx Prometheus exporter:

```yaml
# nginx-exporter.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-exporter
  namespace: web
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx-exporter
  template:
    metadata:
      labels:
        app: nginx-exporter
    spec:
      containers:
        - name: exporter
          image: nginx/nginx-prometheus-exporter:latest
          args:
            - -nginx.scrape-uri=http://nginx-web:80/nginx_status
          ports:
            - containerPort: 9113
```

Key metrics to monitor include active connections, request rate per second, response status code distribution, upstream response time, and error rates.

## Security Hardening

For production Nginx on Talos Linux:

- Always run Nginx as a non-root user
- Use read-only filesystem where possible
- Enable security headers (CSP, HSTS, X-Frame-Options)
- Configure rate limiting to prevent abuse
- Use TLS for all external-facing listeners
- Keep the Nginx image updated for security patches

## Conclusion

Nginx on Talos Linux is a versatile combination for web serving, reverse proxying, and traffic management. Whether you deploy it as an ingress controller for cluster-wide traffic routing, a static file server for web applications, or a reverse proxy for backend services, the immutable nature of Talos Linux ensures your Nginx infrastructure runs on a consistent, secure foundation. Start with the ingress controller for most use cases, and deploy standalone Nginx pods when you need custom configurations that go beyond what ingress annotations support.
