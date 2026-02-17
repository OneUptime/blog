# How to Migrate Azure Key Vault Secrets to Google Secret Manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Secret Manager, Azure Key Vault, Security, Secrets Management, Cloud Migration

Description: A practical guide to migrating secrets, keys, and certificates from Azure Key Vault to Google Secret Manager, covering safe extraction, creation, and access pattern conversion.

---

Azure Key Vault and Google Secret Manager both store sensitive data like API keys, passwords, and certificates. The migration is conceptually simple - extract from one, create in the other - but you need to be careful about how you handle sensitive values during transit and how you update all the applications that consume those secrets.

Key Vault actually manages three types of objects: secrets, keys, and certificates. Google Secret Manager handles secrets. For cryptographic keys, you would use Cloud KMS, and for certificates, you would use Certificate Manager. This guide focuses on the secrets migration, which is the most common use case.

## Service Mapping

| Azure Key Vault | Google Cloud |
|----------------|-------------|
| Secrets | Secret Manager |
| Keys (cryptographic) | Cloud KMS |
| Certificates | Certificate Manager |
| Access policies | IAM bindings |
| Soft delete | Secret versions (disabled versions) |
| Purge protection | No direct equivalent (use org policies) |
| Secret versioning | Secret versions (numbered) |
| Key rotation | Custom rotation via Cloud Functions |

## Step 1: Inventory Key Vault Secrets

List everything stored in your Key Vault.

```bash
# List all secrets
az keyvault secret list \
  --vault-name my-keyvault \
  --query '[*].{Name:name,Enabled:attributes.enabled,Created:attributes.created,Expires:attributes.expires}' \
  --output table

# Count secrets
az keyvault secret list \
  --vault-name my-keyvault \
  --query 'length(@)'

# List keys (for Cloud KMS migration)
az keyvault key list \
  --vault-name my-keyvault \
  --output table

# List certificates (for Certificate Manager migration)
az keyvault certificate list \
  --vault-name my-keyvault \
  --output table
```

Document which applications consume each secret and how they access it (SDK, environment variable, mounted volume, etc.).

## Step 2: Export Secrets from Key Vault

Extract secret values carefully. Never write them to unencrypted files on shared systems.

```bash
# Get a single secret value
az keyvault secret show \
  --vault-name my-keyvault \
  --name my-database-password \
  --query 'value' \
  --output tsv
```

For bulk export with direct transfer to GCP (preferred approach):

```python
# Direct migration script - reads from Key Vault, writes to Secret Manager
from azure.keyvault.secrets import SecretClient
from azure.identity import DefaultAzureCredential
from google.cloud import secretmanager
import re

# Initialize Azure Key Vault client
azure_cred = DefaultAzureCredential()
vault_url = 'https://my-keyvault.vault.azure.net/'
kv_client = SecretClient(vault_url=vault_url, credential=azure_cred)

# Initialize Google Secret Manager client
sm_client = secretmanager.SecretManagerServiceClient()
project_id = 'my-gcp-project'
parent = f'projects/{project_id}'

# Iterate through all secrets and migrate
migrated = 0
failed = 0

for secret_properties in kv_client.list_properties_of_secrets():
    azure_name = secret_properties.name

    # Convert name to GCP-compatible format
    # Secret Manager allows letters, numbers, hyphens, and underscores
    gcp_name = re.sub(r'[^a-zA-Z0-9_-]', '-', azure_name)

    try:
        # Get the secret value from Azure
        secret = kv_client.get_secret(azure_name)
        secret_value = secret.value

        if not secret_value:
            print(f"Skipping {azure_name}: empty value")
            continue

        # Create the secret in Google Secret Manager
        sm_client.create_secret(
            request={
                'parent': parent,
                'secret_id': gcp_name,
                'secret': {
                    'replication': {'automatic': {}},
                    'labels': {
                        'migrated-from': 'azure-keyvault',
                        'source-vault': 'my-keyvault'
                    }
                }
            }
        )

        # Add the secret value as the first version
        sm_client.add_secret_version(
            request={
                'parent': f'{parent}/secrets/{gcp_name}',
                'payload': {'data': secret_value.encode('utf-8')}
            }
        )

        migrated += 1
        print(f"Migrated: {azure_name} -> {gcp_name}")

    except Exception as e:
        failed += 1
        print(f"Failed: {azure_name} - {e}")

print(f"\nMigration complete: {migrated} migrated, {failed} failed")
```

## Step 3: Handle Secret Versions

Azure Key Vault keeps old versions of secrets. If you need to migrate version history:

```python
# Migrate all versions of a secret
def migrate_with_versions(kv_client, sm_client, secret_name, project_id):
    """Migrate all versions of a Key Vault secret to Secret Manager."""
    gcp_name = re.sub(r'[^a-zA-Z0-9_-]', '-', secret_name)
    parent = f'projects/{project_id}/secrets/{gcp_name}'

    # Create the secret in Secret Manager
    sm_client.create_secret(
        request={
            'parent': f'projects/{project_id}',
            'secret_id': gcp_name,
            'secret': {'replication': {'automatic': {}}}
        }
    )

    # Get all versions of the secret (oldest first)
    versions = list(kv_client.list_properties_of_secret_versions(secret_name))
    versions.sort(key=lambda v: v.created_on)

    for version_props in versions:
        if not version_props.enabled:
            continue

        # Get the version value
        secret = kv_client.get_secret(secret_name, version=version_props.version)

        if secret.value:
            # Add as a new version in Secret Manager
            sm_client.add_secret_version(
                request={
                    'parent': parent,
                    'payload': {'data': secret.value.encode('utf-8')}
                }
            )
            print(f"  Version {version_props.version} migrated")
```

