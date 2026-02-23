# How to Configure Terraform Enterprise Network Requirements

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terraform Enterprise, Networking, Firewall, DNS, Proxy, Infrastructure

Description: A complete guide to Terraform Enterprise network requirements, covering ports, firewall rules, DNS configuration, proxy settings, and network architecture best practices.

---

Networking is where many Terraform Enterprise installations get stuck. TFE needs to communicate with several external services, and enterprise networks typically restrict outbound traffic by default. Missing a single firewall rule can cause mysterious failures during installation or runtime. Getting the networking right from the start prevents a lot of pain down the road.

This guide documents every network requirement for TFE so you can hand it to your network team with confidence.

## Required Network Connections

### Inbound Traffic to TFE

| Source | Port | Protocol | Purpose |
|---|---|---|---|
| Users / Browsers | 443 | HTTPS | Web UI and API access |
| Users / Browsers | 80 | HTTP | Redirect to HTTPS (optional) |
| VCS Servers | 443 | HTTPS | Webhook deliveries |
| TFE Agents | 443 | HTTPS | Agent communication |
| Load Balancer | 443 | HTTPS | Health checks and traffic forwarding |
| Monitoring | 443 | HTTPS | Health check endpoint |

### Outbound Traffic from TFE

| Destination | Port | Protocol | Purpose |
|---|---|---|---|
| PostgreSQL | 5432 | TCP | Database connections |
| Redis | 6379/6380 | TCP | Cache and session storage |
| Object Storage (S3/Blob/GCS) | 443 | HTTPS | State and artifact storage |
| VCS Servers | 443/22 | HTTPS/SSH | Clone repositories |
| HashiCorp Releases | 443 | HTTPS | Download Terraform binaries |
| Terraform Registry | 443 | HTTPS | Download providers and modules |
| Identity Provider | 443 | HTTPS | SAML/OIDC authentication |
| SMTP Server | 25/465/587 | TCP | Email notifications |
| HashiCorp License Server | 443 | HTTPS | License validation |
| Vault | 8200 | HTTPS | Secrets management (if integrated) |
| Cloud Provider APIs | 443 | HTTPS | AWS/Azure/GCP API calls during runs |

## Firewall Rules

### AWS Security Group Configuration

```hcl
# TFE instance security group
resource "aws_security_group" "tfe" {
  name        = "tfe-instance"
  description = "Security group for Terraform Enterprise"
  vpc_id      = var.vpc_id

  # Inbound: HTTPS from load balancer
  ingress {
    description     = "HTTPS from ALB"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.tfe_alb.id]
  }

  # Outbound: PostgreSQL
  egress {
    description     = "PostgreSQL"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.tfe_rds.id]
  }

  # Outbound: Redis
  egress {
    description     = "Redis"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.tfe_redis.id]
  }

  # Outbound: HTTPS (for S3, registry, VCS, IdP, etc.)
  egress {
    description = "HTTPS outbound"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Outbound: SSH to VCS (if using SSH for git clone)
  egress {
    description = "SSH to VCS"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.vcs_server_cidr]
  }

  # Outbound: SMTP
  egress {
    description = "SMTP"
    from_port   = 587
    to_port     = 587
    protocol    = "tcp"
    cidr_blocks = [var.smtp_server_cidr]
  }

  tags = {
    Name = "tfe-instance-sg"
  }
}

# Load balancer security group
resource "aws_security_group" "tfe_alb" {
  name        = "tfe-alb"
  description = "Security group for TFE Application Load Balancer"
  vpc_id      = var.vpc_id

  # Inbound: HTTPS from users and VCS webhooks
  ingress {
    description = "HTTPS from users"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = var.allowed_user_cidrs
  }

  # Inbound: HTTP redirect
  ingress {
    description = "HTTP redirect"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = var.allowed_user_cidrs
  }

  # Outbound: to TFE instances
  egress {
    description     = "HTTPS to TFE"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.tfe.id]
  }
}
```

## DNS Configuration

### Required DNS Records

```bash
# Primary A record or CNAME for TFE
# If behind a load balancer:
tfe.example.com  CNAME  tfe-alb-123456.us-east-1.elb.amazonaws.com

# If direct to instance:
tfe.example.com  A  10.0.1.100

# Verify DNS resolution
dig tfe.example.com
nslookup tfe.example.com
```

### Split-Horizon DNS

In environments where TFE has different internal and external addresses:

```bash
# External DNS (for users outside the corporate network)
tfe.example.com  CNAME  tfe-external-alb.us-east-1.elb.amazonaws.com

# Internal DNS (for users on the corporate network)
tfe.example.com  A  10.0.1.100

# Make sure both resolve correctly from their respective networks
# Test from external:
dig @8.8.8.8 tfe.example.com

# Test from internal:
dig @10.0.0.2 tfe.example.com
```

## Proxy Configuration

Many enterprise networks route outbound traffic through an HTTP proxy. TFE supports proxy configuration:

