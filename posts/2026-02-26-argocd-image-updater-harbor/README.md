# How to Configure ArgoCD Image Updater with Harbor

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Harbor, Image Updater

Description: Learn how to configure ArgoCD Image Updater with Harbor registry for automatic container image updates, including robot account authentication, project-scoped access, and HTTPS configuration.

---

Harbor is a popular open-source container registry that provides security scanning, image signing, RBAC, and replication. Many organizations run Harbor as their private registry for security and compliance reasons. This guide shows you how to configure ArgoCD Image Updater to automatically detect and deploy new images from a Harbor registry.

## Harbor Authentication Setup

Harbor supports several authentication methods. For ArgoCD Image Updater, robot accounts are the recommended approach because they provide scoped, non-interactive access.

### Creating a Robot Account

Robot accounts in Harbor are purpose-built for automated access. They can be scoped to specific projects and have limited permissions.

#### Project-Level Robot Account

```bash
# Using Harbor API to create a robot account
curl -X POST \
  -H "Content-Type: application/json" \
  -u "admin:Harbor12345" \
  "https://harbor.example.com/api/v2.0/projects/myproject/robots" \
  -d '{
    "name": "argocd-image-updater",
    "description": "Robot account for ArgoCD Image Updater",
    "duration": -1,
    "permissions": [
      {
        "kind": "project",
        "namespace": "myproject",
        "access": [
          {"resource": "repository", "action": "pull"},
          {"resource": "repository", "action": "list"}
        ]
      }
    ]
  }'
```

The response includes the robot account name and secret. Save both.

#### System-Level Robot Account

For monitoring images across multiple projects:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -u "admin:Harbor12345" \
  "https://harbor.example.com/api/v2.0/robots" \
  -d '{
    "name": "argocd-image-updater",
    "description": "System-wide robot for Image Updater",
    "duration": -1,
    "level": "system",
    "permissions": [
      {
        "kind": "project",
        "namespace": "*",
        "access": [
          {"resource": "repository", "action": "pull"},
          {"resource": "repository", "action": "list"}
        ]
      }
    ]
  }'
```

### Creating the Kubernetes Secret

Store the robot account credentials in a Kubernetes secret:

```bash
kubectl create secret docker-registry harbor-creds \
  -n argocd \
  --docker-server=harbor.example.com \
  --docker-username='robot$argocd-image-updater' \
  --docker-password='your-robot-secret'
```

Note: Harbor robot account usernames contain a `$` character (e.g., `robot$argocd-image-updater`). Make sure to use single quotes in bash to prevent shell expansion.

## Registry Configuration

### Basic Harbor Configuration

```yaml
# argocd-image-updater-config ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-image-updater-config
  namespace: argocd
data:
  registries.conf: |
    registries:
      - name: Harbor
        api_url: https://harbor.example.com
        prefix: harbor.example.com
        credentials: pullsecret:argocd/harbor-creds
        default: true
```

### Harbor with Self-Signed Certificates

If Harbor uses self-signed or internal CA certificates, you need to configure Image Updater to trust them:

```yaml
# Mount the CA certificate into the Image Updater pod
apiVersion: v1
kind: ConfigMap
metadata:
  name: harbor-ca-cert
  namespace: argocd
data:
  ca.crt: |
    -----BEGIN CERTIFICATE-----
    MIIDXTCCAkWgAwIBAgIJAJC1HiIAZAiUMA0GCSqGSIb3Qa2PFBDBFg...
    -----END CERTIFICATE-----
```

Patch the Image Updater deployment to mount the CA certificate:

```yaml
spec:
  template:
    spec:
      containers:
        - name: argocd-image-updater
          volumeMounts:
            - name: harbor-ca
              mountPath: /etc/ssl/certs/harbor-ca.crt
              subPath: ca.crt
      volumes:
        - name: harbor-ca
          configMap:
            name: harbor-ca-cert
```

### Harbor Behind a Reverse Proxy

If Harbor runs behind an Nginx or other reverse proxy:

```yaml
data:
  registries.conf: |
    registries:
      - name: Harbor
        api_url: https://harbor.example.com
        prefix: harbor.example.com
        credentials: pullsecret:argocd/harbor-creds
        default: true
        # Use the Docker Hub v2 API compatibility
        tagsortmode: latest-first
