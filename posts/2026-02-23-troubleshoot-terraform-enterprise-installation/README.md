# How to Troubleshoot Terraform Enterprise Installation Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terraform Enterprise, Troubleshooting, Installation, DevOps, Operations

Description: A troubleshooting guide for common Terraform Enterprise installation problems, including container startup failures, database connectivity, certificate errors, and health check failures.

---

Installing Terraform Enterprise should be straightforward, but the number of moving parts - Docker, PostgreSQL, Redis, object storage, TLS certificates, DNS, and licensing - means there are many places where things can go wrong. Most installation failures fall into a handful of categories, and knowing how to diagnose them quickly saves hours of frustration.

This guide covers the most common TFE installation issues and how to fix them.

## Pre-Installation Verification

Before starting the installation, verify all prerequisites:

```bash
# Check Docker version (minimum 20.10)
docker --version

# Verify Docker is running
docker info > /dev/null 2>&1 && echo "Docker is running" || echo "Docker is NOT running"

# Check available disk space (minimum 50GB recommended)
df -h /var/lib/docker

# Check available memory (minimum 8GB, 16GB recommended)
free -h

# Check CPU cores (minimum 4)
nproc

# Verify DNS resolution
nslookup tfe.example.com

# Test outbound connectivity (for non-air-gapped installs)
curl -s -o /dev/null -w "%{http_code}" https://images.releases.hashicorp.com
```

## Problem: Container Fails to Start

### Symptoms

```bash
# Container exits immediately or keeps restarting
docker ps -a
# Shows: STATUS = Exited (1) or Restarting

docker logs tfe | tail -50
```

### Common Causes and Fixes

#### Missing or Invalid License

```bash
# Check for license-related errors
docker logs tfe 2>&1 | grep -i license

# Fix: Verify the license is set correctly
echo "${TFE_LICENSE}" | head -c 50
# Should show the beginning of a valid license string

# If using a file, verify it exists and is readable
ls -la /opt/tfe/license.rli
cat /opt/tfe/license.rli | head -c 50
```

#### Missing Required Environment Variables

```bash
# Check which required variables are set
env | grep TFE_ | sort

# Minimum required variables:
# TFE_HOSTNAME
# TFE_LICENSE or TFE_LICENSE_PATH
# TFE_ENCRYPTION_PASSWORD
# TFE_DATABASE_HOST (for external database)
# TFE_DATABASE_USER
# TFE_DATABASE_PASSWORD
# TFE_DATABASE_NAME

# Check for typos in variable names
docker logs tfe 2>&1 | grep -i "required\|missing\|invalid"
```

#### Port Conflicts

```bash
# Check if ports 443 and 80 are already in use
ss -tlnp | grep -E ':443|:80'

# If another service is using the ports, stop it or change TFE's ports
# Common offenders: nginx, apache, another container

# Fix: Stop the conflicting service
systemctl stop nginx
# Or change TFE's port mapping in docker-compose.yml
```

## Problem: Database Connection Failures

### Symptoms

```bash
docker logs tfe 2>&1 | grep -i "database\|postgres\|connection refused"
# Common messages:
# "could not connect to server: Connection refused"
# "FATAL: password authentication failed"
# "FATAL: database does not exist"
```

### Diagnosis and Fixes

