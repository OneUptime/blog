# How to Create HSM-Protected Keys Using Cloud HSM in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud HSM, Cloud KMS, Hardware Security Module, Encryption

Description: Learn how to create and use HSM-protected cryptographic keys in Google Cloud KMS, providing hardware-backed key security for compliance-sensitive workloads.

---

Software-backed encryption keys are secure enough for most workloads. The key material is stored in Google's infrastructure, protected by layers of software encryption, and never exposed in plaintext outside of Google's servers. But some compliance requirements - FIPS 140-2 Level 3, PCI DSS for certain use cases, financial regulations in various jurisdictions - mandate that cryptographic keys be generated and used within a certified hardware security module (HSM).

Cloud HSM is Google's managed HSM service, integrated directly into Cloud KMS. You create keys with a protection level of `HSM` instead of `SOFTWARE`, and all cryptographic operations happen inside FIPS 140-2 Level 3 certified hardware. The API is identical to regular Cloud KMS - your application code does not change at all. The only differences are the protection level specification and the pricing.

## What Cloud HSM Provides

Cloud HSM guarantees that:

- Key material is generated inside the HSM and never leaves it
- All cryptographic operations (encrypt, decrypt, sign, verify) happen inside the HSM
- The HSM hardware is FIPS 140-2 Level 3 certified
- Key material cannot be extracted, even by Google
- Operations are logged in Cloud Audit Logs

This matters for compliance because you can demonstrate to auditors that your keys are hardware-protected, without operating your own HSM infrastructure.

## Prerequisites

- A GCP project with Cloud KMS API enabled
- The `roles/cloudkms.admin` role for key management
- Cloud HSM is available in most GCP regions, but check availability for your specific location

```bash
# Enable Cloud KMS (Cloud HSM is part of the same API)
gcloud services enable cloudkms.googleapis.com --project=my-project-id
```

## Creating an HSM-Protected Symmetric Key

The process is identical to creating a software-backed key, with the addition of `--protection-level=hsm`:

```bash
# Create a key ring (if you do not have one already)
gcloud kms keyrings create hsm-keyring \
  --location=us-central1 \
  --project=my-project-id

# Create an HSM-protected symmetric encryption key
gcloud kms keys create hsm-encryption-key \
  --keyring=hsm-keyring \
  --location=us-central1 \
  --purpose=encryption \
  --protection-level=hsm \
  --rotation-period=7776000s \
  --next-rotation-time="2026-05-17T00:00:00Z" \
  --project=my-project-id
```

## Creating an HSM-Protected Asymmetric Signing Key

HSM protection is also available for asymmetric keys used for digital signatures:

```bash
# Create an HSM-protected RSA signing key
gcloud kms keys create hsm-signing-key-rsa \
  --keyring=hsm-keyring \
  --location=us-central1 \
  --purpose=asymmetric-signing \
  --protection-level=hsm \
  --default-algorithm=rsa-sign-pkcs1-4096-sha256 \
  --project=my-project-id

# Create an HSM-protected EC signing key
gcloud kms keys create hsm-signing-key-ec \
  --keyring=hsm-keyring \
  --location=us-central1 \
  --purpose=asymmetric-signing \
  --protection-level=hsm \
  --default-algorithm=ec-sign-p256-sha256 \
  --project=my-project-id
```

## Creating an HSM-Protected Asymmetric Encryption Key

For asymmetric encryption (typically used for key wrapping or secure key exchange):

```bash
# Create an HSM-protected RSA encryption key
gcloud kms keys create hsm-asymmetric-key \
  --keyring=hsm-keyring \
  --location=us-central1 \
  --purpose=asymmetric-encryption \
  --protection-level=hsm \
  --default-algorithm=rsa-decrypt-oaep-4096-sha256 \
  --project=my-project-id
```

## Creating HSM-Protected MAC Keys

For generating and verifying message authentication codes:

```bash
# Create an HSM-protected MAC key
gcloud kms keys create hsm-mac-key \
  --keyring=hsm-keyring \
  --location=us-central1 \
  --purpose=mac \
  --protection-level=hsm \
  --default-algorithm=hmac-sha256 \
  --project=my-project-id
```

## Terraform Configuration

```hcl
# Key ring for HSM keys
resource "google_kms_key_ring" "hsm_keyring" {
  name     = "hsm-keyring"
  location = "us-central1"
  project  = var.project_id
}

# HSM-protected symmetric encryption key
resource "google_kms_crypto_key" "hsm_encryption" {
  name            = "hsm-encryption-key"
  key_ring        = google_kms_key_ring.hsm_keyring.id
  purpose         = "ENCRYPT_DECRYPT"
  rotation_period = "7776000s"

  version_template {
    algorithm        = "GOOGLE_SYMMETRIC_ENCRYPTION"
    protection_level = "HSM"
  }

  lifecycle {
    prevent_destroy = true
  }
}

# HSM-protected asymmetric signing key
resource "google_kms_crypto_key" "hsm_signing" {
  name     = "hsm-signing-key"
  key_ring = google_kms_key_ring.hsm_keyring.id
  purpose  = "ASYMMETRIC_SIGN"

  version_template {
    algorithm        = "EC_SIGN_P256_SHA256"
    protection_level = "HSM"
  }

  lifecycle {
    prevent_destroy = true
  }
}
```

