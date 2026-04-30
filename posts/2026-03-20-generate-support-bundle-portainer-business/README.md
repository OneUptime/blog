# How to Generate a Support Bundle in Portainer Business Edition

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Business Edition, Support, Troubleshooting, Diagnostic

Description: Learn how to generate a Portainer Business Edition support bundle containing diagnostic information for escalating issues to Portainer support.

---

When troubleshooting complex issues in Portainer BE, the support team may request a support bundle - a compressed archive of troubleshooting information about your Portainer installation that helps Portainer support investigate the issue.

## What's in a Support Bundle

A Portainer support bundle contains diagnostic information about your Portainer installation that can be provided to the Portainer support team to aid in troubleshooting issues.

Sensitive data such as passwords and other sensitive credentials is removed before the bundle is generated.

## Generate a Support Bundle via the UI

### Method 1: Settings Menu (BE)

1. Log in as an administrator
2. Navigate to **Settings**
3. Scroll to **Portainer support**
4. Optionally enable **Password Protect** and set a password
5. Click **Download support bundle** to download the resulting `.tar.gz` file

## Generate via API

```bash
# Create an access token in Portainer first:
# My account -> Access tokens

PORTAINER_URL="https://localhost:9443"
API_KEY="your_portainer_access_token"

# Generate and download support bundle
curl -fsS -X POST \
  "${PORTAINER_URL}/api/support/download" \
  -H "X-API-Key: ${API_KEY}" \
  --output "portainer_support_bundle_$(date +%Y%m%d_%H%M%S).tar.gz" \
  --insecure

echo "Support bundle downloaded"
ls -lh portainer_support_bundle_*.tar.gz
```

## Manual Log Collection

If the support bundle feature is unavailable, manually collect the required information:

```bash
#!/bin/bash
# collect-portainer-diagnostics.sh

OUTPUT_DIR="portainer_diagnostics_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$OUTPUT_DIR"

echo "Collecting Portainer diagnostics..."

# Container logs (last 1000 lines)
docker logs --tail 1000 portainer > "$OUTPUT_DIR/portainer.log" 2>&1

# Container inspect
docker inspect portainer > "$OUTPUT_DIR/container_inspect.json"

# Docker info
docker info > "$OUTPUT_DIR/docker_info.txt" 2>&1

# Container stats snapshot
docker stats portainer --no-stream > "$OUTPUT_DIR/container_stats.txt"

# Portainer version via API
curl -sk https://localhost:9443/api/system/status > "$OUTPUT_DIR/portainer_status.json"

# System info
uname -a > "$OUTPUT_DIR/system_info.txt"
free -h >> "$OUTPUT_DIR/system_info.txt"
df -h >> "$OUTPUT_DIR/system_info.txt"

# Compress everything
tar czf "${OUTPUT_DIR}.tar.gz" "$OUTPUT_DIR"
rm -rf "$OUTPUT_DIR"

echo "Diagnostics bundle: ${OUTPUT_DIR}.tar.gz"
ls -lh "${OUTPUT_DIR}.tar.gz"
```

## Sharing the Support Bundle

When sending the bundle to Portainer support:
- Open a ticket at https://www.portainer.io/get-support-for-portainer
- Attach the bundle file (or provide a download link)
- Include a description of the issue and steps to reproduce
- Note your Portainer version and deployment type

---

*Proactively monitor your Portainer infrastructure with [OneUptime](https://oneuptime.com) before issues require support escalation.*
