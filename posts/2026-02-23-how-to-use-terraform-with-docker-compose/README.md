# How to Use Terraform with Docker Compose

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Docker, Docker Compose, Container, DevOps, Infrastructure as Code

Description: Learn how to use Terraform with Docker Compose to provision cloud infrastructure and deploy containerized applications together in a unified workflow.

---

Terraform and Docker Compose serve different but complementary purposes. Terraform manages cloud infrastructure - servers, networks, databases, and load balancers. Docker Compose manages multi-container applications on a single host. By combining them, you can provision the infrastructure with Terraform and then deploy your containerized application stack with Docker Compose, all in one automated pipeline.

This guide covers practical patterns for integrating Terraform with Docker Compose, from simple setups to production-ready architectures.

## Understanding When to Use This Combination

The Terraform-Docker Compose combination is particularly useful for development environments, small-to-medium production deployments, and situations where Kubernetes would be overkill. It works well for teams that want the infrastructure-as-code benefits of Terraform with the simplicity of Docker Compose for application orchestration.

For large-scale production deployments, you might prefer Terraform with ECS or EKS instead. But for many use cases, Docker Compose provides all the orchestration you need.

## Provisioning Infrastructure with Terraform

Start by using Terraform to create the EC2 instance and supporting infrastructure that will run Docker Compose.

```hcl
# Security group for the Docker host
resource "aws_security_group" "docker_host" {
  name_prefix = "docker-host-"
  vpc_id      = var.vpc_id

  # HTTP access
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP"
  }

  # HTTPS access
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS"
  }

  # SSH access (restrict in production)
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.ssh_allowed_cidrs
    description = "SSH"
  }

  # Outbound access
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "docker-host-sg-${var.environment}"
  }
}

# EC2 instance with Docker and Docker Compose pre-installed
resource "aws_instance" "docker_host" {
  ami           = var.ami_id
  instance_type = var.instance_type
  key_name      = var.key_name
  subnet_id     = var.subnet_id

  vpc_security_group_ids = [aws_security_group.docker_host.id]
  iam_instance_profile   = aws_iam_instance_profile.docker_host.name

  # Install Docker and Docker Compose via user data
  user_data = <<-EOF
    #!/bin/bash
    set -e

    # Install Docker
    curl -fsSL https://get.docker.com | sh
    usermod -aG docker ubuntu

    # Install Docker Compose v2
    mkdir -p /usr/local/lib/docker/cli-plugins
    curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" \
      -o /usr/local/lib/docker/cli-plugins/docker-compose
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

    # Enable Docker service
    systemctl enable docker
    systemctl start docker

    # Create application directory
    mkdir -p /opt/app
    chown ubuntu:ubuntu /opt/app
  EOF

  root_block_device {
    volume_size = 50
    volume_type = "gp3"
    encrypted   = true
  }

  tags = {
    Name        = "docker-host-${var.environment}"
    Environment = var.environment
  }
}

# Elastic IP for stable addressing
resource "aws_eip" "docker_host" {
  instance = aws_instance.docker_host.id
  domain   = "vpc"

  tags = {
    Name = "docker-host-eip-${var.environment}"
  }
}
```

## Deploying Docker Compose Configuration

Use Terraform's file provisioner to copy your Docker Compose files to the host and start the application.

```hcl
# Generate docker-compose.yml with Terraform variables
resource "local_file" "docker_compose" {
  content = templatefile("${path.module}/templates/docker-compose.yml.tftpl", {
    db_host         = aws_db_instance.main.address
    db_port         = aws_db_instance.main.port
    db_name         = var.db_name
    db_user         = var.db_username
    redis_host      = aws_elasticache_cluster.main.cache_nodes[0].address
    redis_port      = 6379
    app_domain      = var.app_domain
    environment     = var.environment
    app_image       = var.app_image
    app_version     = var.app_version
    s3_bucket       = aws_s3_bucket.assets.id
    aws_region      = var.region
  })
  filename = "${path.module}/generated/docker-compose.yml"
}

# Copy and deploy Docker Compose configuration
resource "null_resource" "deploy_compose" {
  triggers = {
    compose_hash = local_file.docker_compose.content_md5
    instance_id  = aws_instance.docker_host.id
  }

  # Copy docker-compose file
  provisioner "file" {
    source      = local_file.docker_compose.filename
    destination = "/opt/app/docker-compose.yml"

    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file(var.ssh_private_key_path)
      host        = aws_eip.docker_host.public_ip
    }
  }

  # Deploy the application
  provisioner "remote-exec" {
    inline = [
      "cd /opt/app",
      "docker compose pull",
      "docker compose up -d --remove-orphans",
      "docker compose ps",
    ]

    connection {
      type        = "ssh"
      user        = "ubuntu"
      private_key = file(var.ssh_private_key_path)
      host        = aws_eip.docker_host.public_ip
    }
  }

  depends_on = [aws_instance.docker_host]
}
```

