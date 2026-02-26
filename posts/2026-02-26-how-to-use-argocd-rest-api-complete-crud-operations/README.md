# How to Use ArgoCD REST API: Complete CRUD Operations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, API, Automation

Description: A complete guide to ArgoCD's REST API covering create, read, update, and delete operations for applications, projects, repositories, and clusters with practical curl examples.

---

ArgoCD ships with a powerful REST API that backs both the web UI and the CLI. Anything you can do through the UI or CLI, you can do through the API. This makes it the foundation for building custom tooling, automation pipelines, and integrations with other systems.

This post walks through every major CRUD operation against the ArgoCD API using practical curl examples that you can adapt to your own environment.

## Authentication

Before making any API calls, you need an authentication token. There are two ways to get one: through the login endpoint or by creating an API key for a local account.

```bash
# Method 1: Login with username/password to get a bearer token
TOKEN=$(curl -s -k https://argocd.company.com/api/v1/session \
  -d '{"username":"admin","password":"your-password"}' \
  | jq -r '.token')

# Method 2: Generate a long-lived API token for automation
# First, create a local account in argocd-cm
# Then generate a token via CLI
argocd account generate-token --account automation-bot

# Use the token in all subsequent requests
AUTH_HEADER="Authorization: Bearer $TOKEN"
ARGOCD_URL="https://argocd.company.com"
```

For production automation, always use dedicated service accounts with limited RBAC permissions rather than the admin account.

## Application Operations

### Create an Application

```bash
# Create a new ArgoCD application
curl -s -k -X POST "$ARGOCD_URL/api/v1/applications" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "name": "my-web-app",
      "namespace": "argocd"
    },
    "spec": {
      "project": "default",
      "source": {
        "repoURL": "https://github.com/company/k8s-configs",
        "targetRevision": "main",
        "path": "apps/web-app"
      },
      "destination": {
        "server": "https://kubernetes.default.svc",
        "namespace": "web-app"
      },
      "syncPolicy": {
        "automated": {
          "prune": true,
          "selfHeal": true
        },
        "syncOptions": ["CreateNamespace=true"]
      }
    }
  }' | jq '.'
```

### List Applications

```bash
# List all applications
curl -s -k "$ARGOCD_URL/api/v1/applications" \
  -H "$AUTH_HEADER" | jq '.items[] | {name: .metadata.name, status: .status.sync.status}'

# Filter by project
curl -s -k "$ARGOCD_URL/api/v1/applications?projects=production" \
  -H "$AUTH_HEADER" | jq '.items[].metadata.name'

# Filter by label selector
curl -s -k "$ARGOCD_URL/api/v1/applications?selector=team%3Dbackend" \
  -H "$AUTH_HEADER" | jq '.items[].metadata.name'
```

### Get a Specific Application

```bash
# Get full application details
curl -s -k "$ARGOCD_URL/api/v1/applications/my-web-app" \
  -H "$AUTH_HEADER" | jq '.'

# Get just the sync status
curl -s -k "$ARGOCD_URL/api/v1/applications/my-web-app" \
  -H "$AUTH_HEADER" | jq '{
    sync: .status.sync.status,
    health: .status.health.status,
    revision: .status.sync.revision
  }'
```

### Update an Application

```bash
# Update an application's target revision
# First, get the current spec
CURRENT=$(curl -s -k "$ARGOCD_URL/api/v1/applications/my-web-app" \
  -H "$AUTH_HEADER")

# Modify and PUT back the full spec
echo "$CURRENT" | jq '.spec.source.targetRevision = "release-v2"' | \
  curl -s -k -X PUT "$ARGOCD_URL/api/v1/applications/my-web-app" \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    -d @- | jq '.metadata.name, .spec.source.targetRevision'
```

### Patch an Application

For partial updates, use the PATCH endpoint.

```bash
# Patch just the target revision without sending the entire spec
curl -s -k -X PATCH "$ARGOCD_URL/api/v1/applications/my-web-app" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/merge-patch+json" \
  -d '{
    "spec": {
      "source": {
        "targetRevision": "release-v2"
      }
    }
  }' | jq '.spec.source.targetRevision'
```

### Delete an Application

```bash
# Delete an application (with cascade - also deletes managed resources)
curl -s -k -X DELETE "$ARGOCD_URL/api/v1/applications/my-web-app?cascade=true" \
  -H "$AUTH_HEADER" | jq '.'

# Delete without cascade (keeps the Kubernetes resources)
curl -s -k -X DELETE "$ARGOCD_URL/api/v1/applications/my-web-app?cascade=false" \
  -H "$AUTH_HEADER" | jq '.'
```

## Sync Operations

### Trigger a Sync

```bash
# Trigger a sync for an application
curl -s -k -X POST "$ARGOCD_URL/api/v1/applications/my-web-app/sync" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{
    "revision": "main",
    "prune": true,
    "strategy": {
      "apply": {
        "force": false
      }
    },
    "syncOptions": {
      "items": ["ServerSideApply=true"]
    }
  }' | jq '.status'
```

### Sync Specific Resources

```bash
# Sync only specific resources within an application
curl -s -k -X POST "$ARGOCD_URL/api/v1/applications/my-web-app/sync" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{
    "resources": [
      {
        "group": "apps",
        "kind": "Deployment",
        "name": "web-frontend"
      }
    ]
  }' | jq '.status'
```

## Repository Operations

### Add a Repository

