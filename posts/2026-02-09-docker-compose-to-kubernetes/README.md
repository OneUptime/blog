# How to Convert Docker Compose Multi-Service Applications to Kubernetes Manifests Step by Step

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Docker Compose, Migration

Description: Learn how to systematically convert Docker Compose multi-service applications to Kubernetes manifests with proper service discovery, volume management, and network configuration.

---

Docker Compose provides a simple way to define multi-container applications, but Kubernetes offers better scalability and production features. Converting between them requires translating Compose concepts to Kubernetes equivalents while preserving application behavior. This guide shows you how to migrate multi-service Compose applications to Kubernetes step by step.

## Understanding the Translation Mapping

Docker Compose and Kubernetes use different terminology for similar concepts.

```yaml
# Docker Compose example - docker-compose.yml
version: '3.8'

services:
  web:
    image: nginx:1.21
    ports:
      - "8080:80"
    environment:
      - BACKEND_URL=http://api:3000
    depends_on:
      - api
    volumes:
      - ./html:/usr/share/nginx/html:ro
    networks:
      - frontend
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

  api:
    image: node:18
    command: npm start
    environment:
      - DATABASE_URL=postgresql://db:5432/myapp
      - REDIS_URL=redis://cache:6379
    depends_on:
      - db
      - cache
    volumes:
      - ./app:/app
    networks:
      - frontend
      - backend
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1.0'
          memory: 1G

  db:
    image: postgres:15
    environment:
      - POSTGRES_PASSWORD=secret
      - POSTGRES_DB=myapp
    volumes:
      - db-data:/var/lib/postgresql/data
    networks:
      - backend

  cache:
    image: redis:7
    networks:
      - backend

networks:
  frontend:
  backend:

volumes:
  db-data:
```

This Compose file defines a typical web application with frontend, API, database, and cache components.

## Converting Services to Deployments

Each Compose service becomes a Kubernetes Deployment.

```yaml
# web-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  labels:
    app: web
    tier: frontend
spec:
  replicas: 3  # From deploy.replicas
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
        tier: frontend
    spec:
      containers:
      - name: nginx
        image: nginx:1.21
        ports:
        - containerPort: 80
          name: http
        env:
        - name: BACKEND_URL
          value: "http://api:3000"
        resources:
          limits:
            cpu: "500m"  # From deploy.resources.limits.cpus
            memory: "512Mi"  # From deploy.resources.limits.memory
          requests:
            cpu: "250m"
            memory: "256Mi"
        volumeMounts:
        - name: html
          mountPath: /usr/share/nginx/html
          readOnly: true
      volumes:
      - name: html
        hostPath:
          path: /path/to/html
          type: Directory
---
# api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  labels:
    app: api
    tier: backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
        tier: backend
    spec:
      containers:
      - name: node
        image: node:18
        command: ["npm", "start"]
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: DATABASE_URL
          value: "postgresql://db:5432/myapp"
        - name: REDIS_URL
          value: "redis://cache:6379"
        resources:
          limits:
            cpu: "1"
            memory: "1Gi"
          requests:
            cpu: "500m"
            memory: "512Mi"
        volumeMounts:
        - name: app
          mountPath: /app
      volumes:
      - name: app
        hostPath:
          path: /path/to/app
          type: Directory
---
# db-deployment.yaml
apiVersion: apps/v1
kind: StatefulSet  # Use StatefulSet for database
metadata:
  name: db
  labels:
    app: db
    tier: database
spec:
  serviceName: db
  replicas: 1
  selector:
    matchLabels:
      app: db
  template:
    metadata:
      labels:
        app: db
        tier: database
    spec:
      containers:
      - name: postgres
        image: postgres:15
        ports:
        - containerPort: 5432
          name: postgres
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-secrets
              key: password
        - name: POSTGRES_DB
          value: "myapp"
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: standard
      resources:
        requests:
          storage: 10Gi
---
# cache-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cache
  labels:
    app: cache
    tier: cache
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cache
  template:
    metadata:
      labels:
        app: cache
        tier: cache
    spec:
      containers:
      - name: redis
        image: redis:7
        ports:
        - containerPort: 6379
          name: redis
        resources:
          limits:
            cpu: "500m"
            memory: "512Mi"
          requests:
            cpu: "250m"
            memory: "256Mi"
```

Note that databases use StatefulSet instead of Deployment to maintain stable network identity and persistent storage.

## Creating Services for Network Discovery

Docker Compose service names become Kubernetes Service objects for DNS-based discovery.

```yaml
# web-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: web
  labels:
    app: web
spec:
  type: LoadBalancer  # Expose externally, from ports mapping
  selector:
    app: web
  ports:
  - port: 80
    targetPort: 80
    protocol: TCP
    name: http
---
# api-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: api
  labels:
    app: api
spec:
  type: ClusterIP  # Internal only, no external ports in Compose
  selector:
    app: api
  ports:
  - port: 3000
    targetPort: 3000
    protocol: TCP
    name: http
---
# db-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: db
  labels:
    app: db
spec:
  type: ClusterIP
  clusterIP: None  # Headless service for StatefulSet
  selector:
    app: db
  ports:
  - port: 5432
    targetPort: 5432
    protocol: TCP
    name: postgres
---
# cache-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: cache
  labels:
    app: cache
spec:
  type: ClusterIP
  selector:
    app: cache
  ports:
  - port: 6379
    targetPort: 6379
    protocol: TCP
    name: redis
```

