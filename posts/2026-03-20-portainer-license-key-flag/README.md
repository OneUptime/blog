# How to Use the --license-key Flag for Portainer Business Edition

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Business Edition, License, CLI, Configuration

Description: Apply and manage your Portainer Business Edition license key using the --license-key flag and UI settings to unlock enterprise features.

## Introduction

Portainer Business Edition (BE) requires a license key to activate enterprise features including RBAC, LDAP/SSO authentication, activity logging, scheduled backups, and advanced Kubernetes management. This guide shows how to apply the license key at startup and manage it afterward.

## Obtaining a License Key

1. Purchase Portainer Business Edition at [portainer.io](https://www.portainer.io/pricing)
2. Log in to the Portainer customer portal
3. Navigate to **License Keys**
4. Copy your license key (the exact format varies by license type)

Free 3-node licenses are available without payment at [portainer.io/take-3](https://www.portainer.io/take-3).

## Step 1: Apply License at Startup

```bash
# Start Portainer BE with license key

docker run -d \
  -p 9000:9000 \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ee:latest \
  --license-key="<YOUR-LICENSE-KEY>"

# Note: Use portainer-ee (Enterprise Edition) image, not portainer-ce
```

## Step 2: Apply License via Environment Variable

As an alternative to the CLI flag:

```bash
# Set license as environment variable
docker run -d \
  -p 9000:9000 \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  -e PORTAINER_LICENSE_KEY="<YOUR-LICENSE-KEY>" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ee:latest
```

## Step 3: Apply License via Portainer UI

If Portainer is already running without a license:

1. Log in to Portainer
2. Go to **Licenses**
3. Click **Add license**
4. Enter your license key
5. Click **Submit**

## Step 4: Apply License via Docker Compose

```yaml
services:
  portainer:
    image: portainer/portainer-ee:latest
    container_name: portainer
    restart: unless-stopped
    command: --license-key=<YOUR-LICENSE-KEY>
    ports:
      - "9000:9000"
      - "9443:9443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data

volumes:
  portainer_data:
```

Or load it from a `.env` file:

```yaml
services:
  portainer:
    image: portainer/portainer-ee:latest
    container_name: portainer
    restart: unless-stopped
    environment:
      # Load from .env file: echo "PORTAINER_LICENSE_KEY=<YOUR-LICENSE-KEY>" > .env
      PORTAINER_LICENSE_KEY: "${PORTAINER_LICENSE_KEY}"
    ports:
      - "9000:9000"
      - "9443:9443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data

volumes:
  portainer_data:
```

## Step 5: Verify License Activation

```bash
# Check via Portainer API
TOKEN=$(curl -s -X POST http://localhost:9000/api/auth \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"yourpassword"}' | jq -r .jwt)

curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:9000/api/system/version | jq '{
  ServerVersion: .ServerVersion,
  ServerEdition: .ServerEdition,
  VersionSupport: .VersionSupport
}'

# Check license status
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:9000/api/licenses/info | jq '{
  valid: .valid,
  nodes: .nodes,
  expiresAt: .expiresAt,
  type: .type
}'

# In the UI: Licenses → shows applied licenses, expiry date, and node count
```

## Step 6: Update an Expired License

```bash
# Stop Portainer
docker stop portainer && docker rm portainer

# Apply new license key
docker run -d \
  -p 9000:9000 \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ee:latest \
  --license-key="<YOUR-NEW-LICENSE-KEY>"

# Or update via API without restart
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost:9000/api/licenses \
  -d '{"licenseKeys":["<YOUR-NEW-LICENSE-KEY>"]}'
```

## Step 7: Migrate License to New Portainer Instance

```bash
# Stop the old instance before reusing the license
docker stop portainer && docker rm portainer

# Start the new instance with the same license key
docker run -d \
  -p 9000:9000 \
  -p 9443:9443 \
  --name portainer-new \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data_new:/data \
  portainer/portainer-ee:latest \
  --license-key="<YOUR-LICENSE-KEY>"
```

## Step 8: Use License Key File

```bash
# Create a license key file
echo "<YOUR-LICENSE-KEY>" > /opt/portainer/license.key
chmod 600 /opt/portainer/license.key

# Read the key from the file at launch time
docker run -d \
  -p 9000:9000 \
  --name portainer \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  -e PORTAINER_LICENSE_KEY="$(cat /opt/portainer/license.key)" \
  portainer/portainer-ee:latest

# Or in a script:
LICENSE=$(cat /opt/portainer/license.key)
docker run -d \
  --name portainer \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  -e PORTAINER_LICENSE_KEY="$LICENSE" \
  portainer/portainer-ee:latest
```

## Step 9: Check Features Unlocked by License

After applying the license, verify BE features are available:

1. **RBAC**: **User-related** → **Teams** should be available
2. **Activity Logs**: **Logs** → **Activity** should be accessible
3. **Scheduled Backups**: **Settings** → **Backup Portainer** should show **Store in S3** and scheduling options
4. **LDAP/SSO**: **Settings** → **Authentication** should show OAuth/LDAP options

## Conclusion

Applying the Portainer Business Edition license key via `--license-key` at startup is one supported method for automated deployments. For production environments, keep the license key out of hard-coded configuration where possible by supplying it through `PORTAINER_LICENSE_KEY` or reading it from a protected local file at runtime. The license unlocks enterprise features including RBAC, LDAP/OAuth SSO, activity logs, and scheduled backups to S3.
