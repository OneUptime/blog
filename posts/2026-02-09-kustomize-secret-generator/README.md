# How to Generate Kubernetes Secrets from Kustomize secretGenerator

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kustomize, Secrets

Description: Learn how to use Kustomize secretGenerator to create Kubernetes Secrets from files, literals, and environment files with automatic hash suffixes for safe updates.

---

Managing Secrets manually across environments creates inconsistency and makes updates risky. When you change a Secret, pods using it don't automatically restart unless you manually trigger a rollout. This leads to pods running with mixed configurations during updates.

Kustomize's secretGenerator solves this by automatically generating Secrets with content-based hash suffixes. When secret data changes, the hash changes, creating a new Secret. Kustomize updates references automatically, triggering pod restarts through standard Kubernetes rolling updates.

In this guide, you'll learn how to use secretGenerator, create secrets from multiple sources, manage them across environments, and implement safe secret rotation.

## Basic Secret Generation

Create a kustomization.yaml with secretGenerator:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

secretGenerator:
- name: database-credentials
  literals:
  - username=dbuser
  - password=SecurePassword123
  - host=postgres.example.com
  - port=5432

resources:
- deployment.yaml
```

Generate manifests:

```bash
kubectl kustomize .
```

Output includes a Secret with hash suffix:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials-5t8f7g9h2k
type: Opaque
data:
  username: ZGJ1c2Vy
  password: U2VjdXJlUGFzc3dvcmQxMjM=
  host: cG9zdGdyZXMuZXhhbXBsZS5jb20=
  port: NTQzMg==
```

The hash `5t8f7g9h2k` is generated from the secret content. Change any value, and the hash changes.

## Generating from Files

Create secrets from individual files:

```yaml
# kustomization.yaml
secretGenerator:
- name: api-keys
  files:
  - stripe-key.txt
  - sendgrid-key.txt
  - datadog-key.txt
```

File contents:

```bash
# stripe-key.txt
sk_live_abc123xyz789

# sendgrid-key.txt
SG.abc123.xyz789

# datadog-key.txt
dd_api_key_456
```

Generated Secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: api-keys-8h5k2m9d4t
data:
  stripe-key.txt: c2tfbGl2ZV9hYmMxMjN4eXo3ODk=
  sendgrid-key.txt: U0cuYWJjMTIzLnh5ejc4OQ==
  datadog-key.txt: ZGRfYXBpX2tleV80NTY=
```

Custom key names:

```yaml
secretGenerator:
- name: api-keys
  files:
  - stripe_key=stripe-key.txt
  - sendgrid_key=sendgrid-key.txt
  - datadog_key=datadog-key.txt
```

Now keys are `stripe_key`, `sendgrid_key`, `datadog_key` instead of filenames.

## Generating from Environment Files

Create secrets from .env files:

```bash
# database.env
DB_USERNAME=dbuser
DB_PASSWORD=SecurePassword123
DB_HOST=postgres.example.com
DB_PORT=5432
DB_NAME=production
```

Kustomization:

```yaml
secretGenerator:
- name: database-config
  envs:
  - database.env
```

## Combining Multiple Sources

Mix literals, files, and env files:

```yaml
secretGenerator:
- name: app-secrets
  literals:
  - API_VERSION=v2
  files:
  - tls.crt
  - tls.key
  envs:
  - credentials.env
```

## Setting Secret Type

Specify secret type:

```yaml
secretGenerator:
- name: docker-registry-credentials
  type: kubernetes.io/dockerconfigjson
  files:
  - .dockerconfigjson
---
secretGenerator:
- name: tls-certificate
  type: kubernetes.io/tls
  files:
  - tls.crt=cert.pem
  - tls.key=key.pem
```

## Controlling Hash Suffix

Disable hash suffix (not recommended):

```yaml
secretGenerator:
- name: static-secret
  literals:
  - key=value
  options:
    disableNameSuffixHash: true
```

Use custom labels/annotations:

```yaml
secretGenerator:
- name: database-credentials
  literals:
  - username=dbuser
  options:
    labels:
      app: myapp
      env: production
    annotations:
      managed-by: kustomize
```

## Automatic Reference Updates

Kustomize automatically updates Secret references in deployments:

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  template:
    spec:
      containers:
      - name: app
        image: web-app:latest
        envFrom:
        - secretRef:
            name: database-credentials  # Kustomize updates this
        volumeMounts:
        - name: tls
          mountPath: /etc/tls
      volumes:
      - name: tls
        secret:
          secretName: tls-certificate  # Kustomize updates this too
```

