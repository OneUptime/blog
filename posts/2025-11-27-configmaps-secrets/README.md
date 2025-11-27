# How to Manage ConfigMaps and Secrets Without Leaking Credentials

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Configuration, Security, DevOps

Description: Create, template, and mount ConfigMaps and Secrets the right way—complete with Git workflows, base64 gotchas, and external secret integrations.

---

Kubernetes splits configuration into two primitives:

- **ConfigMaps** for non-sensitive settings (feature flags, YAML, JSON).
- **Secrets** for tokens, passwords, and certificates.

Use both to decouple deployments from environment-specific values.

## 1. Create ConfigMaps from Files or Literals

```bash
kubectl create configmap api-config \
  --from-file=application.yaml \
  --from-literal=LOG_LEVEL=info \
  -n dev \
  --dry-run=client -o yaml > configmaps/api-config.yaml
```

Check the manifest into Git so changes are reviewable. Apply it with:

```bash
kubectl apply -f configmaps/api-config.yaml
```

## 2. Create Secrets Without Echoing Plaintext

Use `--from-env-file` or `--from-file` to avoid command history leaks:

```bash
kubectl create secret generic api-secrets \
  --from-env-file=secrets/dev.env \
  --type=Opaque \
  --namespace=dev \
  --dry-run=client -o yaml > secrets/api-secrets.yaml
```

`dev.env` format:

```
DB_USER=payments
DB_PASSWORD=s3cure
API_KEY=abcd1234
```

Commit the generated YAML only if it is encrypted (e.g., with SOPS). Otherwise keep secrets in a secure store and apply via CI at deploy time.

## 3. Mount ConfigMaps/Secrets into Pods

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
          envFrom:
            - configMapRef:
                name: api-config
            - secretRef:
                name: api-secrets
          volumeMounts:
            - name: config-file
              mountPath: /app/config
      volumes:
        - name: config-file
          configMap:
            name: api-config
            items:
              - key: application.yaml
                path: application.yaml
```

`envFrom` keeps containers clean—every key becomes an environment variable. Use volumes for structured config files.

## 4. Validate at Runtime

Exec into a Pod and print env vars/files:

```bash
kubectl exec -n dev deploy/payments-api -- env | grep DB_
kubectl exec -n dev deploy/payments-api -- cat /app/config/application.yaml
```

For secrets, use `kubectl get secret api-secrets -n dev -o jsonpath='{.data.DB_PASSWORD}' | base64 -d` only when necessary and from secure terminals.

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
