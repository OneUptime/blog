# How to Audit Container Security with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Security, Audit, Compliance, Container Security

Description: Audit running containers for security misconfigurations, exposed ports, privileged settings, and vulnerable images using Portainer and security scanning tools.

## Introduction

A security audit of your container environment identifies risks before attackers do. Common findings include containers running as root, exposed management ports, privileged containers, missing resource limits, and vulnerable base images. This guide covers comprehensive auditing using built-in Docker commands, Docker Bench Security, and Portainer's inspection capabilities.

## Step 1: Run Docker Bench for Security

Docker Bench is a CIS Docker Benchmark audit tool. Build the image locally first, because the published `docker/docker-bench-security` image is out of date:

```bash
# Build Docker Bench for Security locally
git clone https://github.com/docker/docker-bench-security.git
cd docker-bench-security
docker build --no-cache -t docker-bench-security .

# Run Docker Bench for Security
docker run --rm \
  --net host \
  --pid host \
  --userns host \
  --cap-add audit_control \
  -e DOCKER_CONTENT_TRUST=$DOCKER_CONTENT_TRUST \
  -v /etc:/etc:ro \
  -v /usr/bin/containerd:/usr/bin/containerd:ro \
  -v /usr/bin/runc:/usr/bin/runc:ro \
  -v /usr/lib/systemd:/usr/lib/systemd:ro \
  -v /var/lib:/var/lib:ro \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  --label docker_bench_security \
  docker-bench-security

# Save console output to file
docker run --rm \
  --net host \
  --pid host \
  --userns host \
  --cap-add audit_control \
  -e DOCKER_CONTENT_TRUST=$DOCKER_CONTENT_TRUST \
  -v /etc:/etc:ro \
  -v /usr/bin/containerd:/usr/bin/containerd:ro \
  -v /usr/bin/runc:/usr/bin/runc:ro \
  -v /usr/lib/systemd:/usr/lib/systemd:ro \
  -v /var/lib:/var/lib:ro \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  --label docker_bench_security \
  docker-bench-security > /tmp/docker-bench-$(date +%Y%m%d).txt
```

## Step 2: Audit Running Containers for Common Issues

```bash
#!/bin/bash
# container-audit.sh - Comprehensive container security audit

echo "=============================="
echo "CONTAINER SECURITY AUDIT REPORT"
echo "Date: $(date)"
echo "=============================="

# Check 1: Privileged containers
echo ""
echo "=== PRIVILEGED CONTAINERS (HIGH RISK) ==="
docker ps -q | while read id; do
  name=$(docker inspect "$id" --format '{{.Name}}')
  privs=$(docker inspect "$id" --format '{{.HostConfig.Privileged}}')
  if [ "$privs" = "true" ]; then
    echo "CRITICAL: $name is running in privileged mode"
  fi
done

# Check 2: Containers running as root
echo ""
echo "=== CONTAINERS RUNNING AS ROOT ==="
docker ps -q | while read id; do
  name=$(docker inspect "$id" --format '{{.Name}}')
  user=$(docker inspect "$id" --format '{{.Config.User}}')
  if [ -z "$user" ] || [ "$user" = "root" ] || [ "$user" = "0" ]; then
    echo "WARNING: $name running as root (User: '$user')"
  fi
done

# Check 3: Docker socket mounts
echo ""
echo "=== DOCKER SOCKET MOUNTS (HIGH RISK) ==="
docker ps -q | while read id; do
  name=$(docker inspect "$id" --format '{{.Name}}')
  mounts=$(docker inspect "$id" --format '{{json .Mounts}}')
  if echo "$mounts" | grep -q "docker.sock"; then
    echo "HIGH: $name has Docker socket mounted"
  fi
done

# Check 4: Containers without resource limits
echo ""
echo "=== CONTAINERS WITHOUT MEMORY LIMITS ==="
docker ps -q | while read id; do
  name=$(docker inspect "$id" --format '{{.Name}}')
  mem=$(docker inspect "$id" --format '{{.HostConfig.Memory}}')
  if [ "$mem" = "0" ]; then
    echo "WARNING: $name has no memory limit"
  fi
done

# Check 5: Containers without no-new-privileges
echo ""
echo "=== CONTAINERS ALLOWING PRIVILEGE ESCALATION ==="
docker ps -q | while read id; do
  name=$(docker inspect "$id" --format '{{.Name}}')
  sec=$(docker inspect "$id" --format '{{.HostConfig.SecurityOpt}}')
  if ! echo "$sec" | grep -q "no-new-privileges"; then
    echo "WARNING: $name lacks no-new-privileges"
  fi
done

echo ""
echo "=== AUDIT COMPLETE ==="
```

## Step 3: Check for Exposed Sensitive Ports