## Step 4: Update Application Code

Convert your application from the Azure Key Vault SDK to the Google Secret Manager SDK.

Python:

```python
# Old Azure Key Vault code
from azure.keyvault.secrets import SecretClient
from azure.identity import DefaultAzureCredential

credential = DefaultAzureCredential()
client = SecretClient(vault_url='https://my-keyvault.vault.azure.net/', credential=credential)

def get_secret(name):
    secret = client.get_secret(name)
    return secret.value

# New Google Secret Manager code
from google.cloud import secretmanager

client = secretmanager.SecretManagerServiceClient()

def get_secret(name, project_id='my-gcp-project'):
    """Retrieve a secret value from Google Secret Manager."""
    resource_name = f'projects/{project_id}/secrets/{name}/versions/latest'
    response = client.access_secret_version(request={'name': resource_name})
    return response.payload.data.decode('utf-8')
```

Node.js:

```javascript
// Old Azure Key Vault code
const { SecretClient } = require('@azure/keyvault-secrets');
const { DefaultAzureCredential } = require('@azure/identity');

const client = new SecretClient(
  'https://my-keyvault.vault.azure.net/',
  new DefaultAzureCredential()
);

async function getSecret(name) {
  const secret = await client.getSecret(name);
  return secret.value;
}

// New Google Secret Manager code
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

const client = new SecretManagerServiceClient();

async function getSecret(name, projectId = 'my-gcp-project') {
  // Access the latest version of the named secret
  const [version] = await client.accessSecretVersion({
    name: `projects/${projectId}/secrets/${name}/versions/latest`
  });
  return version.payload.data.toString('utf-8');
}
```

## Step 5: Set Up IAM Permissions

Map Key Vault access policies to Secret Manager IAM bindings.

```bash
# Map Key Vault access policies to Secret Manager IAM roles:
# Key Vault: Get secret -> Secret Manager: secretmanager.secretAccessor
# Key Vault: Set secret -> Secret Manager: secretmanager.secretVersionAdder
# Key Vault: List secrets -> Secret Manager: secretmanager.viewer
# Key Vault: Delete secret -> Secret Manager: secretmanager.admin

# Grant read access to a service account for specific secrets
gcloud secrets add-iam-policy-binding my-database-password \
  --member="serviceAccount:my-app@my-project.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Grant read access to all secrets (broader)
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:my-app@my-project.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Grant version management (for rotation scripts)
gcloud secrets add-iam-policy-binding my-database-password \
  --member="serviceAccount:rotation-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretVersionAdder"
```

## Step 6: Handle Kubernetes Integration

If you use Azure Key Vault with AKS (CSI driver or pod identity), migrate to Secret Manager integration with GKE.

```yaml
# Old AKS - Azure Key Vault CSI driver
apiVersion: v1
kind: Pod
metadata:
  name: my-app
spec:
  containers:
    - name: my-app
      volumeMounts:
        - name: secrets-store
          mountPath: "/mnt/secrets"
  volumes:
    - name: secrets-store
      csi:
        driver: secrets-store.csi.k8s.io
        readOnly: true
        volumeAttributes:
          secretProviderClass: azure-kv-provider

# New GKE - Using Secret Manager with environment variables
apiVersion: v1
kind: Pod
metadata:
  name: my-app
spec:
  serviceAccountName: my-app-ksa
  containers:
    - name: my-app
      env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-password
              key: password
```

Sync Secret Manager secrets to Kubernetes secrets using External Secrets Operator:

```yaml
# External Secrets Operator - sync from Secret Manager to K8s secrets
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-credentials
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: gcp-secret-store
    kind: ClusterSecretStore
  target:
    name: db-credentials
  data:
    - secretKey: password
      remoteRef:
        key: my-database-password
        version: latest
```

## Step 7: Set Up Rotation

Replace Key Vault auto-rotation with Cloud Functions and Cloud Scheduler.

```bash
# Create a Cloud Function for secret rotation
gcloud functions deploy rotate-db-password \
  --gen2 \
  --runtime=python312 \
  --region=us-central1 \
  --source=. \
  --entry-point=rotate_secret \
  --trigger-http \
  --no-allow-unauthenticated \
  --service-account=rotation-sa@my-project.iam.gserviceaccount.com

# Schedule rotation every 90 days
gcloud scheduler jobs create http rotate-db-password-job \
  --schedule="0 0 1 */3 *" \
  --uri="https://us-central1-my-project.cloudfunctions.net/rotate-db-password" \
  --http-method=POST \
  --oidc-service-account-email=rotation-sa@my-project.iam.gserviceaccount.com
```

## Step 8: Validate

Verify all secrets are accessible and applications work correctly.

```bash
# List all migrated secrets
gcloud secrets list \
  --filter="labels.migrated-from=azure-keyvault" \
  --format='table(name, createTime, labels)'

# Verify a specific secret is accessible
gcloud secrets versions access latest --secret=my-database-password

# Count secrets to compare with source
gcloud secrets list --format='value(name)' | wc -l
```

Test each application that consumes secrets to verify they can read their values from Secret Manager.

## Summary

Migrating secrets from Azure Key Vault to Google Secret Manager is one of the simpler migration tasks from a technical standpoint. The direct pipeline approach - reading from Key Vault and writing to Secret Manager without intermediate files - is the safest method. The main effort goes into updating all the applications and services that consume secrets, setting up proper IAM bindings, and configuring rotation schedules. Always test in a non-production environment first, and have a rollback plan that includes keeping Key Vault accessible until you have fully validated the new setup.