After `kubectl kustomize .`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  template:
    spec:
      containers:
      - name: app
        envFrom:
        - secretRef:
            name: database-credentials-5t8f7g9h2k  # Updated with hash
      volumes:
      - name: tls
        secret:
          secretName: tls-certificate-8h5k2m9d4t  # Updated with hash
```

## Multi-Environment Configuration

Structure for multiple environments:

```
.
├── base/
│   ├── kustomization.yaml
│   └── deployment.yaml
└── overlays/
    ├── production/
    │   ├── kustomization.yaml
    │   ├── database.env
    │   └── api-keys/
    │       ├── stripe-key.txt
    │       └── datadog-key.txt
    └── staging/
        ├── kustomization.yaml
        ├── database.env
        └── api-keys/
            ├── stripe-key.txt
            └── datadog-key.txt
```

Base kustomization:

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- deployment.yaml
```

Production overlay:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
- ../../base

secretGenerator:
- name: database-config
  envs:
  - database.env
- name: api-keys
  files:
  - api-keys/stripe-key.txt
  - api-keys/datadog-key.txt

nameSuffix: -prod
namespace: production
```

Staging overlay:

```yaml
# overlays/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
- ../../base

secretGenerator:
- name: database-config
  envs:
  - database.env
- name: api-keys
  files:
  - api-keys/stripe-key.txt
  - api-keys/datadog-key.txt

nameSuffix: -staging
namespace: staging
```

Build for each environment:

```bash
# Production
kubectl kustomize overlays/production | kubectl apply -f -

# Staging
kubectl kustomize overlays/staging | kubectl apply -f -
```

## Safe Secret Updates

When you update a secret:

```bash
# Update password in production
echo "NewSecurePassword456" > overlays/production/database.env

# Build and apply
kubectl kustomize overlays/production | kubectl apply -f -
```

Kustomize:
1. Generates new Secret with new hash
2. Updates deployment to reference new Secret
3. Kubernetes triggers rolling update
4. Old Secret remains until deployment completes
5. Old Secret can be deleted safely

## Garbage Collection of Old Secrets

Old secrets accumulate. Clean them up:

```bash
# List all secrets with name pattern
kubectl get secrets -n production | grep database-config

# Delete old versions
kubectl delete secret database-config-5t8f7g9h2k -n production
```

Automate cleanup with a CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cleanup-old-secrets
  namespace: production
spec:
  schedule: "0 2 * * 0"  # Weekly at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: secret-cleaner
          containers:
          - name: cleanup
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - -c
            - |
              # Keep only the 3 most recent versions of each secret
              for base_name in database-config api-keys; do
                kubectl get secrets -n production -o name | \
                  grep "^secret/${base_name}-" | \
                  sort -r | \
                  tail -n +4 | \
                  xargs -r kubectl delete -n production
              done
          restartPolicy: OnFailure
```

## Using with Sealed Secrets or SOPS

Combine with encryption for GitOps:

```yaml
# kustomization.yaml
secretGenerator:
- name: database-credentials
  files:
  - database.env

# Encrypt generated secret
```

```bash
# Generate, then encrypt
kubectl kustomize . | kubeseal -o yaml > sealed-secrets.yaml

# Or with SOPS
kubectl kustomize . > secrets.yaml
sops --encrypt secrets.yaml > secrets.enc.yaml
```

## Best Practices

1. **Always use hash suffixes**: They enable safe, zero-downtime secret updates.

2. **Store secret files outside Git**: Keep .env files and key files in .gitignore.

3. **Use environment-specific overlays**: Separate secrets for prod, staging, dev.

4. **Clean up old secrets**: Implement automated garbage collection.

5. **Use immutable secrets**: For additional safety, mark generated secrets as immutable.

6. **Combine with encryption**: Use Sealed Secrets or SOPS for Git storage.

7. **Validate before applying**: Always review output of `kubectl kustomize` before applying.

8. **Document secret sources**: Comment your kustomization.yaml to explain secret origins.

Kustomize secretGenerator automates secret creation with hash-based naming that enables safe, zero-downtime updates. The automatic hash suffixes ensure deployments always reference current secrets, while the builtin reference updating eliminates manual edits. Combined with overlays for multiple environments, it provides a complete solution for managing secrets across your Kubernetes infrastructure.
