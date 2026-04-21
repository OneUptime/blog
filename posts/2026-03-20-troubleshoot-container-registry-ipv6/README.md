# How to Troubleshoot Container Registry IPv6 Access Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, IPv6, Container Registry, Troubleshooting, Networking, DevOps

Description: Diagnose and resolve container registry access failures over IPv6, covering DNS resolution, TLS errors, firewall issues, and Docker daemon configuration problems.

---

Container registry IPv6 failures manifest as pull errors, authentication failures, or TLS certificate issues. This guide provides a systematic troubleshooting approach for Docker, Podman, and Kubernetes environments.

## Step 1: Verify Basic IPv6 Connectivity

```bash
# Check IPv6 is functional

ip -6 addr show | grep "scope global"
ping -6 -c 4 2001:4860:4860::8888

# Check default IPv6 route
ip -6 route show default

# Test connectivity to registry hostname
ping -6 -c 4 registry.example.com
```

## Step 2: Verify DNS Resolution

```bash
# Check AAAA record for registry
dig AAAA registry.example.com +short

# If no AAAA record, force IPv4 or add the record
# You can also use the IPv6 IP directly: [2001:db8::1]:5000

# Verify from inside Docker
docker run --rm alpine nslookup -type=AAAA registry.example.com

# Verify Docker's DNS resolves to IPv6
docker run --rm curlimages/curl \
  sh -c "curl -6 https://registry.example.com/v2/ 2>&1"
```

## Step 3: Test Registry Connectivity

```bash
# Test HTTPS to registry over IPv6
curl -6 -v https://registry.example.com/v2/ 2>&1

# Test with authentication
curl -6 -u "username:password" \
  https://registry.example.com/v2/ 2>&1

# Test Docker Hub over IPv6
curl -6 https://registry-1.docker.io/v2/ 2>&1

# Direct port test
nc -6 -z -w 5 registry.example.com 443 && echo "Port 443 open"
```

## Step 4: Diagnose TLS/Certificate Errors

```bash
# Check TLS certificate details
openssl s_client -connect '[2001:db8::1]':443 \
  -servername registry.example.com < /dev/null 2>&1 | \
  openssl x509 -noout -text | grep -E "Subject:|Issuer:|Not After:|Alt"

# Common errors:
# "x509: certificate signed by unknown authority"
# Fix: Add CA certificate to Docker trust store
sudo mkdir -p /etc/docker/certs.d/registry.example.com
sudo cp ca.crt /etc/docker/certs.d/registry.example.com/

# "x509: certificate is valid for X, not registry.example.com"
# Fix: Certificate SAN doesn't match; use matching hostname
```

## Step 5: Check Docker Daemon Configuration

```bash
# View Docker daemon configuration
docker info | grep -i "registry\|ipv6\|proxy"

# Check daemon.json
sudo cat /etc/docker/daemon.json

# Verify IPv6 is enabled in Docker
docker info | grep "IPv6\|ipv6"

# Check insecure registries configuration
docker info | grep "Insecure Registries" -A 10
```

## Step 6: Check Firewall Rules

```bash
# Check IPv6 firewall allows outbound to registry ports
sudo ip6tables -L OUTPUT -n | grep -E "443|5000|8082"

# Check if connection tracking is allowing return traffic
sudo ip6tables -L FORWARD -n | grep "ESTABLISHED\|RELATED"

# Temporarily set default policies to ACCEPT to test unmatched traffic (revert after testing)
sudo ip6tables -P INPUT ACCEPT
sudo ip6tables -P OUTPUT ACCEPT
sudo ip6tables -P FORWARD ACCEPT
```

## Step 7: Debug Docker Pull Failure

```bash
# Run docker pull with debug output
docker --debug pull registry.example.com/myapp:latest

# Check Docker daemon logs
sudo journalctl -u docker --since "10 minutes ago" | grep -i "error\|registry\|ipv6"

# Use containerd directly for detailed errors
ctr --debug images pull registry.example.com/myapp:latest
```

## Common Error Messages and Solutions

```bash
# Error: "Get https://registry.example.com/v2/: dial tcp: lookup registry.example.com: no such host"
# Cause: DNS is not resolving the registry name, or no AAAA record exists when forcing IPv6
# Fix: Correct DNS, add an AAAA record, or use an IPv6 literal if TLS configuration permits it
docker pull [2001:db8::1]:5000/myapp:latest

# Error: "Get https://registry.example.com/v2/: dial tcp [2001:db8::1]:443: connect: connection refused"
# Cause: Registry not listening on IPv6 port 443
# Fix: Configure registry to listen on IPv6

# Error: "unauthorized: authentication required"
# Cause: Credentials not sent or expired
docker login registry.example.com
docker pull registry.example.com/myapp:latest

# Error: "toomanyrequests: Rate Limit Exceeded"
# Cause: Docker Hub rate limiting (separate from IPv6)
docker login  # Authenticated pulls have higher limits
```

## Kubernetes Registry Pull Troubleshooting

```bash
# Check imagePullSecrets for private registry access
kubectl get secret regcred -n default -o yaml

# Check pod events for image pull errors
kubectl describe pod mypod | grep -A 20 "Events:"

# Test from within the cluster
kubectl run debug --rm -it \
  --restart=Never \
  --image=curlimages/curl \
  -- curl -6 https://registry.example.com/v2/

# Check node IPv6 routing
kubectl get nodes -o wide
ssh node1 "ip -6 route show && curl -6 https://registry.example.com/v2/"
```

Structured troubleshooting - from basic connectivity and DNS through TLS, firewall, and daemon configuration - resolves the majority of container registry IPv6 access failures efficiently.
