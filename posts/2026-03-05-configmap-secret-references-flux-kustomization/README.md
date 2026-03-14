# How to Use ConfigMap and Secret References in Flux Kustomization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Kustomize, ConfigMap, Secrets, SubstituteFrom

Description: Learn how to reference ConfigMaps and Secrets in Flux Kustomization resources to inject configuration and sensitive data into your deployments via post-build variable substitution.

---

## Introduction

Flux Kustomization resources can reference ConfigMaps and Secrets to inject variables into manifests during the post-build phase. This is done through the `spec.postBuild.substituteFrom` field, which loads key-value pairs from these Kubernetes resources and uses them to replace `${VAR_NAME}` placeholders in your rendered manifests. This guide focuses on practical patterns for creating, managing, and referencing ConfigMaps and Secrets in your Flux Kustomizations.

## ConfigMap References

### Creating a Variable ConfigMap

A ConfigMap used for variable substitution should have flat key-value pairs in its `data` field. Each key becomes a variable name.

```yaml
# cluster-config.yaml - ConfigMap with cluster-wide variables
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-config
  namespace: flux-system
data:
  CLUSTER_NAME: production-us-east
  CLUSTER_REGION: us-east-1
  CLUSTER_ENVIRONMENT: production
  INGRESS_CLASS: nginx
  STORAGE_CLASS: gp3
  CONTAINER_REGISTRY: 123456789.dkr.ecr.us-east-1.amazonaws.com
```

### Referencing a ConfigMap in a Kustomization

```yaml
# kustomization-configmap-ref.yaml - Reference a ConfigMap for variable substitution
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  path: ./deploy
  prune: true
  postBuild:
    substituteFrom:
      - kind: ConfigMap
        name: cluster-config
```

The manifests in `./deploy` can now use any key from the ConfigMap as a variable:

```yaml
# deploy/deployment.yaml - Using ConfigMap variables
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  labels:
    cluster: ${CLUSTER_NAME}
    region: ${CLUSTER_REGION}
spec:
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: app
          # Use the registry variable for the image
          image: ${CONTAINER_REGISTRY}/my-app:latest
```

## Secret References

### Creating a Variable Secret

For sensitive data such as passwords, tokens, and connection strings, use a Kubernetes Secret. Use `stringData` for plain-text input, which Kubernetes base64-encodes automatically.

```yaml
# app-secrets.yaml - Secret with sensitive variables
apiVersion: v1
kind: Secret
metadata:
  name: app-credentials
  namespace: flux-system
type: Opaque
stringData:
  DATABASE_URL: postgresql://user:password@db.internal:5432/mydb
  REDIS_PASSWORD: r3d1s_s3cr3t
  SMTP_API_KEY: SG.xxxx.yyyy
  JWT_SECRET: my-super-secret-jwt-key
```

Apply the Secret securely:

```bash
# Apply the secret to the cluster
kubectl apply -f app-secrets.yaml

# Alternatively, create it from the command line
kubectl create secret generic app-credentials \
  --namespace=flux-system \
  --from-literal=DATABASE_URL="postgresql://user:password@db.internal:5432/mydb" \
  --from-literal=REDIS_PASSWORD="r3d1s_s3cr3t"
```

### Referencing a Secret in a Kustomization

```yaml
# kustomization-secret-ref.yaml - Reference a Secret for variable substitution
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  path: ./deploy
  prune: true
  postBuild:
    substituteFrom:
      - kind: Secret
        name: app-credentials
```

Use the secret variables in your manifests:

```yaml
# deploy/deployment.yaml - Using Secret variables in environment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: app
          image: myregistry.io/my-app:latest
          env:
            - name: DATABASE_URL
              value: ${DATABASE_URL}
            - name: REDIS_PASSWORD
              value: ${REDIS_PASSWORD}
```

## Combining ConfigMaps and Secrets

In practice, you usually reference both ConfigMaps (for non-sensitive configuration) and Secrets (for sensitive data) in the same Kustomization.