```bash
# Test PostgreSQL connectivity from the TFE host
psql -h tfe-postgres.example.com -U tfe_admin -d tfe -c "SELECT 1;"

# If using Docker, test from inside the network
docker run --rm -it postgres:15 \
  psql -h tfe-postgres.example.com -U tfe_admin -d tfe -c "SELECT 1;"

# Common fixes:

# 1. Database does not exist - create it
PGPASSWORD="${DB_ADMIN_PASSWORD}" psql -h tfe-postgres.example.com -U postgres -c \
  "CREATE DATABASE tfe OWNER tfe_admin;"

# 2. User does not exist - create it
PGPASSWORD="${DB_ADMIN_PASSWORD}" psql -h tfe-postgres.example.com -U postgres -c \
  "CREATE USER tfe_admin WITH PASSWORD 'your-password';"

# 3. Missing extensions
PGPASSWORD="${DB_ADMIN_PASSWORD}" psql -h tfe-postgres.example.com -U postgres -d tfe -c \
  "CREATE EXTENSION IF NOT EXISTS citext;
   CREATE EXTENSION IF NOT EXISTS hstore;
   CREATE EXTENSION IF NOT EXISTS uuid-ossp;"

# 4. Security group / firewall rules
# Verify the TFE host IP can reach PostgreSQL on port 5432
nc -zv tfe-postgres.example.com 5432

# 5. SSL/TLS requirements
# Some databases require SSL connections
TFE_DATABASE_PARAMETERS="sslmode=require"
```

## Problem: TLS Certificate Issues

### Symptoms

```bash
docker logs tfe 2>&1 | grep -i "tls\|certificate\|ssl\|x509"
# Common messages:
# "tls: failed to find any PEM data in certificate input"
# "x509: certificate is not valid for any names"
# "x509: certificate has expired or is not yet valid"
```

### Diagnosis and Fixes

```bash
# Verify the certificate file is valid PEM format
openssl x509 -in /opt/tfe/certs/tfe.crt -noout -text | head -15

# Check the certificate matches the hostname
openssl x509 -in /opt/tfe/certs/tfe.crt -noout -subject -issuer

# Check certificate expiration
openssl x509 -in /opt/tfe/certs/tfe.crt -noout -dates

# Verify the private key matches the certificate
openssl x509 -noout -modulus -in /opt/tfe/certs/tfe.crt | md5sum
openssl rsa -noout -modulus -in /opt/tfe/certs/tfe.key | md5sum
# These hashes MUST match

# Verify the chain is complete
openssl verify -CAfile /opt/tfe/certs/ca-bundle.crt /opt/tfe/certs/tfe.crt

# Common fixes:

# 1. Wrong certificate order in the chain file
# Order should be: server cert, intermediate(s), root CA
cat server.crt intermediate.crt > tfe-fullchain.crt

# 2. Key file has wrong permissions
chmod 600 /opt/tfe/certs/tfe.key
chown root:root /opt/tfe/certs/tfe.key

# 3. Certificate is PEM but has extra whitespace or wrong line endings
dos2unix /opt/tfe/certs/tfe.crt
```

## Problem: Health Check Fails

### Symptoms

```bash
curl -v https://tfe.example.com/_health_check
# Returns non-200 status or connection refused

# Check from inside the container
docker exec tfe curl -s localhost:443/_health_check
```

### Diagnosis

```bash
# Get detailed health check output
curl -s https://tfe.example.com/_health_check | jq .

# Check which component is failing
# Example output:
# {
#   "passed": false,
#   "checks": {
#     "database": "ok",
#     "redis": "failed",
#     "vault": "ok",
#     "object_storage": "ok"
#   }
# }

# For each failing component, test connectivity individually:

# Database
docker exec tfe pg_isready -h tfe-postgres.example.com -p 5432

# Redis
docker exec tfe redis-cli -h tfe-redis.example.com -p 6379 ping

# Object storage (S3)
docker exec tfe aws s3 ls s3://tfe-objects/ --max-items 1
```

## Problem: Object Storage Connectivity

### Symptoms

```bash
docker logs tfe 2>&1 | grep -i "storage\|s3\|bucket\|blob"
# Common messages:
# "AccessDenied"
# "NoSuchBucket"
# "SignatureDoesNotMatch"
```

### Diagnosis and Fixes