## Docker Compose Template

The Docker Compose template uses Terraform variables for environment-specific configuration.

```yaml
# templates/docker-compose.yml.tftpl
version: "3.8"

services:
  # Application service
  app:
    image: ${app_image}:${app_version}
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=${environment}
      - DATABASE_URL=postgresql://${db_user}:$${DB_PASSWORD}@${db_host}:${db_port}/${db_name}
      - REDIS_URL=redis://${redis_host}:${redis_port}
      - S3_BUCKET=${s3_bucket}
      - AWS_REGION=${aws_region}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    logging:
      driver: "awslogs"
      options:
        awslogs-group: "/docker/${environment}/app"
        awslogs-region: "${aws_region}"
        awslogs-stream-prefix: "app"

  # Nginx reverse proxy
  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      app:
        condition: service_healthy

  # Background worker
  worker:
    image: ${app_image}:${app_version}
    restart: always
    command: ["node", "worker.js"]
    environment:
      - NODE_ENV=${environment}
      - DATABASE_URL=postgresql://${db_user}:$${DB_PASSWORD}@${db_host}:${db_port}/${db_name}
      - REDIS_URL=redis://${redis_host}:${redis_port}
    logging:
      driver: "awslogs"
      options:
        awslogs-group: "/docker/${environment}/worker"
        awslogs-region: "${aws_region}"
        awslogs-stream-prefix: "worker"
```

## Using the Docker Terraform Provider

For local Docker management, Terraform has a Docker provider that can manage containers directly.

```hcl
# Docker provider for local development
terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

provider "docker" {
  host = "unix:///var/run/docker.sock"
}

# Pull the application image
resource "docker_image" "app" {
  name = "${var.app_image}:${var.app_version}"
}

# Create a Docker network
resource "docker_network" "app" {
  name = "app-network"
}

# Run the application container
resource "docker_container" "app" {
  name  = "app-${var.environment}"
  image = docker_image.app.image_id

  ports {
    internal = 3000
    external = 3000
  }

  networks_advanced {
    name = docker_network.app.name
  }

  env = [
    "NODE_ENV=${var.environment}",
    "DATABASE_URL=${var.database_url}",
  ]

  restart = "always"

  healthcheck {
    test     = ["CMD", "curl", "-f", "http://localhost:3000/health"]
    interval = "30s"
    timeout  = "10s"
    retries  = 3
  }
}
```

## CloudWatch Logging for Docker Containers

Set up CloudWatch log groups for your Docker containers.

```hcl
# CloudWatch log groups for Docker containers
resource "aws_cloudwatch_log_group" "app" {
  name              = "/docker/${var.environment}/app"
  retention_in_days = var.environment == "production" ? 30 : 7

  tags = {
    Environment = var.environment
    Service     = "app"
  }
}

resource "aws_cloudwatch_log_group" "worker" {
  name              = "/docker/${var.environment}/worker"
  retention_in_days = var.environment == "production" ? 30 : 7

  tags = {
    Environment = var.environment
    Service     = "worker"
  }
}
```

## Best Practices

Use Docker Compose for simpler deployments where container orchestration features like auto-scaling and service mesh are not needed. Always template your Docker Compose files through Terraform so that environment-specific configuration is injected at deploy time rather than stored in the compose file.

Pin Docker image versions in production - never use the "latest" tag. Set up health checks for all services so Docker can automatically restart unhealthy containers.

For container orchestration at larger scale, see our guides on [cost optimization for Kubernetes with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-cost-optimization-for-kubernetes-with-terraform/view) and [using Terraform with Nomad for workload orchestration](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-with-nomad-for-workload-orchestration/view).

## Conclusion

Terraform with Docker Compose provides a pragmatic approach to containerized deployments that balances simplicity with infrastructure-as-code best practices. Terraform handles the cloud resources, Docker Compose handles the application containers, and the combination gives you a reproducible, version-controlled deployment pipeline without the complexity of Kubernetes. For many teams, this is exactly the right level of abstraction.
