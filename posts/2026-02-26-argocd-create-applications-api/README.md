# How to Create Applications via ArgoCD API

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, REST API, Automation

Description: Learn how to programmatically create ArgoCD applications using the REST API with examples for Helm, Kustomize, and plain YAML sources.

---

Creating applications programmatically through the ArgoCD API is essential for building self-service platforms, automating onboarding, and integrating ArgoCD into existing toolchains. The API gives you the same capabilities as the CLI and UI, but with the flexibility to embed application creation into any workflow or script.

## The Create Application Endpoint

The endpoint for creating applications is:

```
POST /api/v1/applications
```

It accepts a JSON body matching the ArgoCD Application spec. The response returns the created application with its assigned metadata (UID, creation timestamp, and default values).

## Creating a Basic Application

Here is the simplest possible application creation - a directory of plain YAML manifests:

```bash
curl -s -k -H "Authorization: Bearer $ARGOCD_TOKEN" \
  -X POST https://argocd.example.com/api/v1/applications \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "name": "nginx-demo",
      "namespace": "argocd"
    },
    "spec": {
      "project": "default",
      "source": {
        "repoURL": "https://github.com/myorg/k8s-manifests.git",
        "path": "nginx",
        "targetRevision": "main"
      },
      "destination": {
        "server": "https://kubernetes.default.svc",
        "namespace": "demo"
      },
      "syncPolicy": {
        "automated": {
          "prune": true,
          "selfHeal": true
        },
        "syncOptions": [
          "CreateNamespace=true"
        ]
      }
    }
  }'
```

Let us break down the key fields:

- **metadata.name** - Unique application name within the ArgoCD instance
- **spec.project** - The ArgoCD project this app belongs to
- **spec.source** - Where the manifests come from (Git repo, path, and revision)
- **spec.destination** - Where to deploy (cluster and namespace)
- **spec.syncPolicy** - Optional automated sync configuration

## Creating a Helm Application

To deploy a Helm chart, specify helm-specific source configuration:

```bash
curl -s -k -H "Authorization: Bearer $ARGOCD_TOKEN" \
  -X POST https://argocd.example.com/api/v1/applications \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "name": "redis-cache",
      "namespace": "argocd",
      "labels": {
        "team": "platform",
        "env": "production"
      }
    },
    "spec": {
      "project": "infrastructure",
      "source": {
        "repoURL": "https://charts.bitnami.com/bitnami",
        "chart": "redis",
        "targetRevision": "18.6.1",
        "helm": {
          "releaseName": "redis-cache",
          "values": "architecture: standalone\nauth:\n  enabled: true\n  password: changeme\nmaster:\n  resources:\n    requests:\n      memory: 256Mi\n      cpu: 100m\n    limits:\n      memory: 512Mi\n      cpu: 250m"
        }
      },
      "destination": {
        "server": "https://kubernetes.default.svc",
        "namespace": "redis"
      },
      "syncPolicy": {
        "automated": {
          "prune": true,
          "selfHeal": true
        },
        "syncOptions": [
          "CreateNamespace=true"
        ]
      }
    }
  }'
```

### Helm with Values from a Git Repo

For Helm charts that pull values from a separate repo, use multiple sources:

```bash
curl -s -k -H "Authorization: Bearer $ARGOCD_TOKEN" \
  -X POST https://argocd.example.com/api/v1/applications \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "name": "app-with-custom-values",
      "namespace": "argocd"
    },
    "spec": {
      "project": "default",
      "sources": [
        {
          "repoURL": "https://charts.bitnami.com/bitnami",
          "chart": "nginx",
          "targetRevision": "15.4.4",
          "helm": {
            "valueFiles": [
              "$values/envs/production/values.yaml"
            ]
          }
        },
        {
          "repoURL": "https://github.com/myorg/helm-values.git",
          "targetRevision": "main",
          "ref": "values"
        }
      ],
      "destination": {
        "server": "https://kubernetes.default.svc",
        "namespace": "web"
      }
    }
  }'
```

## Creating a Kustomize Application

For Kustomize-based applications:

```bash
curl -s -k -H "Authorization: Bearer $ARGOCD_TOKEN" \
  -X POST https://argocd.example.com/api/v1/applications \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "name": "api-service-prod",
      "namespace": "argocd",
      "labels": {
        "team": "backend",
        "env": "production"
      },
      "annotations": {
        "notifications.argoproj.io/subscribe.on-sync-succeeded.slack": "deployments"
      }
    },
    "spec": {
      "project": "backend",
      "source": {
        "repoURL": "https://github.com/myorg/api-service.git",
        "path": "deploy/overlays/production",
        "targetRevision": "main",
        "kustomize": {
          "namePrefix": "prod-",
          "images": [
            "myorg/api-service:v2.3.1"
          ],
          "commonLabels": {
            "managed-by": "argocd",
            "environment": "production"
          }
        }
      },
      "destination": {
        "server": "https://kubernetes.default.svc",
        "namespace": "api-production"
      },
      "syncPolicy": {
        "automated": {
          "prune": true,
          "selfHeal": true
        },
        "retry": {
          "limit": 3,
          "backoff": {
            "duration": "5s",
            "factor": 2,
            "maxDuration": "1m"
          }
        }
      }
    }
  }'
```

## Bulk Application Creation

When onboarding multiple services, create applications in bulk:

