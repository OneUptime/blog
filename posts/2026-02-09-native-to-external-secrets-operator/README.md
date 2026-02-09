# How to Move Kubernetes Secrets from Native Secrets to External Secrets Operator

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, External Secrets Operator, Security, Secrets Management, HashiCorp Vault

Description: Comprehensive guide to migrating from native Kubernetes Secrets to External Secrets Operator for centralized secrets management with AWS Secrets Manager, Azure Key Vault, Google Secret Manager, or HashiCorp Vault.

---

Native Kubernetes Secrets work for development environments, but they create security and operational challenges in production. Secrets are base64 encoded rather than encrypted at rest by default, they live in etcd alongside cluster state, GitOps workflows expose them in version control, and there's no built-in rotation or audit trail. External Secrets Operator solves these problems by syncing secrets from external secret management systems into Kubernetes. This guide shows you how to migrate existing Secrets to External Secrets Operator.

## Understanding External Secrets Operator

External Secrets Operator is a Kubernetes operator that reads secrets from external providers like AWS Secrets Manager, Azure Key Vault, Google Secret Manager, HashiCorp Vault, and others. It creates and updates native Kubernetes Secrets automatically based on external values.

The key components include SecretStore resources that define connections to external secret providers, ExternalSecret resources that specify which external secrets to sync, and ClusterSecretStore for cluster-wide secret provider configuration that multiple namespaces can reference.

## Installing External Secrets Operator

Deploy the operator using Helm:

```bash
# Add External Secrets Helm repository
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

# Install the operator
helm install external-secrets \
  external-secrets/external-secrets \
  -n external-secrets-system \
  --create-namespace \
  --set installCRDs=true

# Verify installation
kubectl get pods -n external-secrets-system
kubectl wait --for=condition=available --timeout=300s \
  deployment/external-secrets -n external-secrets-system
```

Verify the CRDs are installed:

```bash
kubectl get crd | grep external-secrets
# Should show:
# externalsecrets.external-secrets.io
# secretstores.external-secrets.io
# clustersecretstores.external-secrets.io
```

## Setting Up AWS Secrets Manager Integration

First, create secrets in AWS Secrets Manager:

```bash
# Create sample secrets in AWS
aws secretsmanager create-secret \
  --name production/database/password \
  --secret-string "super-secret-password"

aws secretsmanager create-secret \
  --name production/api/keys \
  --secret-string '{"api_key": "abc123", "api_secret": "xyz789"}'
```

