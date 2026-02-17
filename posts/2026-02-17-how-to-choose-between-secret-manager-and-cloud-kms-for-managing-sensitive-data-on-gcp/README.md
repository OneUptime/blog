# How to Choose Between Secret Manager and Cloud KMS for Managing Sensitive Data on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Secret Manager, Cloud KMS, Security, Encryption, Key Management

Description: Understand the differences between Google Cloud Secret Manager and Cloud KMS so you can pick the right service for storing and protecting sensitive data.

---

Secret Manager and Cloud KMS both deal with sensitive data on Google Cloud, but they solve different problems. I have seen teams use one where they should use the other, leading to awkward workarounds. Understanding what each service is actually designed for prevents that.

## The Key Distinction

**Secret Manager** stores and manages secrets - API keys, database passwords, certificates, tokens. You put a secret value in, and your application retrieves it at runtime. Think of it as a secure vault for configuration values.

**Cloud KMS** manages encryption keys and performs cryptographic operations. It does not store your data. It stores keys that you use to encrypt and decrypt your data. Think of it as a locksmith who makes and manages keys, but does not store your belongings.

If you need to store a database password, use Secret Manager. If you need to encrypt a file or a database column, use Cloud KMS.

## Feature Comparison

| Feature | Secret Manager | Cloud KMS |
|---------|---------------|-----------|
| Primary purpose | Store and retrieve secrets | Key management and cryptography |
| Stores data | Yes (secret values up to 64 KiB) | No (stores keys, not data) |
| Encryption | Automatic (encrypted at rest) | You control encryption keys |
| Versioning | Built-in version management | Key versions (rotation) |
| Access control | IAM per secret | IAM per key/keyring |
| Audit logging | Cloud Audit Logs | Cloud Audit Logs |
| Rotation | Manual or automatic (with triggers) | Automatic key rotation |
| Operations | Store, retrieve, list, delete | Encrypt, decrypt, sign, verify |
| Max value size | 64 KiB per version | Depends on operation |
| Cost | $0.06/10K access operations | $0.06/10K crypto operations + key storage |
| Integration | Application code, GKE, Cloud Run | Application code, CMEK for GCP services |

## When to Use Secret Manager

### Storing Application Secrets

The most common use case - storing credentials that your application needs at runtime:

```python
# Retrieving a database password from Secret Manager
from google.cloud import secretmanager

def get_secret(secret_id, version="latest"):
    """Retrieve a secret value from Secret Manager."""
    client = secretmanager.SecretManagerServiceClient()
    project_id = "my-project"

    # Build the resource name
    name = f"projects/{project_id}/secrets/{secret_id}/versions/{version}"

    # Access the secret
    response = client.access_secret_version(request={"name": name})
    return response.payload.data.decode("UTF-8")

# Use the secret in your application
db_password = get_secret("database-password")
api_key = get_secret("stripe-api-key")
jwt_signing_key = get_secret("jwt-secret")
```

### Creating and Managing Secrets

```bash
# Create a secret
echo -n "my-database-password-123" | \
    gcloud secrets create db-password \
    --data-file=- \
    --replication-policy=automatic

# Add a new version (rotate the secret)
echo -n "new-password-456" | \
    gcloud secrets versions add db-password --data-file=-

# List all versions of a secret
gcloud secrets versions list db-password

# Disable an old version
gcloud secrets versions disable 1 --secret=db-password

# Grant access to a service account
gcloud secrets add-iam-policy-binding db-password \
    --member="serviceAccount:my-app@my-project.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

### Using Secrets in GKE

```yaml
# Mount secrets from Secret Manager into a GKE pod
# Using the Secret Store CSI driver
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: my-app-secrets
spec:
  provider: gcp
  parameters:
    secrets: |
      - resourceName: "projects/my-project/secrets/db-password/versions/latest"
        path: "db-password"
      - resourceName: "projects/my-project/secrets/api-key/versions/latest"
        path: "api-key"
---
apiVersion: v1
kind: Pod
metadata:
  name: my-app
spec:
  containers:
    - name: app
      image: my-app:latest
      volumeMounts:
        - name: secrets
          mountPath: "/secrets"
          readOnly: true
  volumes:
    - name: secrets
      csi:
        driver: secrets-store.csi.k8s.io
        readOnly: true
        volumeAttributes:
          secretProviderClass: my-app-secrets
```

### Using Secrets in Cloud Run

```bash
# Deploy a Cloud Run service with secrets mounted as env variables
gcloud run deploy my-api \
    --image=gcr.io/my-project/my-api:latest \
    --region=us-central1 \
    --set-secrets="DB_PASSWORD=db-password:latest,API_KEY=stripe-api-key:latest"

# Or mount as a file
gcloud run deploy my-api \
    --image=gcr.io/my-project/my-api:latest \
    --region=us-central1 \
    --set-secrets="/secrets/db-password=db-password:latest"
```

### Automatic Secret Rotation

Set up automatic rotation using Cloud Functions:

```bash
# Create a rotation schedule
gcloud secrets update db-password \
    --rotation-period=30d \
    --next-rotation-time=2026-03-01T00:00:00Z \
    --topics=projects/my-project/topics/secret-rotation
```

```python
# Cloud Function that handles secret rotation
import functions_framework
from google.cloud import secretmanager
import secrets
import string

