# How to Troubleshoot Registry Authentication Issues in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Registry, Authentication, Troubleshooting, DevOps

Description: A systematic guide to diagnosing and fixing container registry authentication failures in Portainer.

## Introduction

Registry authentication failures are some of the most common errors when deploying containers through Portainer. The errors can be cryptic and the causes range from expired tokens to network issues to configuration mistakes. This guide provides a systematic approach to diagnosing and fixing registry authentication problems.

## Common Error Messages

```bash
# Docker Hub authentication failure

Error: pull access denied for myorg/myimage, repository does not exist or may require 'docker login'

# Private registry auth failure
Error: Get https://registry.company.com/v2/: dial tcp: connect: connection refused

# Invalid credentials
Error: unauthorized: incorrect username or password

# Token expired (ECR)
Error: no basic auth credentials

# SSL certificate issue
Error: x509: certificate signed by unknown authority

# Rate limit exceeded
Error: toomanyrequests: You have reached your pull rate limit
```

## Step 1: Identify the Registry Type

First, determine which registry is failing:

```bash
# Check the image reference to identify the registry
IMAGE=myorg/myimage:latest                                      # Docker Hub
IMAGE=registry.company.com/project/myimage:latest               # Private custom registry
IMAGE=123456789012.dkr.ecr.us-east-1.amazonaws.com/myimage:latest # AWS ECR
IMAGE=myregistry.azurecr.io/myimage:latest                      # Azure ACR
IMAGE=gcr.io/my-project/myimage:latest                          # Google Container Registry
IMAGE=us-west1-docker.pkg.dev/my-project/myrepo/myimage:latest  # Google Artifact Registry
IMAGE=ghcr.io/myorg/myimage:latest                              # GitHub GHCR
IMAGE=registry.gitlab.com/group/project/myimage:latest          # GitLab
```

## Step 2: Test Registry Connectivity

```bash
# Basic connectivity test
curl -i https://registry.company.com/v2/

# Expected responses:
# 200 OK: Registry is up and auth is not required
# 401 Unauthorized: Registry is up, auth is required (normal)
# 404 Not Found: Wrong URL or not a v2 registry endpoint
# 000 or connection refused: Registry is down, blocked, or wrong URL
# 403 Forbidden: Request reached the endpoint but access is being blocked by a proxy or policy
```

## Step 3: Test Credentials Directly

```bash
# Custom Docker Registry-compatible registry with basic auth
curl -i -u "username:password" https://registry.company.com/v2/

# Docker Hub - use a personal access token, not your account password
printf '%s' "$DOCKERHUB_PAT" | docker login --username username --password-stdin

# AWS ECR HTTP API - use an authorization token
REPOSITORY=myimage
TOKEN=$(aws ecr get-authorization-token --output text --query 'authorizationData[].authorizationToken')
curl -i -H "Authorization: Basic $TOKEN" \
  https://123456789012.dkr.ecr.us-east-1.amazonaws.com/v2/$REPOSITORY/tags/list

# Azure ACR - test the exact username/password with docker login
printf '%s' "$ACR_PASSWORD" | docker login myregistry.azurecr.io \
  --username "$ACR_USERNAME" --password-stdin
```

## Step 4: Test with Docker Login

```bash
# Test the exact credentials Portainer would use
printf '%s' 'mypassword' | docker login registry.company.com \
  --username portainer-user \
  --password-stdin

# If this fails, the issue is in your credentials, not Portainer
```

## Step 5: Check Credentials in Portainer

1. Go to **Registries** in Portainer
2. Click **Edit** on the failing registry
3. Re-enter the password/token (Portainer shows asterisks, not the actual value)
4. Click **Save**

Common mistakes to check:

- Extra spaces before/after the username or password
- Token or password copied incompletely, or pasted with hidden whitespace
- Wrong username format (e.g., Harbor robot accounts use `robot$`; GitLab deploy tokens usually use `gitlab+deploy-token-<n>` unless you set a custom username)
- Token vs password mixed up (for example, Docker Hub in Portainer expects a personal access token)

