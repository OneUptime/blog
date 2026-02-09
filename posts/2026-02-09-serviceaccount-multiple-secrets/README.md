# How to Configure ServiceAccount with Multiple Secrets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, ServiceAccounts, Secrets

Description: Configure Kubernetes ServiceAccounts with multiple secrets including image pull secrets, token secrets, and custom credentials for comprehensive workload authentication.

---

ServiceAccounts can reference multiple secrets simultaneously, providing workloads with access to various credentials through a single identity. Understanding how to configure and manage multiple secrets per ServiceAccount enables flexible and secure credential distribution across your applications.

## Understanding ServiceAccount Secret Types

ServiceAccounts interact with several types of secrets. Image pull secrets authenticate with container registries. Token secrets provide long-lived authentication tokens. Custom secrets store application-specific credentials. Each secret type serves a different purpose and can be combined on a single ServiceAccount.

Modern Kubernetes automatically creates bound tokens instead of token secrets, but you might still need explicit token secrets for backward compatibility or external access. Image pull secrets are essential for private registries. Custom secrets provide application credentials that should be associated with the workload identity.

By attaching multiple secrets to a ServiceAccount, you centralize credential management and ensure that all pods using that account automatically receive the necessary credentials.

## Configuring Image Pull Secrets

Start by adding image pull secrets to a ServiceAccount:

```yaml
# serviceaccount-with-image-secrets.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: multi-registry-app
  namespace: production
imagePullSecrets:
- name: dockerhub-secret
- name: gcr-secret
- name: private-registry-secret
```

Create the referenced secrets:

```bash
# Docker Hub
kubectl create secret docker-registry dockerhub-secret \
  --docker-server=docker.io \
  --docker-username=user \
  --docker-password=pass \
  -n production

# Google Container Registry
kubectl create secret docker-registry gcr-secret \
  --docker-server=gcr.io \
  --docker-username=_json_key \
  --docker-password="$(cat gcr-key.json)" \
  -n production

# Private registry
kubectl create secret docker-registry private-registry-secret \
  --docker-server=registry.example.com \
  --docker-username=user \
  --docker-password=pass \
  -n production
```

Pods using this ServiceAccount can pull from all three registries.

## Adding Custom Application Secrets

Attach application secrets to the ServiceAccount:

```yaml
# serviceaccount-with-app-secrets.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-with-secrets
  namespace: production
imagePullSecrets:
- name: registry-secret
secrets:
- name: database-credentials
- name: api-keys
- name: tls-certificates
```

Create the application secrets:

```yaml
# app-secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: production
type: Opaque
stringData:
  host: postgres.example.com
  username: appuser
  password: securepassword
  database: production_db
---
apiVersion: v1
kind: Secret
metadata:
  name: api-keys
  namespace: production
type: Opaque
stringData:
  stripe-key: sk_live_xxxxx
  sendgrid-key: SG.xxxxx
  aws-access-key: AKIA xxxxx
  aws-secret-key: xxxxx
---
apiVersion: v1
kind: Secret
metadata:
  name: tls-certificates
  namespace: production
type: kubernetes.io/tls
data:
  tls.crt: <base64-encoded-cert>
  tls.key: <base64-encoded-key>
```

Apply all configurations:

```bash
kubectl apply -f app-secrets.yaml
kubectl apply -f serviceaccount-with-app-secrets.yaml
```

## Accessing Secrets from Pods

Pods can access these secrets through volume mounts or environment variables:

```yaml
# pod-using-multiple-secrets.yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-pod
  namespace: production
spec:
  serviceAccountName: app-with-secrets
  containers:
  - name: app
    image: registry.example.com/myapp:latest
    # Environment variables from secrets
    env:
    - name: DB_HOST
      valueFrom:
        secretKeyRef:
          name: database-credentials
          key: host
    - name: DB_USERNAME
      valueFrom:
        secretKeyRef:
          name: database-credentials
          key: username
    - name: DB_PASSWORD
      valueFrom:
        secretKeyRef:
          name: database-credentials
          key: password
    - name: STRIPE_KEY
      valueFrom:
        secretKeyRef:
          name: api-keys
          key: stripe-key
    # Volume mounts for certificates
    volumeMounts:
    - name: tls-certs
      mountPath: /etc/tls
      readOnly: true
  volumes:
  - name: tls-certs
    secret:
      secretName: tls-certificates
```

