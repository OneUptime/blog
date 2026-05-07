# How to Migrate Docker Swarm Services to Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Docker, Swarm, Migration, Kubernetes, Systemd

Description: Learn how to migrate Docker Swarm services to Podman using pods, systemd services, and Kubernetes as orchestration alternatives.

---

> Docker Swarm services can be migrated to Podman using a combination of Podman pods for container grouping, systemd for service management, and Kubernetes for multi-node orchestration.

Docker Swarm provides built-in orchestration for deploying services across multiple nodes. Podman does not include a Swarm equivalent, but it offers several alternatives depending on your scale and requirements. For single-node deployments, Podman pods with systemd provide reliable service management. For multi-node orchestration, Podman integrates with Kubernetes. This guide walks through migrating your Swarm services to these alternatives.

---

## Assessing Your Swarm Deployment

Start by inventorying your current Docker Swarm services.

```bash
# List all Swarm services

docker service ls

# Get detailed info about each service
docker service ls -q | while read SVC_ID; do
  docker service inspect "$SVC_ID" | jq '.[0] | {
    Name: .Spec.Name,
    Image: .Spec.TaskTemplate.ContainerSpec.Image,
    Replicas: .Spec.Mode.Replicated.Replicas,
    Ports: .Spec.EndpointSpec.Ports,
    Env: .Spec.TaskTemplate.ContainerSpec.Env,
    Mounts: .Spec.TaskTemplate.ContainerSpec.Mounts
  }'
done

# Export the full Swarm stack configuration
docker stack ls
docker stack config --compose-file docker-compose.yml > /tmp/swarm-stack.yml
```

## Converting Swarm Services to Podman Pods

For single-node deployments, convert Swarm services to Podman pods.

```bash
# Example Swarm stack (docker-compose for Swarm)
# A web app with a database
cat > swarm-stack.yml << 'EOF'
version: "3.8"
services:
  web:
    image: myapp:latest
    ports:
      - "8080:80"
    environment:
      - DB_HOST=db
    deploy:
      replicas: 2
  db:
    image: postgres:16
    environment:
      - POSTGRES_PASSWORD=secret
    volumes:
      - db-data:/var/lib/postgresql/data
volumes:
  db-data:
EOF

# Convert to Podman pod
# Create a pod that groups the containers
podman pod create \
  --name myapp-pod \
  -p 8080:80 \
  -p 5432:5432

# Create the database volume
podman volume create db-data

# Run the database container in the pod
podman run -d \
  --pod myapp-pod \
  --name myapp-db \
  -e POSTGRES_PASSWORD=secret \
  -v db-data:/var/lib/postgresql/data \
  docker.io/library/postgres:16

# Run the web application in the pod
podman run -d \
  --pod myapp-pod \
  --name myapp-web \
  -e DB_HOST=localhost \
  docker.io/myapp:latest
```

## Managing Services with Systemd

Replace Swarm's service management with systemd for automatic restarts and boot-time startup.

```bash
# Create Quadlet files for the pod and containers
mkdir -p ~/.config/containers/systemd/

cat > ~/.config/containers/systemd/db-data.volume << 'EOF'
[Volume]
VolumeName=db-data
EOF

cat > ~/.config/containers/systemd/myapp.pod << 'EOF'
[Pod]
PodName=myapp-pod
PublishPort=8080:80
EOF

cat > ~/.config/containers/systemd/myapp-db.container << 'EOF'
[Container]
ContainerName=myapp-db
Image=docker.io/library/postgres:16
Environment=POSTGRES_PASSWORD=secret
Volume=db-data.volume:/var/lib/postgresql/data
Pod=myapp.pod
EOF

cat > ~/.config/containers/systemd/myapp-web.container << 'EOF'
[Container]
ContainerName=myapp-web
Image=docker.io/myapp:latest
Environment=DB_HOST=localhost
Pod=myapp.pod
EOF

# Reload systemd and enable the generated services
systemctl --user daemon-reload
systemctl --user enable myapp-pod.service myapp-db.service myapp-web.service

# Start the pod and containers through systemd
systemctl --user start myapp-pod.service
systemctl --user start myapp-db.service myapp-web.service

# Check the status
systemctl --user status myapp-pod.service
systemctl --user status myapp-db.service myapp-web.service

# Enable lingering so services survive logout
loginctl enable-linger $(whoami)
```