```bash
# List all containers with exposed ports
echo "=== EXPOSED PORTS ==="
docker ps --format "table {{.Names}}\t{{.Ports}}" | sort

# Check for containers publishing sensitive container ports to all interfaces
docker ps -q | while read id; do
  name=$(docker inspect "$id" --format '{{.Name}}')
  ports=$(docker inspect "$id" --format '{{json .NetworkSettings.Ports}}')

  # Check for database and search service ports published externally
  for port in 5432 3306 27017 6379 9200 2181; do
    if echo "$ports" | jq -e --arg port "$port/tcp" '.[$port][]? | select(.HostIp=="0.0.0.0" or .HostIp=="::")' >/dev/null 2>&1; then
      echo "CRITICAL: $name publishes container port $port to all interfaces"
    fi
  done
done
```

## Step 4: Audit Image Vulnerabilities

```bash
# Scan all running container images
echo "=== IMAGE VULNERABILITY SCAN ==="
docker ps --format "{{.Image}}" | sort -u | while read image; do
  echo "Scanning: $image"

  # Count critical and high CVEs
  result=$(trivy image --quiet --scanners vuln --format json "$image" 2>/dev/null)
  critical=$(echo "$result" | jq '[.Results[].Vulnerabilities[]? | select(.Severity=="CRITICAL")] | length' 2>/dev/null || echo 0)
  high=$(echo "$result" | jq '[.Results[].Vulnerabilities[]? | select(.Severity=="HIGH")] | length' 2>/dev/null || echo 0)

  echo "  Critical: $critical, High: $high"

  if [ "$critical" -gt 0 ]; then
    echo "  CRITICAL ACTION REQUIRED: $image has $critical critical CVEs"
  fi
done
```

## Step 5: Check Network Exposure

```bash
# Audit network configurations
echo "=== NETWORK AUDIT ==="

# List all networks and check for internal flag
docker network ls --format "{{.Name}}" | while read net; do
  internal=$(docker network inspect "$net" --format '{{.Internal}}')
  driver=$(docker network inspect "$net" --format '{{.Driver}}')
  containers=$(docker network inspect "$net" --format '{{len .Containers}}')
  echo "Network: $net | Driver: $driver | Internal: $internal | Containers: $containers"
done

# Find containers on the default bridge (less secure than custom networks)
echo ""
echo "=== CONTAINERS ON DEFAULT BRIDGE ==="
docker network inspect bridge --format '{{range .Containers}}{{.Name}} {{end}}'
```

## Step 6: Generate HTML Audit Report

```bash
#!/bin/bash
# generate-audit-report.sh

REPORT_FILE="/tmp/security-audit-$(date +%Y%m%d-%H%M%S).html"

cat > "$REPORT_FILE" << 'HTML'
<!DOCTYPE html>
<html>
<head><title>Container Security Audit</title>
<style>
  body { font-family: monospace; padding: 20px; }
  .critical { color: red; font-weight: bold; }
  .warning { color: orange; }
  .ok { color: green; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
</style>
</head>
<body>
<h1>Container Security Audit</h1>
HTML

echo "<p>Generated: $(date)</p>" >> "$REPORT_FILE"
echo "<h2>Running Containers</h2><table>" >> "$REPORT_FILE"
echo "<tr><th>Name</th><th>Image</th><th>User</th><th>Privileged</th><th>Memory Limit</th></tr>" >> "$REPORT_FILE"

docker ps -q | while read id; do
  name=$(docker inspect "$id" --format '{{.Name}}')
  image=$(docker inspect "$id" --format '{{.Config.Image}}')
  user=$(docker inspect "$id" --format '{{.Config.User}}')
  privs=$(docker inspect "$id" --format '{{.HostConfig.Privileged}}')
  mem=$(docker inspect "$id" --format '{{.HostConfig.Memory}}')

  priv_class=$([ "$privs" = "true" ] && echo "critical" || echo "ok")
  user_class=$([ -z "$user" ] && echo "warning" || echo "ok")

  echo "<tr><td>$name</td><td>$image</td><td class='$user_class'>$user</td><td class='$priv_class'>$privs</td><td>$mem</td></tr>"
done >> "$REPORT_FILE"

echo "</table></body></html>" >> "$REPORT_FILE"
echo "Report saved to: $REPORT_FILE"
```

## Conclusion

Regular security audits catch configuration drift before it becomes a breach. Docker Bench for Security provides CIS-benchmark-based checks for your host and containers. Custom audit scripts let you check organization-specific policies. The most critical items to check are privileged containers, containers with Docker socket mounts, databases exposed to all interfaces, containers without resource limits, and containers running as root. Run audits on a schedule - at least weekly in production - and integrate them into your CI/CD pipeline. In Portainer, you can review container details in the Inspect view and use webhooks for supported redeploy or update workflows.