```bash
# Proxy configuration environment variables
HTTP_PROXY=http://proxy.internal.example.com:3128
HTTPS_PROXY=http://proxy.internal.example.com:3128

# NO_PROXY is critical - list all hosts that should NOT go through the proxy
# Include: TFE hostname, database, Redis, object storage endpoints,
# internal VCS, localhost, and internal networks
NO_PROXY="tfe.example.com,tfe-postgres.example.com,tfe-redis.example.com,.s3.amazonaws.com,gitlab.internal.example.com,localhost,127.0.0.1,10.0.0.0/8,172.16.0.0/12,169.254.169.254"
```

### Docker Compose with Proxy

```yaml
# docker-compose.yml with proxy configuration
version: "3.9"
services:
  tfe:
    image: images.releases.hashicorp.com/hashicorp/terraform-enterprise:latest
    environment:
      TFE_HOSTNAME: tfe.example.com
      HTTP_PROXY: http://proxy.internal.example.com:3128
      HTTPS_PROXY: http://proxy.internal.example.com:3128
      NO_PROXY: "tfe.example.com,localhost,127.0.0.1,10.0.0.0/8,169.254.169.254,.internal.example.com"
      # Note: Also configure Docker daemon proxy for image pulls
```

### Docker Daemon Proxy

TFE's Docker daemon also needs proxy configuration for pulling images:

```bash
# Create the Docker daemon proxy configuration
mkdir -p /etc/systemd/system/docker.service.d

cat > /etc/systemd/system/docker.service.d/http-proxy.conf << 'EOF'
[Service]
Environment="HTTP_PROXY=http://proxy.internal.example.com:3128"
Environment="HTTPS_PROXY=http://proxy.internal.example.com:3128"
Environment="NO_PROXY=localhost,127.0.0.1,10.0.0.0/8,registry.internal.example.com"
EOF

# Reload and restart Docker
systemctl daemon-reload
systemctl restart docker
```

## VPC Endpoints (AWS)

For enhanced security, use VPC endpoints to avoid sending traffic over the public internet:

```hcl
# S3 VPC endpoint (gateway type - no additional cost)
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = var.vpc_id
  service_name = "com.amazonaws.us-east-1.s3"

  route_table_ids = var.private_route_table_ids

  tags = {
    Name = "tfe-s3-endpoint"
  }
}

# KMS VPC endpoint (interface type)
resource "aws_vpc_endpoint" "kms" {
  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.us-east-1.kms"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = var.private_subnets
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
}

# STS VPC endpoint (needed for IAM role assumption)
resource "aws_vpc_endpoint" "sts" {
  vpc_id              = var.vpc_id
  service_name        = "com.amazonaws.us-east-1.sts"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = var.private_subnets
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
}
```

## Network Testing Script

Run this script to verify all network requirements before installation:

```bash
#!/bin/bash
# verify-tfe-network.sh
# Verify all network requirements for TFE installation

echo "=== TFE Network Requirements Verification ==="
echo ""

PASS=0
FAIL=0

check() {
  local DESC="$1"
  local CMD="$2"

  if eval "${CMD}" > /dev/null 2>&1; then
    echo "[PASS] ${DESC}"
    PASS=$((PASS + 1))
  else
    echo "[FAIL] ${DESC}"
    FAIL=$((FAIL + 1))
  fi
}

# DNS resolution
check "DNS resolves tfe.example.com" "nslookup tfe.example.com"

# Database connectivity
check "PostgreSQL reachable on port 5432" "nc -z -w5 tfe-postgres.example.com 5432"

# Redis connectivity
check "Redis reachable on port 6379" "nc -z -w5 tfe-redis.example.com 6379"

# Object storage
check "S3 endpoint reachable" "curl -s -o /dev/null -w '%{http_code}' --max-time 5 https://s3.us-east-1.amazonaws.com"

# HashiCorp services (non-air-gapped only)
check "HashiCorp releases reachable" "curl -s -o /dev/null -w '%{http_code}' --max-time 5 https://releases.hashicorp.com"
check "Terraform Registry reachable" "curl -s -o /dev/null -w '%{http_code}' --max-time 5 https://registry.terraform.io"
check "HashiCorp container registry reachable" "curl -s -o /dev/null -w '%{http_code}' --max-time 5 https://images.releases.hashicorp.com/v2/"

# VCS server
check "VCS server reachable" "nc -z -w5 gitlab.internal.example.com 443"

# SMTP
check "SMTP server reachable" "nc -z -w5 smtp.example.com 587"

# Identity provider
check "IdP reachable" "curl -s -o /dev/null -w '%{http_code}' --max-time 5 https://idp.example.com"

echo ""
echo "=== Results: ${PASS} passed, ${FAIL} failed ==="

if [ ${FAIL} -gt 0 ]; then
  echo "Fix the failed checks before proceeding with installation."
  exit 1
fi
```

## Summary

TFE network configuration comes down to making sure the right traffic can flow between the right components. Document every required connection, test them before installation, and provide your network team with the specific ports, protocols, and destinations they need to allow. Pay special attention to the NO_PROXY configuration if you use a proxy - missing entries there cause some of the hardest-to-debug connectivity issues. Use VPC endpoints where available to keep traffic private, and set up split-horizon DNS if users access TFE from both internal and external networks.
