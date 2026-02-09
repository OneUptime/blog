# How to Deploy Kong Gateway on Kubernetes with Database and DB-less Modes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kong, API Gateway, Kubernetes

Description: Learn how to deploy Kong Gateway on Kubernetes in both database-backed and DB-less modes, understanding the tradeoffs and choosing the right architecture for your API management needs.

---

Kong Gateway offers two distinct deployment models: traditional database-backed mode and declarative DB-less mode. Each approach has specific strengths and limitations that impact scalability, operations, and use cases. Understanding these differences helps you choose the right architecture for your Kubernetes environment.

## Database Mode vs DB-less Mode

**Database mode** stores all configuration in PostgreSQL or Cassandra. Kong nodes read configuration from the database and cache it in memory. When you update routes or plugins via the Admin API, changes are written to the database and propagated to all nodes.

Advantages:
- Dynamic configuration via Admin API and UI
- Supports large configurations (thousands of routes)
- Full plugin ecosystem compatibility
- Central source of truth across clusters

Disadvantages:
- Database becomes a dependency and potential bottleneck
- Additional operational complexity (backups, high availability)
- Slower startup times as configuration loads from database

**DB-less mode** loads configuration from YAML files. Kong nodes run without any database connection. All configuration is declarative and version-controlled. Updates require reloading the configuration file across all nodes.

Advantages:
- Simpler deployment with fewer dependencies
- Faster startup and lower latency
- GitOps-friendly declarative configuration
- Better for containerized environments

Disadvantages:
- No Admin API for runtime changes
- Configuration size limited by memory
- Some plugins unavailable (rate-limiting with clustering)
- Manual coordination for updates

## Deploying Kong with PostgreSQL (Database Mode)

First, deploy PostgreSQL for Kong's backend:

```yaml
# postgres-kong.yaml
apiVersion: v1
kind: Secret
metadata:
  name: postgres-kong-secret
  namespace: kong
stringData:
  password: kongpassword
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-kong-pvc
  namespace: kong
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-kong
  namespace: kong
spec:
  serviceName: postgres-kong
  replicas: 1
  selector:
    matchLabels:
      app: postgres-kong
  template:
    metadata:
      labels:
        app: postgres-kong
    spec:
      containers:
      - name: postgres
        image: postgres:15
        ports:
        - containerPort: 5432
          name: postgres
        env:
        - name: POSTGRES_DB
          value: kong
        - name: POSTGRES_USER
          value: kong
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-kong-secret
              key: password
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-kong-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-kong
  namespace: kong
spec:
  selector:
    app: postgres-kong
  ports:
  - port: 5432
    targetPort: 5432
  type: ClusterIP
```

Initialize the Kong database schema:

```yaml
# kong-migrations.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: kong-migrations
  namespace: kong
spec:
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: kong-migrations
        image: kong:3.5
        command: ["kong", "migrations", "bootstrap"]
        env:
        - name: KONG_DATABASE
          value: postgres
        - name: KONG_PG_HOST
          value: postgres-kong
        - name: KONG_PG_PORT
          value: "5432"
        - name: KONG_PG_USER
          value: kong
        - name: KONG_PG_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-kong-secret
              key: password
        - name: KONG_PG_DATABASE
          value: kong
```

Deploy Kong Gateway with database backend:

```yaml
# kong-deployment.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kong-config
  namespace: kong
data:
  KONG_DATABASE: postgres
  KONG_PG_HOST: postgres-kong
  KONG_PG_PORT: "5432"
  KONG_PG_USER: kong
  KONG_PG_DATABASE: kong
  KONG_PROXY_ACCESS_LOG: /dev/stdout
  KONG_ADMIN_ACCESS_LOG: /dev/stdout
  KONG_PROXY_ERROR_LOG: /dev/stderr
  KONG_ADMIN_ERROR_LOG: /dev/stderr
  KONG_ADMIN_LISTEN: "0.0.0.0:8001"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kong-gateway
  namespace: kong
spec:
  replicas: 3
  selector:
    matchLabels:
      app: kong-gateway
  template:
    metadata:
      labels:
        app: kong-gateway
    spec:
      containers:
      - name: kong
        image: kong:3.5
        ports:
        - containerPort: 8000
          name: proxy
        - containerPort: 8443
          name: proxy-ssl
        - containerPort: 8001
          name: admin
        - containerPort: 8444
          name: admin-ssl
        env:
        - name: KONG_PG_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-kong-secret
              key: password
        envFrom:
        - configMapRef:
            name: kong-config
        livenessProbe:
          httpGet:
            path: /status
            port: 8001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /status
            port: 8001
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: kong-proxy
  namespace: kong
spec:
  selector:
    app: kong-gateway
  ports:
  - port: 80
    targetPort: 8000
    name: http
  - port: 443
    targetPort: 8443
    name: https
  type: LoadBalancer
---
apiVersion: v1
kind: Service
metadata:
  name: kong-admin
  namespace: kong
spec:
  selector:
    app: kong-gateway
  ports:
  - port: 8001
    targetPort: 8001
    name: admin
  type: ClusterIP
```

Deploy in order:

```bash
kubectl create namespace kong
kubectl apply -f postgres-kong.yaml
kubectl wait --for=condition=ready pod -l app=postgres-kong -n kong --timeout=300s
kubectl apply -f kong-migrations.yaml
kubectl wait --for=condition=complete job/kong-migrations -n kong --timeout=300s
kubectl apply -f kong-deployment.yaml
```

## Deploying Kong in DB-less Mode

DB-less mode requires a declarative configuration file. Create the Kong configuration:

```yaml
# kong-dbless-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kong-declarative-config
  namespace: kong
data:
  kong.yml: |
    _format_version: "3.0"
    _transform: true

    services:
    - name: example-service
      url: http://httpbin.org
      routes:
      - name: example-route
        paths:
        - /example
        methods:
        - GET
        - POST

    - name: backend-api
      url: http://backend-service.default.svc.cluster.local:8080
      routes:
      - name: api-route
        paths:
        - /api
      plugins:
      - name: rate-limiting
        config:
          minute: 100
          policy: local
      - name: cors
        config:
          origins:
          - "*"
          methods:
          - GET
          - POST
          - PUT
          - DELETE
          headers:
          - Accept
          - Authorization
          - Content-Type

    plugins:
    - name: prometheus
      config:
        per_consumer: false
```

Deploy Kong in DB-less mode:

```yaml
# kong-dbless-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kong-gateway-dbless
  namespace: kong
spec:
  replicas: 3
  selector:
    matchLabels:
      app: kong-gateway-dbless
  template:
    metadata:
      labels:
        app: kong-gateway-dbless
    spec:
      containers:
      - name: kong
        image: kong:3.5
        ports:
        - containerPort: 8000
          name: proxy
        - containerPort: 8443
          name: proxy-ssl
        env:
        - name: KONG_DATABASE
          value: "off"
        - name: KONG_DECLARATIVE_CONFIG
          value: /config/kong.yml
        - name: KONG_PROXY_ACCESS_LOG
          value: /dev/stdout
        - name: KONG_PROXY_ERROR_LOG
          value: /dev/stderr
        - name: KONG_ADMIN_LISTEN
          value: "off"  # Admin API disabled in DB-less mode
        volumeMounts:
        - name: config
          mountPath: /config
        livenessProbe:
          httpGet:
            path: /status
            port: 8000
            httpHeaders:
            - name: Host
              value: localhost
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /status
            port: 8000
            httpHeaders:
            - name: Host
              value: localhost
          initialDelaySeconds: 10
          periodSeconds: 5
      volumes:
      - name: config
        configMap:
          name: kong-declarative-config
---
apiVersion: v1
kind: Service
metadata:
  name: kong-proxy-dbless
  namespace: kong
spec:
  selector:
    app: kong-gateway-dbless
  ports:
  - port: 80
    targetPort: 8000
    name: http
  - port: 443
    targetPort: 8443
    name: https
  type: LoadBalancer
```