## Using HSM Keys (Same API as Software Keys)

The beauty of Cloud HSM is that the API is identical to software-backed keys. Your application code does not need to know whether a key is HSM-backed or software-backed.

### Encrypt and Decrypt

```bash
# Encrypt using an HSM key (same command as software keys)
echo -n "sensitive financial data" > plaintext.txt
gcloud kms encrypt \
  --key=hsm-encryption-key \
  --keyring=hsm-keyring \
  --location=us-central1 \
  --plaintext-file=plaintext.txt \
  --ciphertext-file=encrypted.dat \
  --project=my-project-id

# Decrypt using an HSM key
gcloud kms decrypt \
  --key=hsm-encryption-key \
  --keyring=hsm-keyring \
  --location=us-central1 \
  --ciphertext-file=encrypted.dat \
  --plaintext-file=decrypted.txt \
  --project=my-project-id
```

### Sign and Verify

```python
# Python: Sign data with an HSM-backed key
from google.cloud import kms
import hashlib

def sign_with_hsm(project_id, location, keyring, key_name, key_version, data):
    """Sign data using an HSM-protected asymmetric key."""
    client = kms.KeyManagementServiceClient()

    # Build the key version path
    key_version_path = client.crypto_key_version_path(
        project_id, location, keyring, key_name, key_version
    )

    # Calculate the digest of the data
    digest = hashlib.sha256(data.encode("utf-8")).digest()

    # Sign the digest (the operation happens inside the HSM)
    response = client.asymmetric_sign(
        request={
            "name": key_version_path,
            "digest": {"sha256": digest},
        }
    )

    return response.signature

# Usage
signature = sign_with_hsm(
    "my-project-id", "us-central1", "hsm-keyring",
    "hsm-signing-key-ec", "1", "document to sign"
)
print(f"Signature length: {len(signature)} bytes")
```

## HSM Key Attestation

Cloud HSM provides cryptographic attestation that proves a key was generated inside an HSM. You can retrieve the attestation for audit purposes:

```bash
# Get the attestation for an HSM key version
gcloud kms keys versions describe 1 \
  --key=hsm-encryption-key \
  --keyring=hsm-keyring \
  --location=us-central1 \
  --project=my-project-id \
  --format=json | jq '.attestation'
```

The attestation includes:
- A certificate chain proving the key was generated in a certified HSM
- The key's attributes (algorithm, purpose, etc.)
- A signature over the attestation data

You can verify the attestation offline using the HSM manufacturer's root certificate. This provides auditable proof that the key material never existed outside of hardware protection.

```bash
# Download the attestation content for offline verification
gcloud kms keys versions get-certificate-chain 1 \
  --key=hsm-encryption-key \
  --keyring=hsm-keyring \
  --location=us-central1 \
  --project=my-project-id
```

## Using HSM Keys with CMEK

HSM keys work with all GCP services that support CMEK. For example, encrypting Cloud Storage objects with an HSM-backed key:

```bash
# Set the default encryption key for a bucket to an HSM key
gcloud storage buckets update gs://my-sensitive-bucket \
  --default-encryption-key=projects/my-project-id/locations/us-central1/keyRings/hsm-keyring/cryptoKeys/hsm-encryption-key
```

Or encrypting BigQuery datasets:

```bash
# Create an encrypted BigQuery dataset
bq mk --dataset \
  --default_kms_key=projects/my-project-id/locations/us-central1/keyRings/hsm-keyring/cryptoKeys/hsm-encryption-key \
  my-project-id:sensitive_dataset
```

## Performance Considerations

HSM operations are slightly slower than software operations because the cryptographic computation happens inside dedicated hardware. For symmetric operations, the difference is small (typically a few milliseconds). For asymmetric operations (especially RSA with large key sizes), HSM operations can be noticeably slower.

Benchmark approximate latencies:
- Symmetric encrypt/decrypt (HSM): 10-20ms
- Symmetric encrypt/decrypt (Software): 5-10ms
- RSA-4096 sign (HSM): 100-200ms
- EC P-256 sign (HSM): 20-50ms

If latency is critical, consider using envelope encryption to minimize HSM calls, or use EC keys instead of RSA for signing operations.

## Cost Comparison

HSM keys cost more than software keys:
- HSM key versions have a higher monthly storage cost
- HSM cryptographic operations are priced higher per operation

The exact pricing varies, so check the Cloud KMS pricing page for current rates. For most compliance-driven workloads, the cost difference is negligible compared to the compliance value.

## When to Use HSM vs Software Keys

Use HSM when:
- Compliance mandates hardware-backed keys (FIPS 140-2 Level 3)
- You need attestation proving key material never left hardware
- You are in regulated industries (finance, healthcare, government)
- Your security policy requires the highest level of key protection

Use software keys when:
- No specific compliance requirement for hardware protection
- Cost optimization is a priority
- You need maximum throughput for cryptographic operations
- The threat model does not require hardware-level protection

Cloud HSM gives you hardware-grade key protection without the operational burden of managing physical HSM appliances. The integration with Cloud KMS means you can mix HSM and software keys in the same project, use the same APIs, and apply the same IAM policies. For compliance-sensitive workloads, it is the easiest path to hardware-backed key security.