## Handling Swarm Replicas

Docker Swarm supports replicated services. Podman handles scaling differently.

```bash
# Swarm replica scaling
# docker service scale web=3

# Podman alternative: Run multiple containers behind a load balancer
# Create a network for the replicas
podman network create myapp-net

# Run multiple instances of the web service
for i in $(seq 1 3); do
  podman run -d \
    --name "web-${i}" \
    --network myapp-net \
    -e INSTANCE_ID="${i}" \
    docker.io/myapp:latest
done

# Run nginx as a load balancer
cat > /tmp/nginx-lb.conf << 'NGINX'
upstream backend {
    server web-1:80;
    server web-2:80;
    server web-3:80;
}
server {
    listen 80;
    location / {
        proxy_pass http://backend;
    }
}
NGINX

podman run -d \
  --name loadbalancer \
  --network myapp-net \
  -p 8080:80 \
  -v /tmp/nginx-lb.conf:/etc/nginx/conf.d/default.conf:ro \
  docker.io/library/nginx:latest
```

## Migrating to Kubernetes with Podman

For multi-node orchestration, migrate Swarm services to Kubernetes.

```bash
# Generate Kubernetes YAML from a running Podman pod
podman kube generate myapp-pod > myapp-deployment.yaml

# Review and edit the generated YAML
cat myapp-deployment.yaml

# Deploy to a Kubernetes cluster
kubectl apply -f myapp-deployment.yaml

# Verify the deployment
kubectl get pods
kubectl get services
```

```bash
# Manually create a Kubernetes deployment from Swarm config
cat > myapp-k8s.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: web
        image: docker.io/myapp:latest
        ports:
        - containerPort: 80
        env:
        - name: DB_HOST
          value: "myapp-db"
---
apiVersion: v1
kind: Service
metadata:
  name: myapp
spec:
  type: LoadBalancer
  ports:
  - port: 8080
    targetPort: 80
  selector:
    app: myapp
EOF

kubectl apply -f myapp-k8s.yaml
```

## Migrating Swarm Secrets

Convert Docker Swarm secrets to Podman secrets.

```bash
# List Swarm secrets
docker secret ls

# Docker does not expose the secret value through docker secret inspect.
# Recreate the secret from your original secret file or source value.

# Create the equivalent Podman secret
printf '%s' "my-secret-value" | podman secret create my_secret -

# Use the secret in a Podman container
podman run -d \
  --secret my_secret \
  --name myapp \
  docker.io/myapp:latest

# The secret is available at /run/secrets/my_secret inside the container
```

## Migration Checklist Script

Automate the assessment of your Swarm-to-Podman migration.

```bash
#!/bin/bash
# swarm-migration-checklist.sh - Assess Swarm services for Podman migration

echo "=== Docker Swarm Migration Assessment ==="

echo ""
echo "Services:"
docker service ls --format "{{.Name}}: {{.Replicas}} replicas, {{.Image}}"

echo ""
echo "Networks:"
docker network ls --filter driver=overlay --format "{{.Name}} ({{.Driver}})"

echo ""
echo "Volumes:"
docker volume ls --format "{{.Name}} ({{.Driver}})"

echo ""
echo "Secrets:"
docker secret ls --format "{{.Name}}"

echo ""
echo "=== Migration Notes ==="
echo "- Services with 1 replica: Use Podman pods + systemd"
echo "- Services with multiple replicas: Use Podman + load balancer or Kubernetes"
echo "- Overlay networks: Replace with Kubernetes networking or Podman pods"
echo "- Secrets: Recreate using 'podman secret create'"
echo "- Volumes: Migrate using tar export/import"
```

## Summary

Migrating Docker Swarm services to Podman involves choosing the right orchestration approach for your needs. For single-node deployments, Podman pods with Quadlet and systemd provide reliable container grouping and automatic restart capabilities. For multi-node orchestration with replicas and load balancing, Kubernetes is the natural successor to Docker Swarm, and Podman's `kube generate` command simplifies the transition. Migrate secrets with `podman secret create`, handle replicas with manual scaling or Kubernetes deployments, and use systemd for service lifecycle management.
