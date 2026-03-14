# How to Build a Platform API on Top of Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Platform Engineering, Platform API, REST API

Description: Build a platform API that wraps Flux CD for developer self-service, providing a simple HTTP interface over complex GitOps operations.

---

## Introduction

Not all developers are comfortable with Git-native workflows. Some teams use internal tools, ticketing systems, or custom CLIs that expect a REST API rather than a pull request. A platform API that wraps Flux CD bridges this gap: it accepts simple HTTP requests, translates them into Git commits or Kubernetes object updates, and lets Flux handle the reconciliation.

The platform API becomes the abstraction layer that lets your GitOps internals evolve without changing the developer-facing interface. You can migrate from Kustomize to Helm, change your repository structure, or add policy validation — none of it breaks the API contract that developers and other tools depend on.

In this guide you will build a lightweight platform API service that can trigger Flux reconciliations, check deployment status, and manage simple lifecycle operations through HTTP endpoints.

## Prerequisites

- Flux CD v2 bootstrapped in your cluster
- Kubernetes cluster with RBAC configured
- A place to host an API service (Kubernetes deployment)
- Basic familiarity with Kubernetes API and service accounts

## Step 1: Design the Platform API Surface

Keep the API surface small and focused on the operations developers actually need.

```
POST   /api/v1/deploy                  - Deploy or update an application
GET    /api/v1/deploy/{name}/status    - Get deployment status
POST   /api/v1/deploy/{name}/restart   - Rolling restart
POST   /api/v1/deploy/{name}/sync      - Force Flux reconciliation
DELETE /api/v1/deploy/{name}           - Remove a deployment
GET    /api/v1/catalog                 - List available platform templates
GET    /api/v1/health                  - API health check
```

## Step 2: Create a Service Account with Flux Permissions

The platform API needs permission to read and patch Flux objects.

```yaml
# platform-api/rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: platform-api
  namespace: platform-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: platform-api
rules:
  # Read Flux source and kustomize objects
  - apiGroups: ["source.toolkit.fluxcd.io"]
    resources: ["gitrepositories", "ocirepositories", "helmrepositories"]
    verbs: ["get", "list", "watch", "patch"]
  - apiGroups: ["kustomize.toolkit.fluxcd.io"]
    resources: ["kustomizations"]
    verbs: ["get", "list", "watch", "create", "patch", "delete"]
  - apiGroups: ["helm.toolkit.fluxcd.io"]
    resources: ["helmreleases"]
    verbs: ["get", "list", "watch", "create", "patch", "delete"]
  # Read deployments and pods for status
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "watch", "patch"]
  - apiGroups: [""]
    resources: ["pods", "events"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: platform-api
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: platform-api
subjects:
  - kind: ServiceAccount
    name: platform-api
    namespace: platform-system
```

## Step 3: Implement the Deploy Endpoint

The core of the platform API is the deploy endpoint. It accepts a simple JSON payload and creates or patches a Flux Kustomization.

```python
# platform_api/routes/deploy.py (pseudocode for illustration)
from kubernetes import client, config

def handle_deploy(request_body):
    """
    POST /api/v1/deploy
    {
        "name": "my-service",
        "team": "team-alpha",
        "image": "ghcr.io/acme/my-service:v1.5.0",
        "template": "web-api",
        "domain": "my-service.acme.example.com",
        "env": {"LOG_LEVEL": "info"}
    }
    """
    name = request_body["name"]
    team = request_body["team"]
    namespace = f"{team}"

    # Build the Kustomization object
    kustomization = {
        "apiVersion": "kustomize.toolkit.fluxcd.io/v1",
        "kind": "Kustomization",
        "metadata": {
            "name": name,
            "namespace": namespace,
            "annotations": {
                "platform.io/deployed-by": "platform-api",
                "platform.io/template": request_body.get("template", "web-api"),
            }
        },
        "spec": {
            "interval": "5m",
            "prune": True,
            "sourceRef": {
                "kind": "GitRepository",
                "name": "platform-gitops",
                "namespace": "flux-system"
            },
            "path": f"./golden-paths/{request_body['template']}/base",
            "targetNamespace": namespace,
            "postBuild": {
                "substitute": {
                    "APP_IMAGE": request_body["image"],
                    "APP_DOMAIN": request_body.get("domain", ""),
                    "APP_NAME": name,
                }
            }
        }
    }

    # Apply via Kubernetes API (server-side apply)
    custom_api = client.CustomObjectsApi()
    custom_api.patch_namespaced_custom_object(
        group="kustomize.toolkit.fluxcd.io",
        version="v1",
        namespace=namespace,
        plural="kustomizations",
        name=name,
        body=kustomization,
        field_manager="platform-api",
    )
    return {"status": "accepted", "name": name, "namespace": namespace}
```

## Step 4: Implement the Status Endpoint

```python
def handle_status(name, namespace):
    """
    GET /api/v1/deploy/{name}/status
    Returns the current state of a Flux Kustomization and its Deployment.
    """
    custom_api = client.CustomObjectsApi()

    kustomization = custom_api.get_namespaced_custom_object(
        group="kustomize.toolkit.fluxcd.io",
        version="v1",
        namespace=namespace,
        plural="kustomizations",
        name=name,
    )

    conditions = kustomization.get("status", {}).get("conditions", [])
    ready = next((c for c in conditions if c["type"] == "Ready"), None)

    return {
        "name": name,
        "namespace": namespace,
        "ready": ready["status"] == "True" if ready else False,
        "message": ready["message"] if ready else "Unknown",
        "revision": kustomization.get("status", {}).get("lastAppliedRevision", ""),
    }
```

## Step 5: Implement Force Sync

```python
def handle_sync(name, namespace):
    """
    POST /api/v1/deploy/{name}/sync
    Forces Flux to reconcile immediately by adding a reconcile annotation.
    """
    import datetime

    custom_api = client.CustomObjectsApi()
    patch = {
        "metadata": {
            "annotations": {
                "reconcile.fluxcd.io/requestedAt": datetime.datetime.utcnow().isoformat() + "Z"
            }
        }
    }

    custom_api.patch_namespaced_custom_object(
        group="kustomize.toolkit.fluxcd.io",
        version="v1",
        namespace=namespace,
        plural="kustomizations",
        name=name,
        body=patch,
    )

    return {"status": "sync-requested", "name": name}
```

## Step 6: Deploy the Platform API

```yaml
# platform-api/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: platform-api
  namespace: platform-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: platform-api
  template:
    metadata:
      labels:
        app: platform-api
    spec:
      serviceAccountName: platform-api
      containers:
        - name: api
          image: ghcr.io/acme/platform-api:v1.0.0
          ports:
            - containerPort: 8080
          env:
            - name: CLUSTER_ENV
              value: production
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
```

## Best Practices

- Authenticate all API requests using short-lived tokens tied to developer identity (OIDC)
- Log all API operations with the caller's identity for audit purposes
- Rate-limit deploy endpoints to prevent accidental flood of reconciliations
- Return async job IDs and let clients poll the status endpoint rather than blocking
- Validate all inputs strictly before creating Kubernetes objects to prevent injection attacks
- Use Kubernetes server-side apply with a distinct `field-manager` name for all API operations

## Conclusion

A platform API built on top of Flux CD gives non-Git-native tools a clean integration point for deployment operations. The API translates simple HTTP requests into Flux objects and returns human-readable status, while Flux handles all the actual reconciliation work. This architecture keeps the GitOps model intact — every deployment is still a Kubernetes object managed by Flux — while providing the flexibility to integrate with any toolchain your organization uses.