Deploy DB-less Kong:

```bash
kubectl create namespace kong
kubectl apply -f kong-dbless-config.yaml
kubectl apply -f kong-dbless-deployment.yaml
```

## Using Helm for Kong Deployment

The Kong Helm chart supports both modes with simplified configuration.

Database mode with Helm:

```yaml
# kong-values-db.yaml
env:
  database: postgres
  pg_host: postgres-kong
  pg_port: 5432
  pg_user: kong
  pg_password: kongpassword
  pg_database: kong

postgresql:
  enabled: true
  auth:
    username: kong
    password: kongpassword
    database: kong

admin:
  enabled: true
  type: ClusterIP

proxy:
  type: LoadBalancer
```

Install Kong with database:

```bash
helm repo add kong https://charts.konghq.com
helm repo update

helm install kong kong/kong \
  -n kong --create-namespace \
  -f kong-values-db.yaml
```

DB-less mode with Helm:

```yaml
# kong-values-dbless.yaml
env:
  database: "off"
  declarative_config: /kong_dbless/kong.yml

dblessConfig:
  configMap: kong-declarative-config

admin:
  enabled: false

proxy:
  type: LoadBalancer
```

Install DB-less Kong:

```bash
kubectl apply -f kong-dbless-config.yaml
helm install kong kong/kong \
  -n kong --create-namespace \
  -f kong-values-dbless.yaml
```

## Updating Configuration in DB-less Mode

To update routes or plugins in DB-less mode, modify the ConfigMap and trigger a reload:

```bash
# Edit the configuration
kubectl edit configmap kong-declarative-config -n kong

# Trigger rolling restart to load new config
kubectl rollout restart deployment/kong-gateway-dbless -n kong

# Monitor rollout
kubectl rollout status deployment/kong-gateway-dbless -n kong
```

For GitOps workflows, commit configuration changes and let ArgoCD or Flux sync:

```yaml
# argocd-application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: kong-gateway
spec:
  source:
    repoURL: https://github.com/myorg/kong-config
    path: kong/dbless
  destination:
    namespace: kong
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Choosing Between Database and DB-less Modes

Use **database mode** when:
- You need dynamic configuration via UI or API
- Multiple teams independently manage different APIs
- Configuration exceeds 100MB
- You require clustering-aware rate limiting
- Admin visibility and audit logs are critical

Use **DB-less mode** when:
- Configuration is managed via GitOps
- You want minimal infrastructure dependencies
- Fast startup and stateless deployments are priorities
- Configuration is relatively static
- You run in edge or ephemeral environments

## Hybrid Deployments

For enterprise scenarios, consider hybrid deployments:

**Control plane** - Database-backed Kong for centralized management
**Data planes** - DB-less Kong nodes that receive config from control plane

This provides the best of both worlds: centralized control with distributed stateless data planes.

## Testing Kong Gateway

Verify the deployment by creating a test request:

```bash
# Get LoadBalancer IP
KONG_PROXY=$(kubectl get svc kong-proxy -n kong \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Test the route
curl -i http://${KONG_PROXY}/example

# Should proxy to httpbin.org
```

For database mode, test the Admin API:

```bash
# Port-forward to admin API
kubectl port-forward svc/kong-admin -n kong 8001:8001 &

# List services
curl http://localhost:8001/services

# Add a new route
curl -i -X POST http://localhost:8001/services/example-service/routes \
  --data 'name=test-route' \
  --data 'paths[]=/test'
```

## Conclusion

Kong Gateway's flexible deployment models accommodate diverse operational requirements. Database mode provides dynamic configuration and full Admin API capabilities at the cost of additional infrastructure complexity. DB-less mode offers simplicity and stateless operation ideal for containerized environments and GitOps workflows. For production Kubernetes deployments, DB-less mode often provides the best balance of operational simplicity and performance, while database mode suits scenarios requiring frequent dynamic changes or multi-tenant management interfaces. Understanding these tradeoffs enables you to architect API gateway infrastructure that aligns with your team's workflow and operational maturity.