Services enable the same DNS-based service discovery that Compose provides automatically.

## Handling Environment Variables and Secrets

Convert Compose environment variables to ConfigMaps and Secrets.

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  BACKEND_URL: "http://api:3000"
  DATABASE_URL: "postgresql://db:5432/myapp"
  REDIS_URL: "redis://cache:6379"
  POSTGRES_DB: "myapp"
---
# secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-secrets
type: Opaque
stringData:
  password: "secret"  # Should be base64 encoded in production
---
# Updated deployment using ConfigMap and Secret
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
      - name: node
        image: node:18
        command: ["npm", "start"]
        envFrom:
        - configMapRef:
            name: app-config
        env:
        - name: DATABASE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-secrets
              key: password
```

Separating configuration from secrets follows Kubernetes best practices.

## Managing Persistent Volumes

Convert Compose named volumes to PersistentVolumeClaims.

```yaml
# db-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: db-data
spec:
  accessModes:
  - ReadWriteOnce
  storageClassName: standard
  resources:
    requests:
      storage: 10Gi
---
# For development, use hostPath volumes (not for production)
apiVersion: v1
kind: PersistentVolume
metadata:
  name: app-source
spec:
  capacity:
    storage: 5Gi
  accessModes:
  - ReadWriteMany
  hostPath:
    path: /path/to/app
    type: Directory
  persistentVolumeReclaimPolicy: Retain
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-source
spec:
  accessModes:
  - ReadWriteMany
  storageClassName: ""
  volumeName: app-source
  resources:
    requests:
      storage: 5Gi
```

For production, use dynamic provisioning with StorageClasses instead of hostPath volumes.

## Implementing Dependency Management

Compose `depends_on` translates to init containers and readiness probes.

```yaml
# api-deployment-with-dependencies.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      initContainers:
      # Wait for database to be ready
      - name: wait-for-db
        image: busybox:1.35
        command:
        - sh
        - -c
        - |
          until nc -z db 5432; do
            echo "Waiting for database..."
            sleep 2
          done
          echo "Database is ready"
      # Wait for cache to be ready
      - name: wait-for-cache
        image: busybox:1.35
        command:
        - sh
        - -c
        - |
          until nc -z cache 6379; do
            echo "Waiting for cache..."
            sleep 2
          done
          echo "Cache is ready"
      containers:
      - name: node
        image: node:18
        command: ["npm", "start"]
        ports:
        - containerPort: 3000
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
```

Init containers ensure dependencies start before the main application container.

## Creating an Automated Conversion Script

Build a script to automate the conversion process for complex applications.

```bash
#!/bin/bash
# compose-to-k8s.sh - Convert Docker Compose to Kubernetes manifests

COMPOSE_FILE=${1:-docker-compose.yml}
OUTPUT_DIR=${2:-k8s-manifests}

mkdir -p $OUTPUT_DIR

echo "Converting $COMPOSE_FILE to Kubernetes manifests..."

# Extract service names
SERVICES=$(docker-compose -f $COMPOSE_FILE config --services)

for SERVICE in $SERVICES; do
  echo "Processing service: $SERVICE"

  # Extract service configuration
  IMAGE=$(docker-compose -f $COMPOSE_FILE config | yq eval ".services.$SERVICE.image" -)
  REPLICAS=$(docker-compose -f $COMPOSE_FILE config | yq eval ".services.$SERVICE.deploy.replicas // 1" -)
  CPU_LIMIT=$(docker-compose -f $COMPOSE_FILE config | yq eval ".services.$SERVICE.deploy.resources.limits.cpus // \"500m\"" -)
  MEM_LIMIT=$(docker-compose -f $COMPOSE_FILE config | yq eval ".services.$SERVICE.deploy.resources.limits.memory // \"512Mi\"" -)

  # Detect if service needs StatefulSet
  VOLUMES=$(docker-compose -f $COMPOSE_FILE config | yq eval ".services.$SERVICE.volumes[]" - 2>/dev/null | grep -c ":")
  if [ "$VOLUMES" -gt 0 ] && [[ "$SERVICE" =~ (db|database|postgres|mysql|mongo) ]]; then
    KIND="StatefulSet"
  else
    KIND="Deployment"
  fi

  # Generate deployment manifest
  cat > $OUTPUT_DIR/${SERVICE}-deployment.yaml <<EOF
apiVersion: apps/v1
kind: $KIND
metadata:
  name: $SERVICE
  labels:
    app: $SERVICE