```bash
# Add a Git repository with HTTPS credentials
curl -s -k -X POST "$ARGOCD_URL/api/v1/repositories" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{
    "repo": "https://github.com/company/k8s-configs",
    "username": "git-user",
    "password": "github-token",
    "type": "git"
  }' | jq '{repo: .repo, connectionState: .connectionState}'

# Add a repository with SSH key
curl -s -k -X POST "$ARGOCD_URL/api/v1/repositories" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{
    "repo": "git@github.com:company/k8s-configs.git",
    "sshPrivateKey": "'"$(cat ~/.ssh/argocd_deploy_key)"'",
    "type": "git"
  }' | jq '{repo: .repo, connectionState: .connectionState}'
```

### List Repositories

```bash
# List all configured repositories
curl -s -k "$ARGOCD_URL/api/v1/repositories" \
  -H "$AUTH_HEADER" | jq '.items[] | {repo: .repo, status: .connectionState.status}'
```

### Delete a Repository

```bash
# Delete a repository (URL must be URL-encoded)
REPO_URL=$(python3 -c "import urllib.parse; print(urllib.parse.quote('https://github.com/company/old-repo', safe=''))")
curl -s -k -X DELETE "$ARGOCD_URL/api/v1/repositories/$REPO_URL" \
  -H "$AUTH_HEADER" | jq '.'
```

## Cluster Operations

### Add a Cluster

```bash
# Register a new cluster
curl -s -k -X POST "$ARGOCD_URL/api/v1/clusters" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{
    "server": "https://staging-cluster.company.com:6443",
    "name": "staging-cluster",
    "config": {
      "bearerToken": "eyJhbGciOi...",
      "tlsClientConfig": {
        "insecure": false,
        "caData": "LS0tLS1CRUdJTi..."
      }
    },
    "labels": {
      "env": "staging",
      "region": "us-east"
    }
  }' | jq '{name: .name, server: .server, connectionState: .connectionState}'
```

### List Clusters

```bash
# List all registered clusters
curl -s -k "$ARGOCD_URL/api/v1/clusters" \
  -H "$AUTH_HEADER" | jq '.items[] | {name: .name, server: .server, status: .connectionState.status}'
```

### Delete a Cluster

```bash
# Remove a cluster (URL-encode the server URL)
SERVER_URL=$(python3 -c "import urllib.parse; print(urllib.parse.quote('https://staging-cluster.company.com:6443', safe=''))")
curl -s -k -X DELETE "$ARGOCD_URL/api/v1/clusters/$SERVER_URL" \
  -H "$AUTH_HEADER" | jq '.'
```

## Project Operations

### Create a Project

```bash
# Create a new AppProject
curl -s -k -X POST "$ARGOCD_URL/api/v1/projects" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{
    "project": {
      "metadata": {
        "name": "team-backend"
      },
      "spec": {
        "description": "Backend team applications",
        "sourceRepos": ["https://github.com/company/backend-configs"],
        "destinations": [
          {
            "server": "https://kubernetes.default.svc",
            "namespace": "backend-*"
          }
        ],
        "clusterResourceWhitelist": [
          {"group": "", "kind": "Namespace"}
        ],
        "namespaceResourceBlacklist": [
          {"group": "", "kind": "ResourceQuota"},
          {"group": "", "kind": "LimitRange"}
        ]
      }
    }
  }' | jq '.metadata.name'
```

### List and Get Projects

```bash
# List all projects
curl -s -k "$ARGOCD_URL/api/v1/projects" \
  -H "$AUTH_HEADER" | jq '.items[].metadata.name'

# Get a specific project with details
curl -s -k "$ARGOCD_URL/api/v1/projects/team-backend" \
  -H "$AUTH_HEADER" | jq '.'
```

## Working with the Application Resource Tree

The resource tree endpoint gives you a detailed view of every Kubernetes resource managed by an application.

```bash
# Get the full resource tree
curl -s -k "$ARGOCD_URL/api/v1/applications/my-web-app/resource-tree" \
  -H "$AUTH_HEADER" | jq '.nodes[] | {kind: .kind, name: .name, health: .health.status}'

# Get managed resources list
curl -s -k "$ARGOCD_URL/api/v1/applications/my-web-app/managed-resources" \
  -H "$AUTH_HEADER" | jq '.items[] | {kind: .kind, name: .name, status: .status}'
```

## Error Handling

The API returns standard HTTP status codes. Always check for errors in your automation scripts.

```bash
# Wrapper function with error handling
argocd_api() {
  local method=$1 endpoint=$2 data=$3
  local response status_code

  response=$(curl -s -k -w "\n%{http_code}" -X "$method" \
    "$ARGOCD_URL$endpoint" \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    ${data:+-d "$data"})

  status_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | sed '$d')

  if [ "$status_code" -ge 400 ]; then
    echo "ERROR ($status_code): $(echo "$body" | jq -r '.message // .error // "Unknown error"')" >&2
    return 1
  fi

  echo "$body"
}

# Usage
argocd_api GET "/api/v1/applications/my-web-app"
argocd_api POST "/api/v1/applications/my-web-app/sync" '{"prune": true}'
```

## Wrapping Up

ArgoCD's REST API provides complete programmatic control over every aspect of the system. The patterns shown here - authentication, CRUD for applications, repositories, clusters, and projects, plus sync operations and resource tree queries - form the building blocks for any custom integration. Whether you are building a deployment dashboard, a Slack bot, or a CI/CD pipeline integration, the REST API gives you everything you need. For more advanced use cases, check out [how to build custom dashboards using the ArgoCD API](https://oneuptime.com/blog/post/2026-02-26-how-to-create-custom-dashboards-using-argocd-api/view).
