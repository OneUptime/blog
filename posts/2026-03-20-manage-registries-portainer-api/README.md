# How to Manage Registries via the Portainer API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Container Registry, Automation, DevOps

Description: Learn how to add, update, and manage container registries in Portainer programmatically using the REST API.

## Registry Management Endpoints

| Method | Endpoint | Action |
|--------|----------|--------|
| GET | `/api/registries` | List all registries |
| GET | `/api/registries/{id}` | Get registry details |
| POST | `/api/registries` | Add a new registry |
| PUT | `/api/registries/{id}` | Update a registry |
| DELETE | `/api/registries/{id}` | Remove a registry |

## Listing Registries

```bash
# List all configured registries

curl -s "${PORTAINER_URL}/api/registries" \
  -H "X-API-Key: ${API_TOKEN}" | \
  jq '[.[] | {id: .Id, name: .Name, url: .URL, type: .Type}]'
```

Registry types:
- **1** = Quay.io
- **2** = Azure Container Registry
- **3** = Custom registry
- **4** = GitLab
- **5** = ProGet
- **6** = Docker Hub
- **7** = AWS ECR
- **8** = GitHub Container Registry (GHCR, Portainer Business Edition)

## Adding a Custom Registry

```bash
# Add a private registry with authentication
curl -X POST "${PORTAINER_URL}/api/registries" \
  -H "X-API-Key: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "Type": 3,
    "Name": "My Private Registry",
    "URL": "registry.mycompany.com",
    "TLS": true,
    "Authentication": true,
    "Username": "myuser",
    "Password": "mypassword"
  }'
```

## Adding Docker Hub (Authenticated)

```bash
# Add Docker Hub with credentials to avoid rate limiting
curl -X POST "${PORTAINER_URL}/api/registries" \
  -H "X-API-Key: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "Type": 6,
    "Name": "Docker Hub",
    "URL": "docker.io",
    "Authentication": true,
    "Username": "my-dockerhub-username",
    "Password": "dckr_pat_mytoken"
  }'
```

## Adding AWS ECR

```bash
# Add Amazon ECR registry using IAM credentials
curl -X POST "${PORTAINER_URL}/api/registries" \
  -H "X-API-Key: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "Type": 7,
    "Name": "AWS ECR Production",
    "URL": "123456789012.dkr.ecr.us-east-1.amazonaws.com",
    "Authentication": true,
    "Username": "AKIAIOSFODNN7EXAMPLE",
    "Password": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    "Ecr": {
      "Region": "us-east-1"
    }
  }'
```

## Updating AWS ECR Credentials

```bash
# Update the stored AWS credentials for an existing ECR registry
curl -X PUT "${PORTAINER_URL}/api/registries/${ECR_REGISTRY_ID}" \
  -H "X-API-Key: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "Name": "AWS ECR Production",
    "URL": "123456789012.dkr.ecr.us-east-1.amazonaws.com",
    "Authentication": true,
    "Username": "AKIAIOSFODNN7EXAMPLE",
    "Password": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    "Ecr": {
      "Region": "us-east-1"
    }
  }'
```

## Assigning a Registry to an Environment

```bash
# Kubernetes example: grant the "production" namespace access to a registry
curl -X PUT "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/registries/${REGISTRY_ID}" \
  -H "X-API-Key: ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "Namespaces": ["production"]
  }'
```

## Deleting a Registry

```bash
# Remove a registry from Portainer
curl -X DELETE "${PORTAINER_URL}/api/registries/${REGISTRY_ID}" \
  -H "X-API-Key: ${API_TOKEN}"
```

## Conclusion

The Portainer registries API enables centralized registry management for multi-environment setups. For AWS ECR, provide the AWS access key ID, secret access key, and region rather than the output of `aws ecr get-login-password`, since ECR authorization tokens expire every 12 hours.
