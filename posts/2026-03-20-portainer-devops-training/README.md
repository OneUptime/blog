# How to Use Portainer for DevOps Training

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, DevOps, Training, CI/CD, Infrastructure

Description: Design a hands-on DevOps training curriculum using Portainer to teach container orchestration, CI/CD pipelines, and infrastructure as code.

## Introduction

DevOps training requires practical exposure to container orchestration, CI/CD pipelines, infrastructure management, and monitoring. Portainer provides a visual layer that accelerates understanding of Docker and Kubernetes concepts while still requiring trainees to engage with the underlying systems. This guide outlines a structured DevOps training program built on Portainer.

## Training Program Overview

The program covers five key areas over four weeks:

1. Container fundamentals with Docker and Portainer
2. Multi-service applications and Docker Compose
3. CI/CD pipeline integration
4. Container orchestration with Docker Swarm or Kubernetes
5. Monitoring, logging, and incident response

## Module 1: Container Fundamentals

### Environment Setup

```bash
# Training environment: each trainee gets a VM

# Automated provisioning script
cat > setup-trainee-vm.sh << 'EOF'
#!/bin/bash
TRAINEE=${1:-${SUDO_USER:-$USER}}

# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$TRAINEE"

# Install Portainer
sudo docker volume create portainer_data
sudo docker run -d \
  --name portainer \
  --restart=always \
  -p 8000:8000 \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:sts

echo "Training environment ready for: $TRAINEE"
echo "Access Portainer at: https://$(hostname -I | awk '{print $1}'):9443"
EOF
chmod +x setup-trainee-vm.sh
```

### Exercise 1.1: Container Lifecycle

Trainees practice the full container lifecycle through Portainer:

```bash
# Trainee checklist (also achievable via Portainer UI):
# 1. Pull an nginx image
docker pull nginx:1.25-alpine

# 2. Run a container with port mapping
docker run -d --name my-nginx -p 8080:80 nginx:1.25-alpine

# 3. Verify it's running
docker ps

# 4. Check logs
docker logs my-nginx

# 5. Connect to console
docker exec -it my-nginx sh

# 6. Stop and remove
docker stop my-nginx && docker rm my-nginx
```

## Module 2: Multi-Service Applications

### Exercise 2.1: Deploy a Complete Application Stack

```yaml
# training-app/docker-compose.yml
services:
  frontend:
    image: nginx:1.25-alpine
    ports:
      - "80:80"
    volumes:
      - ./frontend:/usr/share/nginx/html:ro
    depends_on:
      - api

  api:
    image: node:24-alpine
    working_dir: /app
    command: node server.js
    environment:
      - PORT=3000
      - DB_HOST=database
      - DB_NAME=trainapp
    volumes:
      - ./api:/app
    depends_on:
      - database

  database:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: trainapp
      POSTGRES_USER: trainuser
      POSTGRES_PASSWORD: trainpass
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

In Portainer: Deploy as a Stack, observe inter-service communication, check dependencies.

## Module 3: CI/CD Pipeline Integration

### Exercise 3.1: GitHub Actions to Portainer Deployment

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy
on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - name: Build Docker image
        run: |
          docker build -t ${{ secrets.REGISTRY }}/training-app:${{ github.sha }} .
          docker build -t ${{ secrets.REGISTRY }}/training-app:latest .

      - name: Push to registry
        run: |
          echo ${{ secrets.REGISTRY_PASSWORD }} | docker login ${{ secrets.REGISTRY }} -u ${{ secrets.REGISTRY_USER }} --password-stdin
          docker push ${{ secrets.REGISTRY }}/training-app:${{ github.sha }}
          docker push ${{ secrets.REGISTRY }}/training-app:latest

      - name: Deploy to Portainer
        run: |
          curl -kfsSL -X POST "${{ secrets.PORTAINER_URL }}/api/stacks/webhooks/${{ secrets.PORTAINER_WEBHOOK_TOKEN }}"
```

Trainees configure the GitHub Actions workflow and observe the automatic deployment in Portainer. Webhook-triggered redeployments require Portainer Business Edition; in Portainer CE, use Git-based auto-updates instead.

## Module 4: Container Orchestration

### Exercise 4.1: Docker Swarm Deployment

```bash
# Initialize a Swarm for the training cluster
docker swarm init

# Add worker nodes (on additional VMs)
docker swarm join --token <TOKEN> <MANAGER-IP>:2377

# Deploy a service with rolling updates
docker service create \
  --name training-web \
  --replicas 3 \
  --update-delay 10s \
  --update-parallelism 1 \
  -p 80:80 \
  nginx:1.25-alpine

# In Portainer: Swarm > Services > training-web
# Shows all 3 replicas, health status, update history
```

### Exercise 4.2: Rolling Updates and Rollbacks

```bash
# Update the service (triggers rolling update)
docker service update --image nginx:1.26-alpine training-web

# Watch the update in Portainer Services view
# Practice rolling back
docker service rollback training-web
```

## Module 5: Monitoring and Incident Response

### Exercise 5.1: Set Up Monitoring Stack

```yaml
# monitoring-stack/docker-compose.yml
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prom_data:/prometheus

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=training
    volumes:
      - grafana_data:/var/lib/grafana

  cadvisor:
    image: ghcr.io/google/cadvisor:v0.55.1
    privileged: true
    ports:
      - "8080:8080"
    devices:
      - /dev/kmsg:/dev/kmsg
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
      - /dev/disk/:/dev/disk:ro

volumes:
  prom_data:
  grafana_data:
```

### Exercise 5.2: Simulate and Diagnose an Incident

```bash
# Instructor creates a broken deployment
# Deliberately too low to trigger an OOM kill
docker run -d \
  --name broken-app \
  --memory="64m" \
  --restart=always \
  node:24-alpine \
  node -e "
    // Memory leak simulation
    const leak = [];
    setInterval(() => {
      leak.push(Buffer.alloc(1024 * 1024));  // 1MB per second
    }, 1000);
  "

# Trainees must:
# 1. Notice the container is OOMKilled in Portainer
# 2. Check the restart count
# 3. View logs to identify the issue
# 4. Increase the memory limit to fix it
```

## Training Assessment Checklist

```bash
# Assessment script - tests if trainee completed exercises
check_trainee_completion() {
  TRAINEE_HOST=$1
  echo "Checking $TRAINEE_HOST..."
  
  # Check if Portainer is running
  curl -ksf "https://$TRAINEE_HOST:9443/api/status" > /dev/null && \
    echo "  [PASS] Portainer running" || echo "  [FAIL] Portainer not accessible"
  
  # Check if application stack is deployed
  curl -sf "http://$TRAINEE_HOST:80" > /dev/null && \
    echo "  [PASS] Application accessible" || echo "  [FAIL] Application not running"
  
  # Check monitoring
  curl -sf "http://$TRAINEE_HOST:9090/-/healthy" > /dev/null && \
    echo "  [PASS] Prometheus running" || echo "  [FAIL] Prometheus not running"
}
```

## Conclusion

A Portainer-based DevOps training program accelerates the learning curve by making infrastructure concepts visible and interactive. Trainees progress from basic container operations through CI/CD automation to orchestration and incident response. The visual feedback from Portainer combined with hands-on CLI exercises builds the practical skills needed for real-world DevOps roles. The assessment scripts enable instructors to verify completion objectively across a class of any size.