```bash
#!/bin/bash
# bulk-create.sh - Create multiple applications from a JSON config

ARGOCD_SERVER="https://argocd.example.com"

# Define applications in a JSON array
APPS='[
  {"name": "auth-service", "path": "services/auth", "namespace": "auth"},
  {"name": "user-service", "path": "services/users", "namespace": "users"},
  {"name": "order-service", "path": "services/orders", "namespace": "orders"},
  {"name": "payment-service", "path": "services/payments", "namespace": "payments"}
]'

echo "$APPS" | jq -c '.[]' | while read -r app; do
  NAME=$(echo "$app" | jq -r '.name')
  PATH_VAL=$(echo "$app" | jq -r '.path')
  NAMESPACE=$(echo "$app" | jq -r '.namespace')

  echo "Creating application: $NAME"

  RESPONSE=$(curl -s -k -w "\n%{http_code}" \
    -H "Authorization: Bearer $ARGOCD_TOKEN" \
    -X POST "$ARGOCD_SERVER/api/v1/applications" \
    -H "Content-Type: application/json" \
    -d "{
      \"metadata\": {
        \"name\": \"$NAME\",
        \"namespace\": \"argocd\"
      },
      \"spec\": {
        \"project\": \"microservices\",
        \"source\": {
          \"repoURL\": \"https://github.com/myorg/platform.git\",
          \"path\": \"$PATH_VAL\",
          \"targetRevision\": \"main\"
        },
        \"destination\": {
          \"server\": \"https://kubernetes.default.svc\",
          \"namespace\": \"$NAMESPACE\"
        },
        \"syncPolicy\": {
          \"automated\": {\"prune\": true, \"selfHeal\": true},
          \"syncOptions\": [\"CreateNamespace=true\"]
        }
      }
    }")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  if [ "$HTTP_CODE" = "200" ]; then
    echo "  Created successfully"
  else
    echo "  Failed with HTTP $HTTP_CODE"
    echo "$RESPONSE" | head -1 | jq -r '.message // .'
  fi
done
```

## Python Application Factory

For a more robust approach, use Python:

```python
import requests
import json

class AppFactory:
    def __init__(self, server, token):
        self.server = server.rstrip('/')
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

    def create_app(self, name, repo, path, namespace,
                   project="default", revision="main",
                   auto_sync=True, labels=None):
        """Create an ArgoCD application."""
        app = {
            "metadata": {
                "name": name,
                "namespace": "argocd",
                "labels": labels or {}
            },
            "spec": {
                "project": project,
                "source": {
                    "repoURL": repo,
                    "path": path,
                    "targetRevision": revision
                },
                "destination": {
                    "server": "https://kubernetes.default.svc",
                    "namespace": namespace
                }
            }
        }

        # Add auto-sync if requested
        if auto_sync:
            app["spec"]["syncPolicy"] = {
                "automated": {"prune": True, "selfHeal": True},
                "syncOptions": ["CreateNamespace=true"]
            }

        resp = requests.post(
            f"{self.server}/api/v1/applications",
            headers=self.headers,
            json=app,
            verify=False
        )

        if resp.status_code == 200:
            return resp.json()
        else:
            raise Exception(f"Failed to create {name}: {resp.text}")

# Usage
factory = AppFactory("https://argocd.example.com", token)

# Create an application
app = factory.create_app(
    name="my-new-service",
    repo="https://github.com/myorg/services.git",
    path="my-service/deploy",
    namespace="my-service",
    project="backend",
    labels={"team": "backend", "tier": "api"}
)
print(f"Created: {app['metadata']['name']}")
```

## Handling Creation Errors

Common errors when creating applications:

```bash
# Handle "already exists" error gracefully
RESPONSE=$(curl -s -k -H "Authorization: Bearer $ARGOCD_TOKEN" \
  -X POST https://argocd.example.com/api/v1/applications \
  -H "Content-Type: application/json" \
  -d "$APP_JSON")

if echo "$RESPONSE" | jq -e '.code == 6' > /dev/null 2>&1; then
  echo "Application already exists - use PATCH to update instead"

  # Update existing application
  APP_NAME=$(echo "$APP_JSON" | jq -r '.metadata.name')
  curl -s -k -H "Authorization: Bearer $ARGOCD_TOKEN" \
    -X PUT "https://argocd.example.com/api/v1/applications/$APP_NAME" \
    -H "Content-Type: application/json" \
    -d "$APP_JSON"
fi
```

## Upsert Pattern: Create or Update

Use the `upsert` parameter to create an application if it does not exist or update it if it does:

```bash
# Upsert - create or update
curl -s -k -H "Authorization: Bearer $ARGOCD_TOKEN" \
  -X POST "https://argocd.example.com/api/v1/applications?upsert=true" \
  -H "Content-Type: application/json" \
  -d "$APP_JSON"
```

This is particularly useful in CI/CD pipelines where you want idempotent operations - the same script can run multiple times without failing.

## Validating Before Creation

Use a dry-run approach by validating the application spec before creating it:

```bash
# Validate the application spec first
curl -s -k -H "Authorization: Bearer $ARGOCD_TOKEN" \
  -X POST "https://argocd.example.com/api/v1/applications?validate=true" \
  -H "Content-Type: application/json" \
  -d "$APP_JSON"
```

Creating applications via the ArgoCD API unlocks powerful automation patterns. From single-service deployments to multi-tenant onboarding platforms, the API lets you programmatically manage your entire GitOps application fleet. Combine it with project role tokens for secure CI/CD integration, and you have a solid foundation for self-service deployments.