```yaml
# kustomization-combined-refs.yaml - Multiple ConfigMap and Secret references
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  path: ./deploy
  prune: true
  postBuild:
    substituteFrom:
      # Non-sensitive cluster configuration
      - kind: ConfigMap
        name: cluster-config
      # Application-specific configuration
      - kind: ConfigMap
        name: app-config
      # Sensitive credentials
      - kind: Secret
        name: app-credentials
    substitute:
      # Inline overrides take highest priority
      APP_VERSION: "3.1.0"
```

## Managing ConfigMaps and Secrets with Flux

Rather than creating ConfigMaps and Secrets manually, you can manage them through Flux itself. Create a separate Kustomization for configuration resources that deploys before the application.

```yaml
# config-kustomization.yaml - Deploy configuration resources first
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-config
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  path: ./config
  prune: true
---
# app-kustomization.yaml - Application depends on config
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  path: ./deploy
  prune: true
  # Wait for ConfigMaps and Secrets to be created
  dependsOn:
    - name: app-config
  postBuild:
    substituteFrom:
      - kind: ConfigMap
        name: cluster-config
      - kind: Secret
        name: app-credentials
```

For Secrets, consider using SOPS or Sealed Secrets to encrypt sensitive data in your Git repository:

```bash
# Encrypt a secret with SOPS before committing to Git
sops --encrypt --in-place config/app-credentials.yaml
```

## Optional References

If a ConfigMap or Secret might not exist in every environment, mark it as optional to prevent reconciliation failures.

```yaml
# kustomization-optional-refs.yaml - Optional references
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  path: ./deploy
  prune: true
  postBuild:
    substituteFrom:
      # Always required
      - kind: ConfigMap
        name: cluster-config
      # Only exists in some environments
      - kind: ConfigMap
        name: feature-flags
        optional: true
      # Only exists when external integrations are configured
      - kind: Secret
        name: external-api-keys
        optional: true
```

## Namespace Considerations

ConfigMaps and Secrets referenced in `substituteFrom` must be in the same namespace as the Kustomization resource. If your Kustomization is in `flux-system`, the ConfigMaps and Secrets must also be in `flux-system`.

```yaml
# Both resources must be in the same namespace
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-config
  # Must match the Kustomization's namespace
  namespace: flux-system
data:
  CLUSTER_NAME: my-cluster
```

## Debugging Reference Issues

```bash
# Verify the ConfigMap exists and has the expected data
kubectl get configmap cluster-config -n flux-system -o yaml

# Verify the Secret exists
kubectl get secret app-credentials -n flux-system

# Check if the Kustomization can read the references
kubectl describe kustomization my-app -n flux-system

# Preview the substituted output
flux build kustomization my-app
```

Common errors include:

- **ConfigMap or Secret not found**: The resource does not exist in the expected namespace
- **Variable not substituted**: The key name in the ConfigMap/Secret does not match the `${VAR_NAME}` in the manifest

## Best Practices

1. **Separate configuration from secrets**: Use ConfigMaps for non-sensitive data and Secrets for credentials. This makes access control clearer.
2. **Use the same namespace**: Ensure ConfigMaps and Secrets are in the same namespace as the Kustomization.
3. **Use optional for environment-specific resources**: Mark references as optional when they may not exist everywhere.
4. **Encrypt secrets in Git**: Use SOPS or Sealed Secrets to store encrypted secrets in your repository and let Flux decrypt them.
5. **Use dependsOn**: If ConfigMaps and Secrets are managed by another Kustomization, declare a dependency to ensure they exist before being referenced.

## Conclusion

Referencing ConfigMaps and Secrets in Flux Kustomizations provides a clean separation between manifest templates and environment-specific values. ConfigMaps handle non-sensitive configuration, Secrets handle credentials, and the `substituteFrom` field brings them together during post-build processing. Combined with optional references and inline overrides, this approach gives you a flexible and secure way to manage configuration across clusters and environments.