Create an IAM policy for the operator:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:123456789:secret:production/*"
    }
  ]
}
```

Configure IRSA (IAM Roles for Service Accounts) for EKS:

```bash
# Create IAM role with OIDC provider
eksctl create iamserviceaccount \
  --name external-secrets-sa \
  --namespace production \
  --cluster my-cluster \
  --attach-policy-arn arn:aws:iam::123456789:policy/ExternalSecretsPolicy \
  --approve
```

Create a SecretStore:

```yaml
# secretstore-aws.yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secretsmanager
  namespace: production
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-sa
```

Apply the SecretStore:

```bash
kubectl apply -f secretstore-aws.yaml

# Verify SecretStore is ready
kubectl get secretstore -n production
```

## Migrating Existing Secrets

Inventory your current Kubernetes Secrets:

```bash
# List all secrets in a namespace
kubectl get secrets -n production

# Export secret data (excluding service account tokens)
kubectl get secrets -n production -o json | \
  jq '.items[] | select(.type != "kubernetes.io/service-account-token") |
  {name: .metadata.name, keys: (.data | keys)}' > secrets-inventory.json
```

For each secret, create corresponding entries in AWS Secrets Manager:

```bash
#!/bin/bash
# migrate-secrets-to-aws.sh

NAMESPACE="production"
AWS_PREFIX="production"

# Get all non-system secrets
kubectl get secrets -n $NAMESPACE -o json | \
  jq -r '.items[] |
    select(.type != "kubernetes.io/service-account-token") |
    .metadata.name' | \
  while read secret_name; do
    echo "Migrating secret: $secret_name"

    # Get secret data
    kubectl get secret $secret_name -n $NAMESPACE -o json | \
      jq -r '.data | to_entries[] | "\(.key)=\(.value | @base64d)"' | \
      while IFS='=' read -r key value; do
        # Create individual key in AWS Secrets Manager
        aws secretsmanager create-secret \
          --name "${AWS_PREFIX}/${secret_name}/${key}" \
          --secret-string "$value" 2>/dev/null || \
        aws secretsmanager update-secret \
          --secret-id "${AWS_PREFIX}/${secret_name}/${key}" \
          --secret-string "$value"

        echo "  Migrated key: $key"
      done
  done
```

Create ExternalSecret resources:

```yaml
# externalsecret-database.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: postgres-credentials
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secretsmanager
    kind: SecretStore
  target:
    name: postgres-credentials  # Name of Kubernetes Secret to create
    creationPolicy: Owner
  data:
  - secretKey: password
    remoteRef:
      key: production/database/password
  - secretKey: username
    remoteRef:
      key: production/database/username
```

For JSON secrets with multiple keys:

```yaml
# externalsecret-api-keys.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: api-credentials
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secretsmanager
    kind: SecretStore
  target:
    name: api-credentials
    creationPolicy: Owner
  dataFrom:
  - extract:
      key: production/api/keys
```

Apply the ExternalSecrets:

```bash
kubectl apply -f externalsecret-database.yaml
kubectl apply -f externalsecret-api-keys.yaml

# Verify secrets were created
kubectl get externalsecrets -n production
kubectl get secrets -n production
```

## HashiCorp Vault Integration

For organizations using Vault, the setup is similar but uses Vault-specific authentication:

```bash
# Enable Kubernetes auth in Vault
vault auth enable kubernetes

# Configure Kubernetes auth
vault write auth/kubernetes/config \
  kubernetes_host="https://kubernetes.default.svc:443" \
  kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt \
  token_reviewer_jwt=@/var/run/secrets/kubernetes.io/serviceaccount/token

# Create policy
vault policy write external-secrets - <<EOF
path "secret/data/production/*" {
  capabilities = ["read"]
}
EOF

# Create Vault role
vault write auth/kubernetes/role/external-secrets \
  bound_service_account_names=external-secrets-sa \
  bound_service_account_namespaces=production \
  policies=external-secrets \
  ttl=24h
```

Create SecretStore for Vault:

```yaml
# secretstore-vault.yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: vault-backend
  namespace: production
spec:
  provider:
    vault:
      server: "https://vault.example.com"
      path: "secret"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "external-secrets"
          serviceAccountRef:
            name: external-secrets-sa
```

Create ExternalSecret for Vault:

```yaml
# externalsecret-vault.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-config
  namespace: production
spec:
  refreshInterval: 5m
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: app-config
    creationPolicy: Owner
  data:
  - secretKey: DATABASE_URL
    remoteRef:
      key: production/database
      property: url
  - secretKey: DATABASE_PASSWORD
    remoteRef:
      key: production/database
      property: password
```

## Azure Key Vault Integration

For Azure environments, use Azure Key Vault:

```yaml
# secretstore-azure.yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: azure-keyvault
  namespace: production
spec:
  provider:
    azurekv:
      vaultUrl: "https://my-keyvault.vault.azure.net"
      authType: ManagedIdentity
      identityId: "00000000-0000-0000-0000-000000000000"
```

Create secrets in Azure Key Vault:

```bash
# Create secrets in Azure Key Vault
az keyvault secret set \
  --vault-name my-keyvault \
  --name database-password \
  --value "super-secret-password"

az keyvault secret set \
  --vault-name my-keyvault \
  --name api-key \
  --value "abc123xyz789"
```

ExternalSecret for Azure:

```yaml
# externalsecret-azure.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: azure-secrets
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: azure-keyvault
    kind: SecretStore
  target:
    name: azure-secrets
    creationPolicy: Owner
  data:
  - secretKey: db-password
    remoteRef:
      key: database-password
  - secretKey: api-key
    remoteRef:
      key: api-key
```

## Google Secret Manager Integration

For GCP environments:

```yaml
# secretstore-gcp.yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: gcpsm-secretstore
  namespace: production
spec:
  provider:
    gcpsm:
      projectID: "my-gcp-project"
      auth:
        workloadIdentity:
          clusterLocation: us-central1
          clusterName: my-gke-cluster
          serviceAccountRef:
            name: external-secrets-sa
```

Create secrets in Google Secret Manager:

```bash
# Create secrets in GCP Secret Manager
echo -n "super-secret-password" | \
  gcloud secrets create database-password --data-file=-

echo -n "abc123xyz789" | \
  gcloud secrets create api-key --data-file=-
```

ExternalSecret for GCP:

```yaml
# externalsecret-gcp.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: gcp-secrets
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: gcpsm-secretstore
    kind: SecretStore
  target:
    name: gcp-secrets
    creationPolicy: Owner
  data:
  - secretKey: database-password
    remoteRef:
      key: database-password
      version: latest
  - secretKey: api-key
    remoteRef:
      key: api-key
      version: latest
```

## Automated Migration Script

Create a comprehensive migration script:

```python
#!/usr/bin/env python3
# migrate-to-external-secrets.py

import subprocess
import json
import yaml
import base64
from typing import Dict, List

def get_k8s_secrets(namespace: str) -> List[Dict]:
    """Get all non-system secrets from namespace"""
    cmd = f"kubectl get secrets -n {namespace} -o json"
    result = subprocess.run(cmd.split(), capture_output=True, text=True)
    data = json.loads(result.stdout)

    secrets = []
    for item in data['items']:
        if item['type'] != 'kubernetes.io/service-account-token':
            secrets.append({
                'name': item['metadata']['name'],
                'data': item['data']
            })
    return secrets

def create_aws_secret(secret_name: str, key: str, value: str, prefix: str):
    """Create secret in AWS Secrets Manager"""
    full_name = f"{prefix}/{secret_name}/{key}"
    decoded_value = base64.b64decode(value).decode('utf-8')

    # Try create, fallback to update
    try:
        cmd = ['aws', 'secretsmanager', 'create-secret',
               '--name', full_name,
               '--secret-string', decoded_value]
        subprocess.run(cmd, check=True, capture_output=True)
        print(f"Created: {full_name}")
    except subprocess.CalledProcessError:
        cmd = ['aws', 'secretsmanager', 'update-secret',
               '--secret-id', full_name,
               '--secret-string', decoded_value]
        subprocess.run(cmd, check=True, capture_output=True)
        print(f"Updated: {full_name}")

def generate_external_secret_yaml(secret_name: str, keys: List[str],
                                   namespace: str, prefix: str) -> Dict:
    """Generate ExternalSecret YAML"""
    external_secret = {
        'apiVersion': 'external-secrets.io/v1beta1',
        'kind': 'ExternalSecret',
        'metadata': {
            'name': secret_name,
            'namespace': namespace
        },
        'spec': {
            'refreshInterval': '1h',
            'secretStoreRef': {
                'name': 'aws-secretsmanager',
                'kind': 'SecretStore'
            },
            'target': {
                'name': secret_name,
                'creationPolicy': 'Owner'
            },
            'data': []
        }
    }

    for key in keys:
        external_secret['spec']['data'].append({
            'secretKey': key,
            'remoteRef': {
                'key': f"{prefix}/{secret_name}/{key}"
            }
        })

    return external_secret

def main():
    namespace = 'production'
    aws_prefix = 'production'

    # Get all secrets
    secrets = get_k8s_secrets(namespace)

    for secret in secrets:
        print(f"\nProcessing secret: {secret['name']}")

        # Upload to AWS Secrets Manager
        keys = []
        for key, value in secret['data'].items():
            create_aws_secret(secret['name'], key, value, aws_prefix)
            keys.append(key)

        # Generate ExternalSecret manifest
        es_yaml = generate_external_secret_yaml(
            secret['name'], keys, namespace, aws_prefix
        )

        # Write to file
        filename = f"externalsecret-{secret['name']}.yaml"
        with open(filename, 'w') as f:
            yaml.dump(es_yaml, f, default_flow_style=False)
        print(f"Generated: {filename}")

if __name__ == '__main__':
    main()
```

## Rollout Strategy

Phase the migration to minimize risk:

**Phase 1: Test with Non-Critical Secrets**
```bash
# Create ExternalSecret alongside existing Secret with different name
kubectl apply -f externalsecret-test.yaml

# Verify sync works
kubectl get externalsecret test -n production
kubectl get secret test-external -n production

# Compare values
kubectl get secret original -n production -o jsonpath='{.data.key}' | base64 -d
kubectl get secret test-external -n production -o jsonpath='{.data.key}' | base64 -d
```

**Phase 2: Update Application to Use External Secrets**
```yaml
# Modify deployment to use externally-sourced secret
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      containers:
      - name: app
        env:
        - name: DATABASE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-credentials  # Now sourced from ExternalSecret
              key: password
```

**Phase 3: Delete Old Native Secrets**
```bash
# Once verified, delete old secrets
kubectl delete secret old-native-secret -n production
```

## Monitoring and Alerting

Monitor External Secrets Operator:

```yaml
# servicemonitor-eso.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: external-secrets
  namespace: external-secrets-system
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: external-secrets
  endpoints:
  - port: metrics
```

Create alerts for sync failures:

```yaml
# prometheus-rules-eso.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: external-secrets-alerts
spec:
  groups:
  - name: external-secrets
    rules:
    - alert: ExternalSecretSyncFailed
      expr: externalsecret_sync_calls_error > 0
      for: 5m
      annotations:
        summary: "ExternalSecret {{ $labels.name }} sync failed"
```

## Conclusion

Migrating from native Kubernetes Secrets to External Secrets Operator centralizes secret management, enables automated rotation, provides audit trails, and integrates with enterprise secret management systems. The migration requires careful planning and phased rollout, but the security and operational benefits make it worthwhile for production Kubernetes environments.