spec:
  replicas: $REPLICAS
  selector:
    matchLabels:
      app: $SERVICE
  template:
    metadata:
      labels:
        app: $SERVICE
    spec:
      containers:
      - name: $SERVICE
        image: $IMAGE
        resources:
          limits:
            cpu: "$CPU_LIMIT"
            memory: "$MEM_LIMIT"
          requests:
            cpu: "$(echo $CPU_LIMIT | sed 's/[^0-9]//g' | awk '{print $1/2}')m"
            memory: "$(echo $MEM_LIMIT | sed 's/[^0-9]//g' | awk '{print $1/2}')Mi"
EOF

  # Generate service manifest
  PORTS=$(docker-compose -f $COMPOSE_FILE config | yq eval ".services.$SERVICE.ports[]" - 2>/dev/null | head -1)
  if [ -n "$PORTS" ]; then
    TARGET_PORT=$(echo $PORTS | cut -d: -f2)
    SERVICE_TYPE="LoadBalancer"
  else
    TARGET_PORT="80"
    SERVICE_TYPE="ClusterIP"
  fi

  cat > $OUTPUT_DIR/${SERVICE}-service.yaml <<EOF
apiVersion: v1
kind: Service
metadata:
  name: $SERVICE
  labels:
    app: $SERVICE
spec:
  type: $SERVICE_TYPE
  selector:
    app: $SERVICE
  ports:
  - port: $TARGET_PORT
    targetPort: $TARGET_PORT
    protocol: TCP
EOF

  echo "Generated manifests for $SERVICE"
done

echo "Conversion complete. Manifests saved to $OUTPUT_DIR/"
echo "Review and adjust the generated files before applying to cluster."
```

This script provides a starting point for conversion, though manual review is always needed.

## Validating the Conversion

Test the converted manifests before deploying to production.

```bash
#!/bin/bash
# validate-conversion.sh

MANIFEST_DIR="k8s-manifests"

echo "Validating Kubernetes manifests..."

# Validate YAML syntax
for file in $MANIFEST_DIR/*.yaml; do
  echo "Validating $file..."
  kubectl apply --dry-run=client -f $file
  if [ $? -ne 0 ]; then
    echo "ERROR: Invalid manifest: $file"
    exit 1
  fi
done

# Check for common issues
echo "Checking for common migration issues..."

# Check for hostPath volumes in production
if grep -r "hostPath" $MANIFEST_DIR/ >/dev/null; then
  echo "WARNING: hostPath volumes found - not recommended for production"
fi

# Check for missing resource limits
MISSING_LIMITS=$(grep -L "limits:" $MANIFEST_DIR/*deployment.yaml)
if [ -n "$MISSING_LIMITS" ]; then
  echo "WARNING: Some deployments missing resource limits:"
  echo "$MISSING_LIMITS"
fi

# Check for ClusterIP services that should be LoadBalancer
grep -A5 "type: ClusterIP" $MANIFEST_DIR/*service.yaml | grep -B5 "port: 80"
if [ $? -eq 0 ]; then
  echo "WARNING: Web services using ClusterIP instead of LoadBalancer"
fi

echo "Validation complete. Review warnings before deployment."
```

This validation catches common conversion mistakes.

## Deploying to Kubernetes

Deploy the converted application in the correct order.

```bash
#!/bin/bash
# deploy.sh

NAMESPACE="my-app"

# Create namespace
kubectl create namespace $NAMESPACE

# Deploy in dependency order
echo "Deploying persistent volumes..."
kubectl apply -f k8s-manifests/*pv*.yaml -n $NAMESPACE

echo "Deploying configuration..."
kubectl apply -f k8s-manifests/*configmap*.yaml -n $NAMESPACE
kubectl apply -f k8s-manifests/*secret*.yaml -n $NAMESPACE

echo "Deploying databases..."
kubectl apply -f k8s-manifests/db-*.yaml -n $NAMESPACE
kubectl apply -f k8s-manifests/cache-*.yaml -n $NAMESPACE

# Wait for databases to be ready
kubectl wait --for=condition=ready pod -l app=db -n $NAMESPACE --timeout=300s
kubectl wait --for=condition=ready pod -l app=cache -n $NAMESPACE --timeout=300s

echo "Deploying application services..."
kubectl apply -f k8s-manifests/api-*.yaml -n $NAMESPACE
kubectl apply -f k8s-manifests/web-*.yaml -n $NAMESPACE

# Wait for all deployments
kubectl wait --for=condition=available --timeout=300s deployment --all -n $NAMESPACE

echo "Deployment complete!"
kubectl get all -n $NAMESPACE
```

This deployment script respects dependencies and waits for readiness at each stage.

## Conclusion

Converting Docker Compose applications to Kubernetes requires systematic translation of concepts. Services become Deployments or StatefulSets depending on statefulness. Port mappings translate to Service objects with appropriate types. Environment variables split into ConfigMaps for configuration and Secrets for sensitive data. Named volumes become PersistentVolumeClaims with appropriate storage classes. The `depends_on` directive maps to init containers and readiness probes. Use automated scripts to generate initial manifests but always review and adjust for production requirements. Add resource limits, health checks, and proper storage configuration. Test converted applications in staging before production deployment. While Kubernetes is more complex than Compose, it provides the scalability and production features needed for serious workloads.
