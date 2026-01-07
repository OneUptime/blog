# How to Manage ConfigMaps and Secrets Without Leaking Credentials

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Configuration, Security, DevOps

Description: Create, template, and mount ConfigMaps and Secrets the right way-complete with Git workflows, base64 gotchas, and external secret integrations.

---

Kubernetes splits configuration into two primitives:

- **ConfigMaps** for non-sensitive settings (feature flags, YAML, JSON).
- **Secrets** for tokens, passwords, and certificates.

Use both to decouple deployments from environment-specific values.

## 1. Create ConfigMaps from Files or Literals

ConfigMaps can be created from files (for structured config like YAML/JSON) or literal key-value pairs (for simple settings). Using `--dry-run=client -o yaml` generates a manifest you can version control instead of creating the resource directly.

```bash
# Generate a ConfigMap manifest from a config file and a literal value
# --from-file loads the entire file as a single key
# --from-literal creates a simple key=value entry
kubectl create configmap api-config \
  --from-file=application.yaml \
  --from-literal=LOG_LEVEL=info \
  -n dev \
  --dry-run=client -o yaml > configmaps/api-config.yaml
```

Check the manifest into Git so changes are reviewable. Apply it to create the ConfigMap in your cluster:

```bash
# Create or update the ConfigMap from the saved manifest
kubectl apply -f configmaps/api-config.yaml
```

## 2. Create Secrets Without Echoing Plaintext

Never pass secrets as command-line arguments (they appear in shell history and process listings). Instead, use `--from-env-file` or `--from-file` to read values from files that aren't logged.

```bash
# Generate Secret manifest from an env file
# Values are automatically base64-encoded in the output
kubectl create secret generic api-secrets \
  --from-env-file=secrets/dev.env \
  --type=Opaque \
  --namespace=dev \
  --dry-run=client -o yaml > secrets/api-secrets.yaml
```

The `dev.env` file uses standard KEY=VALUE format (no quotes, no spaces around `=`):

```bash
# secrets/dev.env - each line becomes a Secret key
DB_USER=payments
DB_PASSWORD=s3cure
API_KEY=abcd1234
```

Commit the generated YAML only if it is encrypted (e.g., with SOPS). Otherwise keep secrets in a secure store and apply via CI at deploy time.

## 3. Mount ConfigMaps/Secrets into Pods

There are two ways to inject config into containers: as environment variables (good for simple values) or as mounted files (good for structured config). This manifest demonstrates both approaches - environment variables via `envFrom` and a config file via a volume mount.

`deployments/api.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payments-api
  namespace: dev
spec:
  replicas: 2
  selector:
    matchLabels:
      app: payments-api
  template:
    metadata:
      labels:
        app: payments-api
    spec:
      containers:
        - name: api
          image: ghcr.io/example/payments-api:2.0.0

          # Inject all keys as environment variables
          # Each key in the ConfigMap/Secret becomes an env var
          envFrom:
            - configMapRef:
                name: api-config      # LOG_LEVEL becomes $LOG_LEVEL
            - secretRef:
                name: api-secrets     # DB_PASSWORD becomes $DB_PASSWORD

          # Mount specific files from ConfigMap into the container
          volumeMounts:
            - name: config-file
              mountPath: /app/config  # Directory where files appear

      # Define the volume source
      volumes:
        - name: config-file
          configMap:
            name: api-config
            items:                    # Selectively mount specific keys
              - key: application.yaml # Key from ConfigMap
                path: application.yaml # Filename in the mount path
```

`envFrom` keeps containers clean - every key becomes an environment variable automatically. Use volumes for structured config files that your app reads from disk.

## 4. Validate at Runtime

After deploying, verify that your ConfigMaps and Secrets are properly injected. Use `kubectl exec` to run commands inside a Pod and inspect environment variables or file contents.

```bash
# Check environment variables starting with DB_ are present
kubectl exec -n dev deploy/payments-api -- env | grep DB_

# Verify the config file was mounted correctly
kubectl exec -n dev deploy/payments-api -- cat /app/config/application.yaml
```

For secrets, retrieve and decode only when absolutely necessary, and only from secure terminals (avoid shared screens or logged sessions):

```bash
# Decode a secret value (base64 decode required)
kubectl get secret api-secrets -n dev -o jsonpath='{.data.DB_PASSWORD}' | base64 -d
```

## 5. Rotate Without Downtime

- Update the ConfigMap/Secret manifest.
- `kubectl apply -f ...`.
- Trigger a rollout: `kubectl rollout restart deploy/payments-api -n dev` or use checksum annotations (Helm/Kustomize) so Pods restart automatically when data changes.

## 6. Keep Secrets Encrypted at Rest

Options:

1. **KMS + etcd encryption**: enable envelope encryption in the API server so etcd stores ciphertext.
2. **SOPS**: encrypt YAML in Git, decrypt in CI/CD before applying.
3. **External Secrets Operator / AWS Secrets Manager / HashiCorp Vault**: define `ExternalSecret` objects that sync secrets into the cluster automatically.

## 7. Avoid Base64 Pitfalls

Remember: Kubernetes expects base64-encoded values within Secret manifests. When editing manually, run `printf 'value' | base64` (no newline) and ensure the decoded string ends with the right characters. Use tools like `yq e '.data | keys' secret.yaml` to inspect keys quickly.

## 8. Organize by Namespace and Environment

Mirror namespaces: `dev`, `stage`, `prod`. Keep ConfigMaps/Secrets scoped accordingly. Use naming conventions (`<service>-config`, `<service>-secrets`) so RBAC and automation stay predictable.

## 9. GitOps Workflow

- Store ConfigMap YAML in plain text.
- Store Secret YAML encrypted or fetch from a secret manager during deployment.
- Run `kubectl diff -f manifests/` in CI.
- Require reviewers to confirm no secret files slip into logs/artifacts.

---

Treat ConfigMaps and Secrets like any other piece of release engineering: defined in code, reviewed, validated, and rotated regularly. Do that, and Kubernetes keeps your credentials safe while apps stay configurable.
