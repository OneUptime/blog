# How to Migrate from Portainer CE to Business Edition

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Migration, Business Edition, Upgrade, Enterprise

Description: Step-by-step guide to upgrading from Portainer Community Edition to Business Edition to unlock advanced features like RBAC, Edge Computing, and SSO.

## Introduction

Portainer Business Edition (BE) extends the Community Edition with features like enhanced RBAC, SSO/LDAP integration, Edge Computing management, and priority support. The migration preserves all existing data-users, environments, stacks, and configurations-making the upgrade seamless.

## Key Differences: CE vs BE

| Feature | CE | BE |
|---------|----|----|
| Environments | Unlimited | Unlimited |
| Users | Unlimited | Unlimited |
| Teams/RBAC | Basic | Advanced |
| SSO (OAuth/LDAP) | Basic | Advanced (AD/OAuth templates, group-to-team sync) |
| Edge Computing | Basic | Advanced |
| Custom Roles | No | Yes |
| Registry Management | Basic | Advanced |
| Priority Support | No | Yes |
| Activity Logs | Basic | Full |

## Prerequisites

- Existing Portainer CE installation
- Portainer BE license key (obtain from portainer.io)
- Backup of Portainer CE data

## Step 1: Backup Portainer CE Data

```bash
# Always backup before upgrading

docker stop portainer

docker run --rm \
  -v portainer_data:/data \
  -v /tmp/portainer-ce-backup:/backup \
  alpine tar czf /backup/portainer-ce-backup-$(date +%Y%m%d).tar.gz -C /data .

echo "Backup complete: $(ls -lh /tmp/portainer-ce-backup/)"

# Restart CE while you prepare for migration
docker start portainer
```

## Step 2: Pull the Business Edition Image

```bash
# Pull the Portainer BE image (same major version as your CE)
docker pull portainer/portainer-ee:latest

# Check available versions
docker run --rm portainer/portainer-ee:latest --version
```

## Step 3: Stop CE and Start BE

The data volume is fully compatible between CE and BE:

```bash
# Stop Portainer CE
docker stop portainer
docker rm portainer

# Start Portainer BE using the same data volume
docker run -d \
  --name portainer \
  --restart=always \
  -p 8000:8000 \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ee:latest

# Verify startup
docker logs portainer -f
```

## Step 4: Apply the License Key

```bash
# Access Portainer BE at https://your-host:9443
# Navigate to Settings > Licenses
# Enter your BE license key

# Or via API
curl -X POST \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"licenseKeys": ["your-be-license-key"]}' \
  "https://portainer.example.com/api/licenses"
```

## Step 5: Configure BE-Exclusive Features

### Setting Up LDAP/AD Authentication

```bash
# Configure via API
curl -X PUT \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "AuthenticationMethod": 2,
    "LDAPSettings": {
      "AnonymousMode": false,
      "ReaderDN": "cn=portainer,dc=example,dc=com",
      "Password": "ldap-service-password",
      "URL": "ldap://ad.example.com:389",
      "SearchSettings": [{
        "BaseDN": "dc=example,dc=com",
        "Filter": "(&(objectclass=user)(sAMAccountName={username}))",
        "UserNameAttribute": "sAMAccountName"
      }],
      "GroupSearchSettings": [{
        "GroupBaseDN": "dc=example,dc=com",
        "GroupFilter": "(member={dn})",
        "GroupAttribute": "cn"
      }]
    }
  }' \
  "https://portainer.example.com/api/settings"
```

### Configuring Custom Roles

```bash
# Create a custom role (BE only)
curl -X POST \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Deploy Only",
    "authorizations": {
      "PortainerDockerContainerCreateUpdate": true,
      "PortainerDockerContainerDelete": false,
      "PortainerDockerStackCreate": true,
      "PortainerDockerStackDelete": false
    }
  }' \
  "https://portainer.example.com/api/roles"
```

## Step 6: Verify Migration

```bash
# Verify all environments are intact
curl -s -H "X-API-Key: your-api-key" \
  "https://portainer.example.com/api/endpoints" | python3 -m json.tool

# Verify all stacks are running
curl -s -H "X-API-Key: your-api-key" \
  "https://portainer.example.com/api/stacks" \
  | python3 -c "
import sys, json
stacks = json.load(sys.stdin)
for s in stacks:
    print(f'{s[\"Name\"]}: status={s[\"Status\"]}')
"

# Check license status
curl -s -H "X-API-Key: your-api-key" \
  "https://portainer.example.com/api/licenses" | python3 -m json.tool
```

## Rolling Back to CE (If Needed)

```bash
# Stop BE
docker stop portainer && docker rm portainer

# Restore CE backup
docker run --rm \
  -v portainer_data:/data \
  -v /tmp/portainer-ce-backup:/backup \
  alpine sh -c "rm -rf /data/* && tar xzf /backup/portainer-ce-backup-*.tar.gz -C /data"

# Start CE
docker run -d \
  --name portainer \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

## Conclusion

Upgrading from Portainer CE to Business Edition is a straightforward process that preserves all existing configurations and data. The upgrade unlocks enterprise features like LDAP authentication, custom roles, advanced RBAC, and enhanced Edge Computing capabilities. With a proper backup, the migration carries minimal risk and can be quickly rolled back if needed.
