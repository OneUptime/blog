# How to Set Up Tenant-Specific Registries in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Registry, Multi-Tenancy, Team, Docker Hub, Private Registry

Description: Learn how to configure tenant-specific Docker registries in Portainer so each team can only access their own images and registry credentials.

---

In multi-tenant Portainer deployments, different teams often have their own private registries or separate organizational accounts. Portainer allows you to add multiple registries and restrict access to specific teams within each environment so tenants cannot use each other's registries or credentials.

## Adding a Registry in Portainer

Go to **Registries > Add registry** and select the registry type:

- **DockerHub** - requires username and access token
- **AWS ECR** - uses IAM credentials
- **GitLab Container Registry** - uses a username and personal access token with `read_api` and `read_registry` scopes
- **Custom** - any Docker-compatible registry

## Configuring Registry Access per Team

After adding a registry, restrict which teams can use it in a specific environment:

1. Open the target environment, then go to **Host > Registries**, **Swarm > Registries**, or **Cluster > Registries**.
2. Find the registry and click **Manage access**.
3. Under **Teams access**, add only the teams that should have access to that environment.
4. Teams not listed will not see or be able to use this registry in that environment.

## Registry Setup Example: Two Tenants

Configure two separate registries for two tenant teams:

```bash
TOKEN="your-admin-jwt-token"
PORTAINER="https://portainer.example.com"
ENDPOINT_ID="1"
TEAM_A_ID="2"

# Add Tenant A's registry

REG_A_ID=$(curl -s -X POST "$PORTAINER/api/registries" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "Name": "Tenant A Registry",
    "Type": 3,
    "URL": "registry-a.example.com",
    "Authentication": true,
    "Username": "tenant-a-user",
    "Password": "tenant-a-token"
  }' | jq -r .Id)

# Restrict it to Team A on a specific environment
curl -s -X PUT "$PORTAINER/api/endpoints/$ENDPOINT_ID/registries/$REG_A_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"TeamAccessPolicies\": {\"$TEAM_A_ID\": {\"RoleId\": 1}}}"
```

## AWS ECR Per-Tenant Configuration

For teams using separate AWS accounts with ECR, add one registry entry per account:

```bash
# Tenant A uses AWS account 111122223333
curl -s -X POST "$PORTAINER/api/registries" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "Name": "Tenant A ECR",
    "Type": 7,
    "URL": "111122223333.dkr.ecr.us-east-1.amazonaws.com",
    "Authentication": true,
    "Username": "<access-key-id>",
    "Password": "<secret-access-key>",
    "Ecr": {
      "Region": "us-east-1"
    }
  }'
```

ECR authorization tokens expire every 12 hours, and Portainer refreshes them automatically when it needs to access the registry.

## Self-Hosted Registry per Tenant

Deploy a separate TLS-enabled registry container for each tenant for full isolation:

```yaml
# Tenant A registry stack
services:
  registry-a:
    image: registry:3
    environment:
      REGISTRY_HTTP_SECRET: tenant-a-secret
      REGISTRY_HTTP_TLS_CERTIFICATE: /certs/domain.crt
      REGISTRY_HTTP_TLS_KEY: /certs/domain.key
      REGISTRY_AUTH: htpasswd
      REGISTRY_AUTH_HTPASSWD_REALM: "Tenant A Registry"
      REGISTRY_AUTH_HTPASSWD_PATH: /auth/htpasswd
    volumes:
      - registry_a_data:/var/lib/registry
      - ./auth:/auth
      - ./certs:/certs:ro
    ports:
      - "5001:5000"   # Different port per tenant

volumes:
  registry_a_data:
```

Generate htpasswd credentials:

```bash
docker run --rm --entrypoint htpasswd httpd:2 -Bbn tenant-a-user "securepassword" > auth/htpasswd
```

## Verifying Registry Isolation

Log in as a Tenant A user and verify they can only see and use Tenant A's registry:

```bash
TENANT_A_TOKEN=$(curl -s -X POST "$PORTAINER/api/auth" \
  -H 'Content-Type: application/json' \
  -d '{"Username":"alice","Password":"pass"}' | jq -r .jwt)

# This should only return registries Tenant A can use on this environment
curl -s -H "Authorization: Bearer $TENANT_A_TOKEN" \
  "$PORTAINER/api/endpoints/$ENDPOINT_ID/registries" | jq '.[].Name'
```

Tenant A users cannot see or use Tenant B's registry credentials in that environment, even if they know the registry URL.