@functions_framework.cloud_event
def rotate_secret(cloud_event):
    """Triggered by Pub/Sub when a secret needs rotation."""
    client = secretmanager.SecretManagerServiceClient()

    # Generate a new secure password
    alphabet = string.ascii_letters + string.digits + string.punctuation
    new_password = ''.join(secrets.choice(alphabet) for i in range(32))

    # Add the new version to Secret Manager
    parent = cloud_event.data["message"]["attributes"]["secretId"]
    client.add_secret_version(
        request={
            "parent": parent,
            "payload": {"data": new_password.encode("UTF-8")}
        }
    )

    # Update the actual service that uses this password
    # (e.g., update the database user password)
    update_database_password(new_password)
```

## When to Use Cloud KMS

### Encrypting Data in Your Application

Use Cloud KMS when you need to encrypt data before storing it:

```python
# Encrypt sensitive data using Cloud KMS
from google.cloud import kms

def encrypt_data(plaintext, key_name):
    """Encrypt data using a Cloud KMS key."""
    client = kms.KeyManagementServiceClient()

    # Convert plaintext to bytes
    plaintext_bytes = plaintext.encode("utf-8")

    # Call the Cloud KMS API to encrypt
    response = client.encrypt(
        request={
            "name": key_name,
            "plaintext": plaintext_bytes
        }
    )

    return response.ciphertext

def decrypt_data(ciphertext, key_name):
    """Decrypt data using a Cloud KMS key."""
    client = kms.KeyManagementServiceClient()

    response = client.decrypt(
        request={
            "name": key_name,
            "ciphertext": ciphertext
        }
    )

    return response.plaintext.decode("utf-8")

# Usage: encrypt a credit card number before storing in database
key_name = "projects/my-project/locations/global/keyRings/my-keyring/cryptoKeys/data-key"
encrypted_cc = encrypt_data("4111-1111-1111-1111", key_name)
# Store encrypted_cc in your database

# Later, decrypt it
original_cc = decrypt_data(encrypted_cc, key_name)
```

### Setting Up Customer-Managed Encryption Keys (CMEK)

Cloud KMS keys can be used to encrypt GCP resources instead of using Google-managed keys:

```bash
# Create a key ring and key for CMEK
gcloud kms keyrings create my-keyring \
    --location=us-central1

gcloud kms keys create storage-key \
    --keyring=my-keyring \
    --location=us-central1 \
    --purpose=encryption \
    --rotation-period=90d

# Use the key to encrypt a Cloud Storage bucket
gsutil mb -l us-central1 \
    -k projects/my-project/locations/us-central1/keyRings/my-keyring/cryptoKeys/storage-key \
    gs://my-encrypted-bucket/

# Use the key to encrypt a BigQuery dataset
bq mk --dataset \
    --default_kms_key=projects/my-project/locations/us-central1/keyRings/my-keyring/cryptoKeys/storage-key \
    my_dataset

# Use the key to encrypt Compute Engine disks
gcloud compute disks create encrypted-disk \
    --zone=us-central1-a \
    --kms-key=projects/my-project/locations/us-central1/keyRings/my-keyring/cryptoKeys/storage-key
```

### Digital Signatures

Cloud KMS supports asymmetric keys for signing and verification:

```python
# Sign data using Cloud KMS asymmetric key
import hashlib
from google.cloud import kms

def sign_data(data, key_version_name):
    """Sign data using a Cloud KMS asymmetric key."""
    client = kms.KeyManagementServiceClient()

    # Create a SHA-256 digest of the data
    data_hash = hashlib.sha256(data.encode("utf-8")).digest()

    # Sign the digest
    response = client.asymmetric_sign(
        request={
            "name": key_version_name,
            "digest": {"sha256": data_hash}
        }
    )

    return response.signature

# Sign a document
key_version = "projects/my-project/locations/global/keyRings/my-keyring/cryptoKeys/signing-key/cryptoKeyVersions/1"
signature = sign_data("important document content", key_version)
```

## Using Them Together

The most robust pattern uses both services together. Secret Manager stores the secret values, and Cloud KMS provides an additional encryption layer:

```bash
# Create a Secret Manager secret encrypted with a customer-managed KMS key
gcloud secrets create super-sensitive-secret \
    --replication-policy=user-managed \
    --locations=us-central1 \
    --kms-key-name=projects/my-project/locations/us-central1/keyRings/my-keyring/cryptoKeys/secret-encryption-key \
    --data-file=secret-value.txt
```

This means even Google cannot read the secret without access to your KMS key - providing an additional layer of control.

## Decision Guide

| Scenario | Use This |
|----------|---------|
| Store a database password | Secret Manager |
| Store an API key | Secret Manager |
| Store a TLS certificate | Secret Manager |
| Encrypt data before storing in a database | Cloud KMS |
| Encrypt Cloud Storage buckets with your own key | Cloud KMS |
| Sign JWTs or documents | Cloud KMS |
| Rotate credentials automatically | Secret Manager (with Cloud Functions) |
| Rotate encryption keys automatically | Cloud KMS |
| Comply with "bring your own key" requirements | Cloud KMS |
| Store environment variables securely | Secret Manager |

## Conclusion

Secret Manager stores secrets. Cloud KMS manages encryption keys. They are complementary, not competing services. Use Secret Manager for anything your application needs to read as a value (passwords, API keys, certificates). Use Cloud KMS when you need to perform cryptographic operations (encrypt data, sign documents) or when you want customer-managed encryption for GCP resources. For maximum security, use both together - store your secrets in Secret Manager with CMEK encryption provided by Cloud KMS.