```bash
# Test S3 access from the TFE host
aws s3 ls s3://tfe-objects/ --region us-east-1

# Test write access
echo "test" | aws s3 cp - s3://tfe-objects/test.txt
aws s3 rm s3://tfe-objects/test.txt

# Common fixes:

# 1. Wrong bucket name or region
TFE_OBJECT_STORAGE_S3_BUCKET=tfe-objects   # Check exact name
TFE_OBJECT_STORAGE_S3_REGION=us-east-1     # Must match actual region

# 2. IAM permissions insufficient
# Verify the IAM role/user has the required S3 permissions
aws sts get-caller-identity

# 3. S3 endpoint not reachable (VPC endpoint issues)
# Test the S3 endpoint directly
curl -v https://tfe-objects.s3.us-east-1.amazonaws.com/

# 4. For MinIO or S3-compatible storage
TFE_OBJECT_STORAGE_S3_ENDPOINT=https://minio.internal.example.com
TFE_OBJECT_STORAGE_S3_USE_PATH_STYLE=true
```

## Problem: DNS Resolution Issues

```bash
# Test DNS from the host
nslookup tfe.example.com
dig tfe.example.com

# Test from inside the Docker network
docker run --rm alpine nslookup tfe.example.com

# If DNS is not resolving, check:
# 1. DNS server configuration
cat /etc/resolv.conf

# 2. Docker DNS configuration
docker network inspect bridge | jq '.[0].IPAM.Config'

# 3. If using custom DNS in Docker
# Add to docker-compose.yml:
# dns:
#   - 10.0.1.2
#   - 10.0.1.3
```

## Problem: Slow Installation or Timeouts

```bash
# Check Docker pull speed
time docker pull images.releases.hashicorp.com/hashicorp/terraform-enterprise:latest

# If the pull is slow or fails, check:
# 1. Proxy configuration
env | grep -i proxy

# 2. Docker proxy settings
cat /etc/docker/daemon.json

# 3. Disk I/O performance
iostat -x 1 5

# 4. Memory pressure
vmstat 1 5
```

## Collecting Diagnostic Information

When reaching out to HashiCorp support, gather this information:

```bash
#!/bin/bash
# collect-tfe-diagnostics.sh
# Gather diagnostic information for HashiCorp support

DIAG_DIR="/tmp/tfe-diagnostics-$(date +%Y%m%d)"
mkdir -p "${DIAG_DIR}"

# System information
uname -a > "${DIAG_DIR}/system-info.txt"
free -h >> "${DIAG_DIR}/system-info.txt"
df -h >> "${DIAG_DIR}/system-info.txt"
nproc >> "${DIAG_DIR}/system-info.txt"

# Docker information
docker version > "${DIAG_DIR}/docker-version.txt"
docker info > "${DIAG_DIR}/docker-info.txt"
docker ps -a > "${DIAG_DIR}/docker-ps.txt"

# TFE logs (last 1000 lines)
docker logs tfe --tail 1000 > "${DIAG_DIR}/tfe-logs.txt" 2>&1

# Network information
ip addr > "${DIAG_DIR}/network.txt"
ss -tlnp >> "${DIAG_DIR}/network.txt"

# TFE configuration (redact sensitive values)
env | grep TFE_ | sed 's/PASSWORD=.*/PASSWORD=REDACTED/' | sed 's/SECRET=.*/SECRET=REDACTED/' | sed 's/LICENSE=.*/LICENSE=REDACTED/' > "${DIAG_DIR}/tfe-env.txt"

# Health check
curl -s https://tfe.example.com/_health_check > "${DIAG_DIR}/health-check.json" 2>&1

# Create archive
tar czf "${DIAG_DIR}.tar.gz" "${DIAG_DIR}"
echo "Diagnostics collected: ${DIAG_DIR}.tar.gz"
```

## Summary

Most TFE installation issues fall into a few categories: database connectivity, certificate problems, object storage permissions, and missing configuration. The troubleshooting approach is always the same - check the TFE container logs first, identify which component is failing, test that component individually, and fix the specific issue. Having the pre-installation verification checklist and diagnostic collection script ready saves significant time when things go wrong. If you get stuck, HashiCorp support can help, but they will need the diagnostic information to assist effectively.
