# How to Migrate AWS Secrets Manager Secrets to Google Secret Manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Secret Manager, AWS Secrets Manager, Security, Cloud Migration

Description: A practical walkthrough for migrating secrets from AWS Secrets Manager to Google Secret Manager, covering extraction, creation, versioning, and access patterns.

---

Secrets management is one of those migration tasks that is straightforward in concept but requires careful execution. You are dealing with sensitive data - API keys, database passwords, certificates, and other credentials that your applications depend on. Getting this wrong can cause outages or security issues.

Both AWS Secrets Manager and Google Secret Manager do essentially the same thing: store secrets, manage versions, control access, and enable rotation. The migration mostly involves extracting secrets from one and creating them in the other, then updating your application code to use the new access patterns.

## Service Comparison

Here are the key differences:

| Feature | AWS Secrets Manager | Google Secret Manager |
|---------|-------------------|---------------------|
| Secret size limit | 64 KB | 64 KB |
| Versioning | Staging labels (AWSCURRENT, AWSPREVIOUS) | Numeric versions (1, 2, 3...) plus aliases |
| Rotation | Built-in Lambda-based rotation | Custom rotation via Cloud Functions |
| Pricing | Per secret per month + per API call | Per secret version per month + per API call |
| Encryption | AWS KMS | Cloud KMS |
| Replication | Multi-region | Automatic or user-managed replication |

## Step 1: Inventory Your Secrets

Start by listing everything in AWS Secrets Manager.

```bash
# List all secrets with their metadata
aws secretsmanager list-secrets \
  --query 'SecretList[*].{
    Name:Name,
    Description:Description,
    RotationEnabled:RotationEnabled,
    LastChanged:LastChangedDate,
    Tags:Tags
  }' \
  --output table

# Count total secrets
aws secretsmanager list-secrets \
  --query 'length(SecretList)' \
  --output text
```

Categorize your secrets: which ones are actively used, which applications consume them, and which ones can be cleaned up rather than migrated.

## Step 2: Export Secrets Safely

Extract the secret values. This is the most sensitive part of the migration - handle these values with care.

```bash
# Export a single secret value
aws secretsmanager get-secret-value \
  --secret-id my-database-password \
  --query 'SecretString' \
  --output text

# For binary secrets
aws secretsmanager get-secret-value \
  --secret-id my-certificate \
  --query 'SecretBinary' \
  --output text | base64 --decode > cert.pem
```

For bulk export, use a script that writes to a temporary encrypted file:

```python
import boto3
import json

# Export all secrets to a local encrypted JSON file
# WARNING: Handle this file with extreme care and delete after migration
client = boto3.client('secretsmanager')

secrets = {}
paginator = client.get_paginator('list_secrets')

for page in paginator.paginate():
    for secret in page['SecretList']:
        name = secret['Name']
        try:
            # Retrieve the current secret value
            value = client.get_secret_value(SecretId=name)
            secrets[name] = {
                'value': value.get('SecretString', ''),
                'description': secret.get('Description', ''),
                'tags': secret.get('Tags', [])
            }
            print(f"Exported: {name}")
        except Exception as e:
            print(f"Failed to export {name}: {e}")

# Write to a temporary file - encrypt this and delete after migration
with open('/tmp/secrets-export.json', 'w') as f:
    json.dump(secrets, f, indent=2)

print(f"Exported {len(secrets)} secrets")
```

**Important**: Delete this export file immediately after the migration is complete. Better yet, pipe the values directly from AWS to GCP without writing to disk, which we cover next.

## Step 3: Create Secrets in Google Secret Manager

Create each secret in Google Secret Manager with its value.

```bash
# Create a single secret
echo -n "my-super-secret-password" | \
  gcloud secrets create my-database-password \
  --data-file=- \
  --replication-policy=automatic \
  --labels=migrated-from=aws,environment=production

# Create a secret with a description
gcloud secrets create my-api-key \
  --replication-policy=automatic \
  --labels=migrated-from=aws

# Add the secret value as the first version
echo -n "ak_live_abc123xyz" | \
  gcloud secrets versions add my-api-key --data-file=-
```

For bulk creation, use a script that reads from AWS and writes directly to GCP:

```python
import boto3
from google.cloud import secretmanager
import re

# Direct migration - reads from AWS and writes to GCP without intermediate files
aws_client = boto3.client('secretsmanager')
gcp_client = secretmanager.SecretManagerServiceClient()

project_id = 'my-gcp-project'
parent = f'projects/{project_id}'

paginator = aws_client.get_paginator('list_secrets')

for page in paginator.paginate():
    for secret_meta in page['SecretList']:
        aws_name = secret_meta['Name']

        # Convert AWS secret name to GCP-compatible format
        # GCP secret names only allow alphanumeric, hyphens, and underscores
        gcp_name = re.sub(r'[^a-zA-Z0-9_-]', '-', aws_name)

        try:
            # Get the value from AWS
            aws_value = aws_client.get_secret_value(SecretId=aws_name)
            secret_data = aws_value.get('SecretString', '').encode('utf-8')

            # Create the secret in GCP
            gcp_client.create_secret(
                request={
                    'parent': parent,
                    'secret_id': gcp_name,
                    'secret': {
                        'replication': {'automatic': {}},
                        'labels': {'migrated-from': 'aws'}
                    }
                }
            )

            # Add the secret version with the actual value
            gcp_client.add_secret_version(
                request={
                    'parent': f'{parent}/secrets/{gcp_name}',
                    'payload': {'data': secret_data}
                }
            )
            print(f"Migrated: {aws_name} -> {gcp_name}")

        except Exception as e:
            print(f"Failed: {aws_name} - {e}")
```

## Step 4: Update Application Code

Your applications need to switch from the AWS SDK to the Google Cloud SDK for secret access.

Python example:

```python
# Old AWS code
import boto3

def get_secret_aws(secret_name):
    client = boto3.client('secretsmanager')
    response = client.get_secret_value(SecretId=secret_name)
    return response['SecretString']

# New GCP code
from google.cloud import secretmanager

def get_secret_gcp(secret_name, project_id='my-project'):
    """Retrieve the latest version of a secret from Google Secret Manager."""
    client = secretmanager.SecretManagerServiceClient()
    name = f'projects/{project_id}/secrets/{secret_name}/versions/latest'
    response = client.access_secret_version(request={'name': name})
    return response.payload.data.decode('utf-8')
```

Node.js example:

```javascript
// Old AWS code
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

async function getSecretAWS(secretName) {
  const client = new SecretsManagerClient();
  const response = await client.send(new GetSecretValueCommand({ SecretId: secretName }));
  return response.SecretString;
}

// New GCP code
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

async function getSecretGCP(secretName, projectId = 'my-project') {
  // Access the latest version of the named secret
  const client = new SecretManagerServiceClient();
  const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
  const [version] = await client.accessSecretVersion({ name });
  return version.payload.data.toString('utf-8');
}
```

## Step 5: Set Up IAM Permissions

Map your AWS IAM policies for Secrets Manager access to GCP IAM roles.

```bash
# Grant a service account access to read specific secrets
gcloud secrets add-iam-policy-binding my-database-password \
  --member="serviceAccount:my-app-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Grant access to all secrets in the project (broader, use with caution)
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:my-app-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Step 6: Handle Secret Rotation

If you have automatic rotation configured in AWS (Lambda-based), set up equivalent rotation in GCP using Cloud Functions and Cloud Scheduler.

```bash
# Create a Cloud Scheduler job to trigger rotation every 30 days
gcloud scheduler jobs create http rotate-db-password \
  --schedule="0 0 1 * *" \
  --uri="https://us-central1-my-project.cloudfunctions.net/rotate-secret" \
  --http-method=POST \
  --body='{"secret_name": "my-database-password"}' \
  --oidc-service-account-email=rotation-sa@my-project.iam.gserviceaccount.com
```

## Step 7: Validate and Clean Up

After migration, verify that all secrets are accessible and your applications work correctly.

```bash
# List all secrets in GCP to verify they were created
gcloud secrets list --format='table(name, createTime, labels)'

# Verify a specific secret value matches
gcloud secrets versions access latest --secret=my-database-password
```

Once everything is validated and running in production:

1. Remove the AWS Secrets Manager SDK from your applications
2. Delete the export files if any were created
3. Schedule deletion of AWS secrets after your rollback window expires

## Summary

Migrating secrets is less about technical complexity and more about operational discipline. The APIs are similar, the concepts map directly, and the migration script is straightforward. The key is handling the sensitive data carefully during transit - ideally piping values directly from AWS to GCP without writing to disk - and making sure every application that consumes secrets is updated and tested before you decommission the AWS side.
