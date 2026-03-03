# How to Migrate Workloads from Docker Swarm to Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Docker Swarm, Migration, Container Orchestration, Infrastructure

Description: A hands-on guide for migrating your Docker Swarm services to Kubernetes running on Talos Linux with practical conversion examples and strategies.

---

Docker Swarm served many teams well as a simple container orchestration platform, but its development has slowed significantly and the ecosystem has moved decisively toward Kubernetes. If you are still running workloads on Docker Swarm and considering your next move, Talos Linux offers an interesting option: you get Kubernetes (the industry standard) running on an immutable, minimal operating system that is arguably simpler to manage than a fleet of Docker Swarm nodes. This guide covers how to make that transition.

## Why Talos Linux for Swarm Users

Docker Swarm's appeal was always its simplicity. You could take a few Linux servers, run `docker swarm init`, and have a working cluster in minutes. Kubernetes has traditionally been seen as the opposite - complex, difficult to set up, and requiring significant operational overhead.

Talos Linux changes that equation. While Kubernetes itself still has more concepts to learn than Swarm, Talos makes the operational side much simpler. There is no OS to manage, no SSH access to worry about, no package updates to apply. You define your cluster in YAML files and manage it through an API. For teams coming from Docker Swarm who valued simplicity, Talos is the most operationally simple way to run Kubernetes.

## Understanding the Translation

Before diving into the migration, let us map Docker Swarm concepts to their Kubernetes equivalents:

| Docker Swarm | Kubernetes |
|---|---|
| Service | Deployment + Service |
| Stack | Namespace (logical grouping) |
| docker-compose.yml | Kubernetes manifests (YAML) |
| Swarm Overlay Network | Pod Network (CNI) |
| Swarm Secrets | Kubernetes Secrets |
| Swarm Configs | ConfigMaps |
| Docker Volumes | PersistentVolumeClaims |
| Node Labels | Node Labels (same concept) |
| Placement Constraints | nodeSelector / Affinity |
| Replicas | Replicas (same concept) |

## Step 1: Inventory Your Swarm Services

Start by documenting everything running on your Swarm:

```bash
# List all services
docker service ls

# Get detailed info for each service
docker service ls --format '{{.Name}}' | while read svc; do
  echo "=== $svc ==="
  docker service inspect $svc --pretty
done

# List all stacks
docker stack ls

# Export stack compose files
docker stack ls --format '{{.Name}}' | while read stack; do
  echo "Exporting $stack..."
  docker stack config $stack > "${stack}-compose.yml" 2>/dev/null || \
  echo "Could not export $stack (may need original compose file)"
done

# List all volumes
docker volume ls

# List all networks
docker network ls --filter scope=swarm

# List all secrets and configs
docker secret ls
docker config ls
```

## Step 2: Set Up the Talos Cluster

Install talosctl and create your cluster:

```bash
# Install talosctl
curl -sL https://talos.dev/install | sh

# Generate cluster configuration
talosctl gen secrets -o secrets.yaml
talosctl gen config swarm-replacement https://10.0.0.100:6443 \
  --with-secrets secrets.yaml \
  --output-dir _out

# Apply to your nodes
# Control plane
talosctl apply-config --insecure --nodes 10.0.0.10 --file _out/controlplane.yaml

# Workers
talosctl apply-config --insecure --nodes 10.0.0.20 --file _out/worker.yaml
talosctl apply-config --insecure --nodes 10.0.0.21 --file _out/worker.yaml

# Bootstrap
export TALOSCONFIG="_out/talosconfig"
talosctl config endpoint 10.0.0.10
talosctl config node 10.0.0.10
talosctl bootstrap
talosctl kubeconfig ./kubeconfig

export KUBECONFIG=./kubeconfig
```

Install essential components:

```bash
# Storage provisioner
helm repo add longhorn https://charts.longhorn.io
helm install longhorn longhorn/longhorn -n longhorn-system --create-namespace

# Ingress controller (replaces Swarm's built-in routing mesh)
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  -n ingress-nginx --create-namespace

# If on bare metal, install MetalLB for LoadBalancer services
helm repo add metallb https://metallb.github.io/metallb
helm install metallb metallb/metallb -n metallb-system --create-namespace
```

## Step 3: Convert Docker Compose to Kubernetes Manifests

This is the core of the migration. Let us walk through converting a typical Docker Compose/Swarm file to Kubernetes manifests.

Here is a sample Docker Swarm stack:

```yaml
# docker-compose.yml (Swarm mode)
version: "3.8"
services:
  web:
    image: myapp:latest
    ports:
      - "8080:80"
    environment:
      - DATABASE_URL=postgres://db:5432/myapp
    deploy:
      replicas: 3
      restart_policy:
        condition: on-failure
      placement:
        constraints:
          - node.role == worker
    secrets:
      - db_password
    volumes:
      - app_data:/data

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=myapp
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.labels.storage == ssd
    secrets:
      - db_password
    volumes:
      - db_data:/var/lib/postgresql/data

secrets:
  db_password:
    external: true

volumes:
  app_data:
  db_data:
```

Here is the equivalent Kubernetes manifests:

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: myapp
---
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-password
  namespace: myapp
type: Opaque
stringData:
  password: "your-password-here"
---
# db-deployment.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: db
  namespace: myapp
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
    spec:
      nodeSelector:
        storage: ssd
      containers:
        - name: postgres
          image: postgres:15
          env:
            - name: POSTGRES_DB
              value: myapp
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-password
                  key: password
          ports:
            - containerPort: 5432
          volumeMounts:
            - name: db-data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: db-data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi
---
# db-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: db
  namespace: myapp
spec:
  selector:
    app: db
  ports:
    - port: 5432
      targetPort: 5432
---
# web-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: node-role.kubernetes.io/control-plane
                    operator: DoesNotExist
      containers:
        - name: web
          image: myapp:latest
          env:
            - name: DATABASE_URL
              value: postgres://db.myapp.svc.cluster.local:5432/myapp
          ports:
            - containerPort: 80
          volumeMounts:
            - name: app-data
              mountPath: /data
      volumes:
        - name: app-data
          persistentVolumeClaim:
            claimName: app-data
---
# web-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-data
  namespace: myapp
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
---
# web-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: web
  namespace: myapp
spec:
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 80
---
# web-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web
  namespace: myapp
spec:
  ingressClassName: nginx
  rules:
    - host: myapp.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web
                port:
                  number: 80
```

## Step 4: Migrate Secrets and Data

Transfer your Swarm secrets to Kubernetes:

```bash
# Export Swarm secrets (you need the original values)
# Docker Swarm secrets cannot be read back, so you need them from your source
# Create them in Kubernetes
kubectl create secret generic db-password \
  --from-literal=password="your-actual-password" \
  -n myapp
```

For volume data, use rsync or similar tools:

```bash
# Find where Docker stores the volume data on Swarm nodes
docker volume inspect db_data --format '{{.Mountpoint}}'

# Copy data to the new cluster's storage
rsync -avz user@swarm-node:/var/lib/docker/volumes/db_data/_data/ \
  user@talos-worker:/tmp/db-migration/

# Then use a temporary pod to copy data into the PVC
kubectl run data-copy --image=busybox -n myapp \
  --overrides='{"spec":{"containers":[{"name":"copy","image":"busybox","command":["sleep","3600"],"volumeMounts":[{"name":"data","mountPath":"/data"}]}],"volumes":[{"name":"data","persistentVolumeClaim":{"claimName":"db-data-db-0"}}]}}'
```

## Step 5: Handle Swarm Networking Differences

Docker Swarm uses an overlay network with built-in service discovery and load balancing. In Kubernetes, these are handled differently:

- **Service Discovery**: Kubernetes uses DNS-based service discovery. Instead of connecting to `db`, you connect to `db.myapp.svc.cluster.local` (or just `db` within the same namespace).
- **Load Balancing**: Kubernetes Services handle load balancing across pod replicas automatically.
- **Published Ports**: Instead of publishing ports with `-p 8080:80`, you use a Service of type LoadBalancer or an Ingress resource.

## Step 6: Deploy and Verify

Apply your converted manifests:

```bash
# Deploy everything
kubectl apply -f ./kubernetes-manifests/

# Watch pods come up
kubectl get pods -n myapp -w

# Check services
kubectl get svc -n myapp

# Verify database connectivity
kubectl exec -n myapp deploy/web -- env | grep DATABASE_URL

# Check logs
kubectl logs -n myapp deploy/web --tail=50
```

## Wrapping Up

Migrating from Docker Swarm to Kubernetes on Talos Linux is a two-part challenge: converting your Swarm service definitions to Kubernetes manifests, and setting up the underlying infrastructure. The manifest conversion is the more tedious part, but it is mostly mechanical - mapping Swarm concepts to their Kubernetes equivalents. The infrastructure side is where Talos Linux shines, giving you a cluster that is arguably simpler to operate at the OS level than your old Swarm nodes were. Take the migration one stack at a time, verify each application thoroughly, and you will end up with a more capable and more maintainable platform.