The image automatically pulls using registry-secret from the ServiceAccount.

## Creating Long-Lived Token Secrets

For backward compatibility or external access:

```yaml
# token-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-token-secret
  namespace: production
  annotations:
    kubernetes.io/service-account.name: app-with-secrets
type: kubernetes.io/service-account-token
```

Kubernetes automatically populates this secret with a token for the ServiceAccount:

```bash
kubectl apply -f token-secret.yaml

# Wait for token to be created
kubectl wait --for=jsonpath='{.data.token}' secret/app-token-secret -n production

# Retrieve the token
kubectl get secret app-token-secret -n production -o jsonpath='{.data.token}' | base64 -d
```

The token appears in the secret and is usable externally.

## Organizing Secrets by Environment

Different environments need different secrets:

```yaml
# development-serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp-sa
  namespace: development
imagePullSecrets:
- name: dev-registry-secret
secrets:
- name: dev-database-credentials
- name: dev-api-keys
---
# production-serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp-sa
  namespace: production
imagePullSecrets:
- name: prod-registry-secret
secrets:
- name: prod-database-credentials
- name: prod-api-keys
- name: prod-tls-certificates
- name: prod-compliance-secrets
```

The same ServiceAccount name in different namespaces references environment-specific secrets.

## Using Projected Volumes for Multiple Secrets

Combine multiple secrets into a single volume with custom paths:

```yaml
# projected-secrets-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-projected-secrets
  namespace: production
spec:
  serviceAccountName: app-with-secrets
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: all-credentials
      mountPath: /credentials
      readOnly: true
  volumes:
  - name: all-credentials
    projected:
      sources:
      # ServiceAccount token
      - serviceAccountToken:
          path: auth/token
          expirationSeconds: 3600
      # Database credentials
      - secret:
          name: database-credentials
          items:
          - key: host
            path: database/host
          - key: username
            path: database/username
          - key: password
            path: database/password
      # API keys
      - secret:
          name: api-keys
          items:
          - key: stripe-key
            path: api/stripe-key
          - key: sendgrid-key
            path: api/sendgrid-key
      # TLS certificates
      - secret:
          name: tls-certificates
          items:
          - key: tls.crt
            path: tls/cert.pem
          - key: tls.key
            path: tls/key.pem
```

All credentials appear in a single organized directory structure:

```
/credentials/
├── auth/
│   └── token
├── database/
│   ├── host
│   ├── username
│   └── password
├── api/
│   ├── stripe-key
│   └── sendgrid-key
└── tls/
    ├── cert.pem
    └── key.pem
```

## Managing Secrets with External Secret Operators

Use External Secrets Operator for dynamic secret management:

```yaml
# external-secrets.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-database-credentials
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: database-credentials
    creationPolicy: Owner
  data:
  - secretKey: host
    remoteRef:
      key: database/production
      property: host
  - secretKey: username
    remoteRef:
      key: database/production
      property: username
  - secretKey: password
    remoteRef:
      key: database/production
      property: password
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-api-keys
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: api-keys
    creationPolicy: Owner
  data:
  - secretKey: stripe-key
    remoteRef:
      key: api-keys/production
      property: stripe
  - secretKey: sendgrid-key
    remoteRef:
      key: api-keys/production
      property: sendgrid
```

External Secrets Operator synchronizes secrets from external vaults automatically.

## Rotating Multiple Secrets

Implement secret rotation for all ServiceAccount secrets:

```bash
#!/bin/bash
# rotate-serviceaccount-secrets.sh

NAMESPACE="production"
SA_NAME="app-with-secrets"

# Rotate database credentials
kubectl create secret generic database-credentials \
  --from-literal=host=postgres.example.com \
  --from-literal=username=appuser \
  --from-literal=password=$(openssl rand -base64 32) \
  --dry-run=client -o yaml | kubectl apply -f -

# Rotate API keys (assuming you have new keys)
kubectl create secret generic api-keys \
  --from-literal=stripe-key=$NEW_STRIPE_KEY \
  --from-literal=sendgrid-key=$NEW_SENDGRID_KEY \
  --dry-run=client -o yaml | kubectl apply -f -

# Rotate TLS certificates
kubectl create secret tls tls-certificates \
  --cert=new-cert.pem \
  --key=new-key.pem \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart pods to pick up new secrets
kubectl rollout restart deployment -n $NAMESPACE -l serviceAccount=$SA_NAME

echo "Secrets rotated and pods restarted"
```