```

## Configuring Applications

### Semver Strategy

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  namespace: argocd
  annotations:
    # Track image in Harbor
    argocd-image-updater.argoproj.io/image-list: myapp=harbor.example.com/myproject/myapp
    argocd-image-updater.argoproj.io/myapp.update-strategy: semver
    argocd-image-updater.argoproj.io/myapp.semver-constraint: ">=1.0.0"
    # Write back to Git
    argocd-image-updater.argoproj.io/write-back-method: git
    argocd-image-updater.argoproj.io/git-branch: main
    argocd-image-updater.argoproj.io/write-back-target: kustomization
spec:
  project: default
  source:
    repoURL: https://github.com/my-org/k8s-manifests.git
    targetRevision: main
    path: apps/myapp
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

### Latest Strategy with Tag Filtering

```yaml
annotations:
  argocd-image-updater.argoproj.io/image-list: myapp=harbor.example.com/myproject/myapp
  argocd-image-updater.argoproj.io/myapp.update-strategy: latest
  # Only consider tags that look like git commit hashes
  argocd-image-updater.argoproj.io/myapp.allow-tags: "regexp:^main-[a-f0-9]{7}$"
  # Ignore tags
  argocd-image-updater.argoproj.io/myapp.ignore-tags: "latest, dev, nightly"
```

### Multiple Images from Harbor

```yaml
annotations:
  argocd-image-updater.argoproj.io/image-list: |
    frontend=harbor.example.com/myproject/frontend,
    backend=harbor.example.com/myproject/backend,
    worker=harbor.example.com/myproject/worker
  argocd-image-updater.argoproj.io/frontend.update-strategy: semver
  argocd-image-updater.argoproj.io/backend.update-strategy: semver
  argocd-image-updater.argoproj.io/worker.update-strategy: semver
  argocd-image-updater.argoproj.io/frontend.semver-constraint: "^2.0"
  argocd-image-updater.argoproj.io/backend.semver-constraint: "^3.0"
  argocd-image-updater.argoproj.io/worker.semver-constraint: "^1.0"
```

## Harbor Replication with Image Updater

If you use Harbor replication to sync images between registries (e.g., from a build registry to a production registry), configure Image Updater to watch the destination registry:

```yaml
# Image Updater watches the production Harbor instance
data:
  registries.conf: |
    registries:
      - name: Harbor Production
        api_url: https://harbor-prod.example.com
        prefix: harbor-prod.example.com
        credentials: pullsecret:argocd/harbor-prod-creds
```

This way, images are only deployed after they have been replicated to the production registry, adding an extra layer of control.

## Harbor Image Scanning Integration

Harbor can scan images for vulnerabilities. You can configure Harbor to prevent pulling images that have critical vulnerabilities. This acts as a quality gate before Image Updater deploys new images.

In Harbor project settings, enable:
- Automatically scan images on push
- Prevent vulnerable images from running (set severity threshold)

When an image is blocked by Harbor's vulnerability policy, Image Updater will not be able to pull its metadata, effectively preventing deployment of vulnerable images.

## Helm Values Write-Back for Harbor

```yaml
annotations:
  argocd-image-updater.argoproj.io/image-list: myapp=harbor.example.com/myproject/myapp
  argocd-image-updater.argoproj.io/myapp.update-strategy: semver
  argocd-image-updater.argoproj.io/write-back-method: git
  argocd-image-updater.argoproj.io/write-back-target: "helmvalues:values.yaml"
  argocd-image-updater.argoproj.io/myapp.helm.image-name: image.repository
  argocd-image-updater.argoproj.io/myapp.helm.image-tag: image.tag
```

## Troubleshooting

**Robot account authentication failure** - Make sure you are using the full robot account name including the `robot$` prefix:

```bash
# Verify the robot account works
docker login harbor.example.com -u 'robot$argocd-image-updater' -p 'secret'
```

**Certificate errors** - If Harbor uses self-signed certs, add the CA to Image Updater's trust store as shown above.

**No tags found** - Check that the robot account has `list` permission on the repository:

```bash
# Test listing tags via Harbor API
curl -u 'robot$argocd-image-updater:secret' \
  "https://harbor.example.com/v2/myproject/myapp/tags/list"
```

**Image Updater not detecting new tags** - Check the Image Updater logs:

```bash
kubectl logs -n argocd deployment/argocd-image-updater --tail=100
```

For monitoring Image Updater with Harbor, set up [ArgoCD notifications](https://oneuptime.com/blog/post/2026-01-25-notifications-argocd/view) to get alerts when images are updated or when update failures occur.

Harbor with ArgoCD Image Updater gives you a fully private, self-hosted container image deployment pipeline with built-in vulnerability scanning and access control.
