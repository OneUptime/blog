# How to Run Docker Containers on EC2 Without ECS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Docker, Containers

Description: A practical guide to running Docker containers directly on EC2 instances without using ECS or EKS, including Docker Compose setups and production considerations.

---

Not every containerized application needs a full orchestration platform. If you're running a handful of containers, need maximum control over your environment, or want to avoid the complexity of ECS/EKS, running Docker directly on EC2 is a perfectly valid approach. It's simpler, cheaper, and for many workloads, it's all you need.

Let's set up Docker on EC2 and get containers running - from basic single-container deployments to multi-container setups with Docker Compose.

## Installing Docker on EC2

Start with a fresh Amazon Linux 2023 instance and install Docker.

Install and start Docker on Amazon Linux 2023:

```bash
# Update the system
sudo yum update -y

# Install Docker
sudo yum install -y docker

# Start the Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to the docker group (avoids needing sudo for every command)
sudo usermod -aG docker ec2-user

# Log out and back in for group changes to take effect
exit
```

After logging back in, verify Docker is running:

```bash
# Check Docker version and status
docker --version
docker info

# Run a test container
docker run hello-world
```

For Ubuntu-based instances, the installation is slightly different:

```bash
# Ubuntu Docker installation
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

# Add Docker's official GPG key and repository
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io
sudo usermod -aG docker ubuntu
```

## Running Your First Container

With Docker installed, let's run a real application. We'll start with a simple web server.

Run an nginx container with port mapping:

```bash
# Run nginx, mapping port 80 on the host to port 80 in the container
docker run -d \
  --name web \
  --restart unless-stopped \
  -p 80:80 \
  nginx:alpine

# Verify it's running
docker ps

# Check the logs
docker logs web
```

The `--restart unless-stopped` flag ensures the container restarts automatically if it crashes or if the instance reboots. This is important for anything resembling production use.

Make sure your EC2 security group allows traffic on port 80:

```bash
# Add HTTP access to the security group
aws ec2 authorize-security-group-ingress \
  --group-id sg-0abc123 \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0
```

## Running a Custom Application

Most likely you're deploying your own application, not nginx. Here's how to pull and run a custom image from Amazon ECR.

Authenticate with ECR and run your image:

```bash
# Log in to Amazon ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# Pull your image
docker pull 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app:latest

# Run it with environment variables and port mapping
docker run -d \
  --name my-app \
  --restart unless-stopped \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:pass@db-host:5432/mydb \
  -e NODE_ENV=production \
  -e LOG_LEVEL=info \
  123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app:latest
```

For the ECR authentication to work, your EC2 instance needs an IAM role with ECR pull permissions. Attach a role with the `AmazonEC2ContainerRegistryReadOnly` managed policy.

## Multi-Container Setup with Docker Compose

For applications with multiple services (web server, database, cache, etc.), Docker Compose keeps everything organized.

Install Docker Compose:

```bash
# Install Docker Compose plugin
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Verify
docker compose version
```

Create a Docker Compose file for a typical web application:

```yaml
# docker-compose.yml
services:
  app:
    image: 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app:latest
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:secretpass@db:5432/myapp
      - REDIS_URL=redis://cache:6379
      - NODE_ENV=production
    depends_on:
      - db
      - cache
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_PASSWORD=secretpass
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  cache:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

Start everything up:

```bash
# Start all services in detached mode
docker compose up -d

# Check status of all containers
docker compose ps

# View logs from all services
docker compose logs -f

# View logs from a specific service
docker compose logs -f app
```

## Automating Deployment with User Data

You can automate the entire Docker setup when launching an EC2 instance using user data.

User data script that installs Docker and starts your application:

```bash
#!/bin/bash
# User data script for Docker deployment

# Install Docker
yum update -y
yum install -y docker
systemctl start docker
systemctl enable docker

# Install Docker Compose
mkdir -p /usr/local/lib/docker/cli-plugins
curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# Pull and run the application
docker pull 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app:latest
docker run -d \
  --name my-app \
  --restart unless-stopped \
  -p 80:3000 \
  123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app:latest
```

## Managing Container Logs

By default, Docker logs can fill up your disk. Configure log rotation to prevent that.

Set up Docker daemon log rotation:

```bash
# Create Docker daemon configuration
sudo cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

# Restart Docker to apply
sudo systemctl restart docker
```

For centralized logging, you can use the awslogs driver to send container logs directly to CloudWatch:

```bash
# Run a container with CloudWatch logging
docker run -d \
  --name my-app \
  --log-driver=awslogs \
  --log-opt awslogs-group=/ec2/docker/my-app \
  --log-opt awslogs-region=us-east-1 \
  --log-opt awslogs-stream=my-app \
  -p 3000:3000 \
  my-app:latest
```

## Health Checks and Auto-Recovery

Without an orchestrator, you need to handle container health monitoring yourself.

Create a simple health check script:

```bash
#!/bin/bash
# /usr/local/bin/container-health-check.sh

CONTAINER_NAME="my-app"
HEALTH_URL="http://localhost:3000/health"

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "Container ${CONTAINER_NAME} is not running, restarting..."
    docker start ${CONTAINER_NAME}
    exit 1
fi

# Check health endpoint
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" ${HEALTH_URL} --max-time 5)

if [ "$HTTP_CODE" != "200" ]; then
    echo "Health check failed (HTTP ${HTTP_CODE}), restarting container..."
    docker restart ${CONTAINER_NAME}
    exit 1
fi

echo "Container is healthy"
```

Schedule it with cron:

```bash
# Add to crontab - check every minute
echo "* * * * * /usr/local/bin/container-health-check.sh >> /var/log/container-health.log 2>&1" | crontab -
```

## Security Best Practices

Running Docker on EC2 means you're responsible for security at every layer.

Key security measures:

```bash
# Don't run containers as root
docker run -d --user 1000:1000 my-app:latest

# Use read-only filesystem where possible
docker run -d --read-only --tmpfs /tmp my-app:latest

# Limit container resources
docker run -d \
  --memory="512m" \
  --cpus="1.0" \
  --pids-limit=100 \
  my-app:latest

# Scan images for vulnerabilities before deploying
docker scout cves my-app:latest
```

## When to Use This vs. ECS/EKS

Running Docker directly on EC2 works well when:
- You have a small number of containers (under 10-15)
- You don't need auto-scaling of individual containers
- You want full control over the host
- You want to keep things simple and avoid orchestrator complexity

Consider moving to ECS or EKS when:
- You need to run dozens or hundreds of containers
- You need sophisticated scheduling and placement strategies
- You want automatic container health management and replacement
- Multiple teams need to deploy independently to the same cluster

For monitoring your Docker containers on EC2, set up health checks and log aggregation early. Our post on [monitoring AWS infrastructure](https://oneuptime.com/blog/post/2026-02-13-aws-cloudwatch-infrastructure-monitoring/view) covers the fundamentals of getting visibility into your containerized workloads.

## Wrapping Up

Running Docker on EC2 without ECS is straightforward and gives you full control over your container runtime. Install Docker, configure restart policies, set up log rotation, and add basic health monitoring. For many workloads, this simple approach is all you need, and it avoids the complexity and cost overhead of managed orchestration services.
