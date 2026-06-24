# How to Set Kubeconfig Expiry in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Security, kubeconfig, DevOps

Description: Learn how to configure kubeconfig token expiry in Portainer Business Edition to enforce periodic re-authentication and improve cluster security.

## Introduction

Kubeconfig files downloaded from Portainer contain access tokens that grant kubectl access to your Kubernetes clusters. By default, these tokens may not expire, which poses a security risk if a kubeconfig file is leaked or lost. Portainer allows admins to set a maximum token lifetime, forcing users to periodically re-authenticate and download fresh kubeconfig files.

## Prerequisites

- Portainer
- Admin access to Portainer
- A Kubernetes environment connected to Portainer

## Why Set Kubeconfig Expiry?

- **Security**: Limits the window of exposure if credentials are compromised
- **Compliance**: Many security frameworks require periodic credential rotation
- **Access revocation**: Expired tokens become invalid, helping limit lingering access from old kubeconfig files
- **Operational control**: Forces users to fetch fresh kubeconfig files through Portainer on a regular basis

## Step 1: Navigate to Settings

1. Log into Portainer as an administrator.
2. From the left sidebar, click **Settings**.
3. Scroll to the **Kubernetes settings** section.

## Step 2: Configure Kubeconfig Expiry

1. In **Kubernetes settings**, find the **Kubeconfig expiry** dropdown.
2. Choose one of the supported durations:
   - `24h` - 1 day
   - `168h` - 7 days
   - `720h` - 30 days
   - `8640h` - 1 year
   - `0` - No expiry (not recommended for production)
3. Click **Save Kubernetes settings**.

## Step 3: Verify the Expiry Is Applied

After setting expiry, newly downloaded kubeconfigs will contain time-limited tokens. Existing kubeconfig files are not changed. You can verify this by inspecting a freshly downloaded kubeconfig:

```bash
# Download a fresh kubeconfig for environment 1

TOKEN=$(curl -s -X POST https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' | jq -r '.jwt')

curl -s --get \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: text/yaml" \
  --data-urlencode 'ids=[1]' \
  "https://portainer.example.com/api/kubernetes/config" \
  -o test-kubeconfig.yaml

# View the token field
grep 'token:' test-kubeconfig.yaml
```

The token is a JWT. Decode it to check its expiry:

```bash
# Decode the JWT to see expiry (exp claim)
TOKEN_VALUE=$(awk '/token:/{print $2}' test-kubeconfig.yaml)
PAYLOAD=$(printf '%s' "$TOKEN_VALUE" | cut -d'.' -f2 | tr '_-' '/+')

case $((${#PAYLOAD} % 4)) in
  2) PAYLOAD="${PAYLOAD}==" ;;
  3) PAYLOAD="${PAYLOAD}=" ;;
esac

# Decode the base64url-encoded JWT payload
printf '%s' "$PAYLOAD" | base64 -d 2>/dev/null | jq '{iat: .iat, exp: .exp}'   # Linux
# printf '%s' "$PAYLOAD" | base64 -D | jq '{iat: .iat, exp: .exp}'             # macOS

# Convert exp to human-readable date
EXP=$(printf '%s' "$PAYLOAD" | base64 -d 2>/dev/null | jq -r '.exp')           # Linux
# EXP=$(printf '%s' "$PAYLOAD" | base64 -D | jq -r '.exp')                      # macOS
date -d "@$EXP"                                                                 # Linux
# date -r "$EXP"                                                                # macOS
```

## Step 4: Handle Token Expiry in Workflows

When a token expires, kubectl commands return:

```text
error: You must be logged in to the server (Unauthorized)
```

Users must re-download their kubeconfig from Portainer. Automate this with a refresh script:

```bash
#!/bin/bash
# auto-refresh-kubeconfig.sh

PORTAINER_URL="https://portainer.example.com"
PORTAINER_USER="${PORTAINER_USER:-myuser}"
PORTAINER_PASS="${PORTAINER_PASS:-mypassword}"
ENDPOINT_ID="${ENDPOINT_ID:-1}"
KUBECONFIG_PATH="${HOME}/.kube/portainer.yaml"

echo "[$(date)] Refreshing kubeconfig from Portainer..."

# Authenticate
TOKEN=$(curl -s -X POST "${PORTAINER_URL}/api/auth" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${PORTAINER_USER}\",\"password\":\"${PORTAINER_PASS}\"}" | jq -r '.jwt')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "ERROR: Failed to authenticate with Portainer" >&2
  exit 1
fi

# Download kubeconfig
HTTP_STATUS=$(curl -s --get -o "$KUBECONFIG_PATH" -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: text/yaml" \
  --data-urlencode "ids=[${ENDPOINT_ID}]" \
  "${PORTAINER_URL}/api/kubernetes/config")

if [ "$HTTP_STATUS" = "200" ]; then
  echo "[$(date)] Kubeconfig refreshed successfully at $KUBECONFIG_PATH"
else
  echo "ERROR: Failed to download kubeconfig (HTTP $HTTP_STATUS)" >&2
  exit 1
fi
```

```bash
# Schedule the refresh before expiry
# If expiry is 24h, refresh every 20h to avoid interruption
# crontab -e
0 */20 * * * PORTAINER_USER=myuser PORTAINER_PASS=mypassword /opt/scripts/auto-refresh-kubeconfig.sh
```

## Best Practices for Kubeconfig Expiry

| Environment | Recommended Expiry |
|-------------|-------------------|
| Development | 7 days |
| Staging | 24 hours |
| Production | 24 hours |
| CI/CD pipelines | Use API tokens instead |

For CI/CD pipelines, prefer **Portainer API access tokens** over kubeconfig files, as they can be managed separately and revoked independently.

## Revoking Access Immediately

If a user's access needs to be revoked before the token expires:

1. Go to **Users** in Portainer admin.
2. Find the user and click their name.
3. Either **delete the user** or **remove their environment access**.
4. All future requests through Portainer using that user's kubeconfig or API credentials will be rejected.

Note: If the user account and environment access remain unchanged, already-downloaded kubeconfig files continue working until they expire, or until Portainer restarts. This is why short expiry windows are important.

## Conclusion

Setting kubeconfig expiry in Portainer is a simple but important security control. It limits the blast radius of credential exposure, enforces periodic re-authentication through Portainer, and helps meet compliance requirements. Combine short expiry windows with automated refresh scripts to maintain both security and developer productivity.