Schedule this script for regular credential rotation.

## Monitoring Secret Usage

Track which secrets are referenced by ServiceAccounts:

```bash
#!/bin/bash
# audit-serviceaccount-secrets.sh

echo "ServiceAccount Secret Audit"
echo "==========================="

for ns in $(kubectl get ns -o jsonpath='{.items[*].metadata.name}'); do
    echo ""
    echo "Namespace: $ns"

    for sa in $(kubectl get sa -n $ns -o jsonpath='{.items[*].metadata.name}'); do
        echo "  ServiceAccount: $sa"

        # List image pull secrets
        IMAGE_SECRETS=$(kubectl get sa $sa -n $ns -o jsonpath='{.imagePullSecrets[*].name}')
        if [ ! -z "$IMAGE_SECRETS" ]; then
            echo "    Image Pull Secrets: $IMAGE_SECRETS"
        fi

        # List regular secrets
        SECRETS=$(kubectl get sa $sa -n $ns -o jsonpath='{.secrets[*].name}')
        if [ ! -z "$SECRETS" ]; then
            echo "    Secrets: $SECRETS"
        fi

        # List pods using this SA
        POD_COUNT=$(kubectl get pods -n $ns -o json | \
          jq -r ".items[] | select(.spec.serviceAccountName==\"$sa\") | .metadata.name" | wc -l)
        echo "    Pods using SA: $POD_COUNT"
    done
done
```

This helps identify unused secrets and track secret distribution.

## Troubleshooting Multiple Secrets

Common issues when working with multiple secrets:

```bash
# Check if secrets exist
kubectl get secrets -n production

# Verify ServiceAccount references
kubectl get serviceaccount app-with-secrets -n production -o yaml

# Check if pods can access secrets
kubectl exec app-pod -n production -- ls -la /credentials

# Verify secret permissions
kubectl auth can-i get secrets --as=system:serviceaccount:production:app-with-secrets

# Check for secret mount errors
kubectl describe pod app-pod -n production | grep -A 10 Events
```

Verify that secrets exist before referencing them in ServiceAccounts. Ensure RBAC permissions allow secret access.

## Security Best Practices

Separate secrets by sensitivity level. Use different ServiceAccounts for workloads with different secret needs. Implement secret encryption at rest. Rotate secrets regularly. Audit secret access patterns. Use external secret managers for sensitive credentials.

Avoid putting all credentials in a single ServiceAccount. Create specific ServiceAccounts for specific secret requirements:

```yaml
# specific-serviceaccounts.yaml
# ServiceAccount for basic app needs
apiVersion: v1
kind: ServiceAccount
metadata:
  name: basic-app-sa
imagePullSecrets:
- name: registry-secret
secrets:
- name: app-config
---
# ServiceAccount for database access
apiVersion: v1
kind: ServiceAccount
metadata:
  name: database-app-sa
imagePullSecrets:
- name: registry-secret
secrets:
- name: database-credentials
---
# ServiceAccount for admin operations
apiVersion: v1
kind: ServiceAccount
metadata:
  name: admin-app-sa
imagePullSecrets:
- name: registry-secret
secrets:
- name: database-credentials
- name: admin-api-keys
- name: signing-certificates
```

This separation limits credential exposure.

## Conclusion

ServiceAccounts support multiple secrets, enabling comprehensive credential management through a single identity. By configuring image pull secrets, token secrets, and custom application secrets on ServiceAccounts, you centralize credential distribution and ensure workloads automatically receive necessary credentials. Use projected volumes to organize multiple secrets into clean directory structures, implement regular rotation procedures, and follow the principle of least privilege by creating specific ServiceAccounts for different secret requirements. This approach provides flexible, secure credential management for diverse application needs.
