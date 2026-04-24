# How to Generate a Portainer Support Bundle

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Support, Diagnostic, Troubleshooting, Bug-report

Description: A guide to generating a Portainer support bundle for submitting to the Portainer team or for self-service diagnostics.

## Overview

When reporting issues to Portainer's support team or community, a support bundle provides all the diagnostic information needed to investigate the problem. It includes logs, system information, and configuration data (with sensitive information removed). This guide covers generating support bundles in Portainer Business Edition and manually collecting diagnostic information for CE users.

## Prerequisites

- Portainer CE or Business Edition
- Admin access to Portainer
- Docker CLI access to the host
- `curl` and `jq` installed for the API and JSON inspection examples

## Method 1: Support Bundle via Portainer BE UI

Portainer Business Edition includes a built-in support bundle generator:

1. Log in as admin
2. Navigate to **Settings**
3. Scroll down to **Portainer support**
4. Click **Download support bundle**
5. The bundle downloads as a `.tar.gz` file

The bundle contains diagnostic information about your Portainer installation, with passwords and other sensitive credentials removed.

## Method 2: Generate Support Bundle via API

```bash
PORTAINER_URL="https://portainer.example.com:9443"
API_KEY="your-admin-access-token"
OUTPUT_FILE="portainer-support-$(date +%Y%m%d-%H%M%S).tar.gz"

# Download support bundle (BE)

curl --fail --show-error --silent \
  -X POST \
  "${PORTAINER_URL}/api/support/download" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  --data '{}' \
  --output "${OUTPUT_FILE}"

echo "Support bundle saved: $(ls -lh "${OUTPUT_FILE}")"
```

## Method 3: Manual Diagnostic Collection (CE)

For Portainer CE on Linux Docker hosts, manually collect diagnostic information:

```bash
#!/bin/bash
# portainer-diagnostics.sh
OUTPUT_DIR="portainer-diag-$(date +%Y%m%d-%H%M%S)"
PORTAINER_CONTAINER="${PORTAINER_CONTAINER:-portainer}"
PORTAINER_DATA_VOLUME="${PORTAINER_DATA_VOLUME:-portainer_data}"

mkdir -p "${OUTPUT_DIR}"

echo "=== Collecting Portainer Diagnostics ==="

# Portainer version
echo "1. Portainer version..."
docker exec "${PORTAINER_CONTAINER}" /portainer --version \
  > "${OUTPUT_DIR}/portainer-version.txt" 2>&1

# Container info
echo "2. Container information..."
docker inspect "${PORTAINER_CONTAINER}" > "${OUTPUT_DIR}/portainer-inspect.json"

# Recent logs
echo "3. Portainer logs (last 500 lines)..."
docker logs "${PORTAINER_CONTAINER}" --tail 500 > "${OUTPUT_DIR}/portainer-logs.txt" 2>&1

# Docker version
echo "4. Docker version..."
docker version > "${OUTPUT_DIR}/docker-version.txt"
docker info > "${OUTPUT_DIR}/docker-info.txt"

# System info
echo "5. System information..."
uname -a > "${OUTPUT_DIR}/system-info.txt"
free -h >> "${OUTPUT_DIR}/system-info.txt"
df -h >> "${OUTPUT_DIR}/system-info.txt"

# Network config
echo "6. Network configuration..."
docker network ls > "${OUTPUT_DIR}/docker-networks.txt"
ss -tlnp > "${OUTPUT_DIR}/network-ports.txt"

# Database size
echo "7. Database info..."
docker run --rm \
  -v "${PORTAINER_DATA_VOLUME}:/data" \
  alpine du -sh /data/ > "${OUTPUT_DIR}/database-size.txt"

# Compress
tar czf "${OUTPUT_DIR}.tar.gz" "${OUTPUT_DIR}/"
rm -rf "${OUTPUT_DIR}"

echo "Diagnostics saved to: ${OUTPUT_DIR}.tar.gz"
```

```bash
chmod +x portainer-diagnostics.sh
./portainer-diagnostics.sh
```

## What to Include When Reporting Issues

```bash
PORTAINER_CONTAINER="portainer"

# System information
echo "OS:" "$(uname -a)"
echo "Docker:" "$(docker --version)"
echo "Portainer:" "$(docker exec "${PORTAINER_CONTAINER}" /portainer --version)"

# Portainer executable and arguments
docker inspect "${PORTAINER_CONTAINER}" | jq '.[0] | {Path, Args}'

# Environment variables (check for sensitive data first)
docker inspect "${PORTAINER_CONTAINER}" | jq '.[0].Config.Env'

# Port bindings
docker inspect "${PORTAINER_CONTAINER}" | jq '.[0].NetworkSettings.Ports'
```

## Sanitizing Sensitive Data Before Sharing

```bash
PORTAINER_CONTAINER="portainer"

# Remove passwords and tokens from logs before sharing
docker logs "${PORTAINER_CONTAINER}" 2>&1 \
  | sed 's/password=[^ ]*/password=REDACTED/gi' \
  | sed 's/token=[^ ]*/token=REDACTED/gi' \
  | sed 's/Bearer [A-Za-z0-9._-]*/Bearer REDACTED/g' \
  > portainer-sanitized-logs.txt
```

## Useful Diagnostic Commands

```bash
PORTAINER_DATA_VOLUME="portainer_data"
PORTAINER_URL="https://localhost:9443"

# Test Docker daemon connectivity
docker version --format '{{json .Server}}' | jq .

# Check Portainer API health
curl -sk "${PORTAINER_URL}/api/system/status" | jq .

# Verify volume mount
docker run --rm -v "${PORTAINER_DATA_VOLUME}:/data" alpine ls -la /data/
```

## Conclusion

Support bundles streamline the troubleshooting process by packaging all relevant diagnostic information in one place. Portainer BE makes this effortless with a one-click bundle download. CE users can use the manual script provided here to collect similar diagnostic information. Always sanitize logs to remove credentials and API tokens before sharing with external parties.