## Step 6: Diagnose SSL/TLS Issues

```bash
# Check SSL certificate chain
openssl s_client -connect registry.company.com:443 \
  -servername registry.company.com

# Check certificate expiry
echo | openssl s_client -connect registry.company.com:443 2>/dev/null | \
  openssl x509 -noout -dates

# If self-signed: add CA cert to Docker
sudo mkdir -p /etc/docker/certs.d/registry.company.com
sudo cp ca.crt /etc/docker/certs.d/registry.company.com/ca.crt
sudo systemctl restart docker
```

## Step 7: Diagnose Token Expiration (ECR/ACR)

ECR authorization tokens expire every 12 hours:

```bash
# Get a fresh ECR password and test it immediately
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789012.dkr.ecr.us-east-1.amazonaws.com

# If this works but Portainer still fails, check how the registry was added:
# - AWS ECR registry in Portainer: verify AWS Access Key, Secret Access Key,
#   region, and IAM permissions
# - Custom registry pointing at ECR: refresh the temporary ECR password/token

# Azure ACR - check registry connectivity and local auth prerequisites
az acr check-health -n myregistry -y
# If you use a service principal, also verify its secret is still valid and it
# still has pull access to the registry (for example, AcrPull or the equivalent
# repository reader role)
```

## Step 8: Check DNS Resolution

```bash
# Run these on the Docker host or the Portainer Agent node
nslookup registry.company.com
dig registry.company.com
```

If DNS fails from the Docker host, images cannot be pulled.

## Step 9: Check Firewall and Network Access

```bash
# Test TCP connectivity to registry port
nc -zv registry.company.com 443

# From the Docker host (not just your workstation)
# Docker pulls happen from the Docker daemon, not from your client machine
curl --max-time 5 https://registry.company.com/v2/
```

## Step 10: Check Docker Daemon Configuration

```bash
# Verify insecure registries are configured (for HTTP registries)
docker info | grep -A5 "Insecure Registries"

# Check /etc/docker/daemon.json
cat /etc/docker/daemon.json
```

For an HTTP registry, ensure:

```json
{
  "insecure-registries": ["registry.company.com:5000"]
}
```

## Step 11: View Portainer Agent/Server Logs

```bash
# Check Portainer server logs for auth-related errors
docker logs portainer 2>&1 | grep -i "registry\|auth\|unauthorized" | tail -20
```

## Step 12: Verify Image Name Format

Common image name mistakes:

```bash
# Correct formats:
myimage:latest                                           # Docker Hub, official
myorg/myimage:v1.0                                       # Docker Hub, user/org image
registry.company.com/project/myimage:latest              # Private registry
123456.dkr.ecr.us-east-1.amazonaws.com/myimage:latest   # AWS ECR (full URL)

# Wrong formats (common mistakes):
https://registry.company.com/myimage    # Don't include https://
registry.company.com//myimage           # Double slash
```

## Diagnostic Checklist

```bash
[ ] Registry URL is correct (no trailing slash, correct port)
[ ] Username is correct (for example, Harbor robot accounts use `robot$`; GitLab deploy tokens use their deploy-token username)
[ ] Password/token is current (not expired)
[ ] Network connectivity to registry from Docker host
[ ] DNS resolves correctly
[ ] SSL certificate is valid or CA cert is installed
[ ] For HTTP registries: insecure-registries is configured
[ ] Image name format is correct
[ ] Repository exists and user has read access
```

## Conclusion

Registry authentication failures follow predictable patterns. Work through the diagnostic steps systematically: verify connectivity, test credentials directly, check token expiration, and ensure SSL certificates are properly configured. Most issues fall into a handful of categories: expired tokens, wrong credentials, network connectivity, or SSL certificate problems. With this guide, you can quickly identify and resolve the root cause.
