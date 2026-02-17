# How to Set Up Container Image Signing and Verification with Cosign on Google Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cosign, Container Security, Artifact Registry, DevOps

Description: Set up container image signing with Cosign and Google Cloud KMS, then enforce signature verification before deployment to GKE clusters.

---

If you are deploying containers to production without signing them, you have a gap in your supply chain security. Anyone who can push an image to your registry can potentially get code running in your cluster. Image signing adds a cryptographic proof that an image was built by your trusted pipeline and has not been tampered with.

Cosign, part of the Sigstore project, is the standard tool for container image signing. It works well with Google Cloud KMS for key management and Artifact Registry for image storage. In this post, I will walk through the full setup from key creation to deployment-time verification.

## Why Sign Container Images

Without image signing, your deployment pipeline trusts the registry. If the registry is compromised, or if someone with push access uploads a malicious image, there is nothing to stop it from being deployed. With signing, you add an independent verification step - the image must have a valid signature from a known key before it can run.

## Setting Up KMS Keys for Signing

Cosign supports multiple key types. For production use on GCP, KMS-managed keys are the way to go because they never leave the HSM:

```hcl
# kms.tf
# KMS key for Cosign image signing

resource "google_kms_key_ring" "cosign" {
  name     = "cosign-keyring"
  location = "global"
  project  = var.project_id
}

resource "google_kms_crypto_key" "cosign_signing_key" {
  name     = "image-signing-key"
  key_ring = google_kms_key_ring.cosign.id
  purpose  = "ASYMMETRIC_SIGN"

  version_template {
    # ECDSA P-256 with SHA256 - recommended for Cosign
    algorithm        = "EC_SIGN_P256_SHA256"
    protection_level = "HSM"
  }

  # Rotate signing keys every 90 days
  rotation_period = "7776000s"

  lifecycle {
    prevent_destroy = true
  }
}

# Grant Cloud Build permission to sign with this key
resource "google_kms_crypto_key_iam_member" "cloudbuild_signer" {
  crypto_key_id = google_kms_crypto_key.cosign_signing_key.id
  role          = "roles/cloudkms.signerVerifier"
  member        = "serviceAccount:${var.project_number}@cloudbuild.gserviceaccount.com"
}
```

## Installing and Configuring Cosign

Install Cosign locally for testing, and we will add it to the CI pipeline later:

```bash
# Install Cosign
go install github.com/sigstore/cosign/v2/cmd/cosign@latest

# Verify the installation
cosign version

# Generate a key pair using KMS (no local private key stored)
cosign generate-key-pair \
  --kms gcpkms://projects/my-project/locations/global/keyRings/cosign-keyring/cryptoKeys/image-signing-key
```

## Signing Images in Your CI Pipeline

Add image signing to your Cloud Build pipeline. This step runs after the image is built and pushed:

```yaml
# cloudbuild.yaml
# Build pipeline with Cosign image signing
steps:
  # Step 1: Build the container image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'us-docker.pkg.dev/${PROJECT_ID}/my-repo/my-app:${SHORT_SHA}'
      - '.'
    id: 'build'

  # Step 2: Push the image to Artifact Registry
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'us-docker.pkg.dev/${PROJECT_ID}/my-repo/my-app:${SHORT_SHA}'
    id: 'push'
    waitFor: ['build']

  # Step 3: Get the image digest for signing
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Get the digest of the pushed image
        IMAGE_DIGEST=$(gcloud artifacts docker images describe \
          us-docker.pkg.dev/${PROJECT_ID}/my-repo/my-app:${SHORT_SHA} \
          --format='value(image_summary.digest)')
        echo "$IMAGE_DIGEST" > /workspace/image_digest.txt
        echo "Image digest: $IMAGE_DIGEST"
    id: 'get-digest'
    waitFor: ['push']

  # Step 4: Sign the image with Cosign using KMS
  - name: 'gcr.io/projectsigstore/cosign'
    entrypoint: 'sh'
    args:
      - '-c'
      - |
        IMAGE_DIGEST=$(cat /workspace/image_digest.txt)
        # Sign the image using the KMS key
        cosign sign \
          --key gcpkms://projects/${PROJECT_ID}/locations/global/keyRings/cosign-keyring/cryptoKeys/image-signing-key \
          --yes \
          us-docker.pkg.dev/${PROJECT_ID}/my-repo/my-app@${IMAGE_DIGEST}
        echo "Image signed successfully"
    id: 'sign'
    waitFor: ['get-digest']

  # Step 5: Verify the signature before proceeding
  - name: 'gcr.io/projectsigstore/cosign'
    entrypoint: 'sh'
    args:
      - '-c'
      - |
        IMAGE_DIGEST=$(cat /workspace/image_digest.txt)
        # Verify the signature
        cosign verify \
          --key gcpkms://projects/${PROJECT_ID}/locations/global/keyRings/cosign-keyring/cryptoKeys/image-signing-key \
          us-docker.pkg.dev/${PROJECT_ID}/my-repo/my-app@${IMAGE_DIGEST}
        echo "Signature verified successfully"
    id: 'verify'
    waitFor: ['sign']

images:
  - 'us-docker.pkg.dev/${PROJECT_ID}/my-repo/my-app:${SHORT_SHA}'
```

## Adding Attestations with Cosign

Beyond just signing, you can attach attestations - structured metadata about the image build. This is useful for recording vulnerability scan results, SBOM data, and build provenance:

```bash
# Create a predicate file with build information
cat > /tmp/build-predicate.json << 'PREDICATE'
{
  "buildType": "https://cloud.google.com/build/v1",
  "builder": {
    "id": "https://cloudbuild.googleapis.com"
  },
  "invocation": {
    "configSource": {
      "uri": "https://github.com/myorg/myrepo",
      "entryPoint": "cloudbuild.yaml"
    }
  },
  "metadata": {
    "buildStartedOn": "2026-02-17T10:00:00Z",
    "completeness": {
      "parameters": true,
      "environment": true,
      "materials": true
    }
  }
}
PREDICATE

# Attach the attestation using cosign attest
cosign attest \
  --key gcpkms://projects/my-project/locations/global/keyRings/cosign-keyring/cryptoKeys/image-signing-key \
  --predicate /tmp/build-predicate.json \
  --type https://in-toto.io/Statement/v0.1 \
  --yes \
  us-docker.pkg.dev/my-project/my-repo/my-app@sha256:abc123
```

## Verifying Signatures at Deployment Time

The signing is only useful if you verify before deploying. There are two approaches: using a Kubernetes admission controller or using Binary Authorization.

Here is a Kyverno policy that verifies Cosign signatures:

```yaml
# kyverno-verify-signature.yaml
# Kyverno policy to verify Cosign signatures on all images
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-cosign-signature
spec:
  validationFailureAction: Enforce
  background: false
  rules:
    - name: verify-image-signature
      match:
        any:
          - resources:
              kinds:
                - Pod
      verifyImages:
        - imageReferences:
            - "us-docker.pkg.dev/my-project/my-repo/*"
          attestors:
            - entries:
                - keys:
                    kms: gcpkms://projects/my-project/locations/global/keyRings/cosign-keyring/cryptoKeys/image-signing-key
          # Also verify attestations
          attestations:
            - type: https://in-toto.io/Statement/v0.1
              attestors:
                - entries:
                    - keys:
                        kms: gcpkms://projects/my-project/locations/global/keyRings/cosign-keyring/cryptoKeys/image-signing-key
```

## Using Binary Authorization with Cosign

You can also use Google's Binary Authorization to enforce signature verification natively:

```python
# verify_and_attest.py
# Creates a Binary Authorization attestation from a Cosign signature
from google.cloud import binaryauthorization_v1
from google.cloud import kms_v1
import subprocess
import json

def verify_cosign_and_create_binauthz_attestation(
    project_id, image_url, key_name, attestor_name
):
    """Verify Cosign signature and create Binary Authorization attestation."""

    # First verify with Cosign
    result = subprocess.run(
        [
            "cosign", "verify",
            "--key", f"gcpkms://{key_name}",
            image_url,
        ],
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        print(f"Cosign verification failed: {result.stderr}")
        return False

    print("Cosign signature verified successfully")

    # Parse the verified signatures
    signatures = json.loads(result.stdout)

    # Create Binary Authorization attestation
    binauthz_client = binaryauthorization_v1.BinauthzManagementServiceV1Client()

    # The attestation links the verified image to Binary Authorization
    attestation = {
        "resource_uri": image_url,
        "attestation": {
            "serialized_payload": json.dumps(signatures[0]).encode("utf-8"),
            "signatures": [{
                "public_key_id": key_name,
            }]
        }
    }

    print(f"Binary Authorization attestation created for {image_url}")
    return True
```

## Key Rotation Strategy

Rotate your signing keys regularly. Here is how to handle the transition:

```bash
# Create a new key version (old versions remain for verification)
gcloud kms keys versions create \
  --key image-signing-key \
  --keyring cosign-keyring \
  --location global \
  --algorithm ec-sign-p256-sha256 \
  --protection-level hsm

# New builds will use the latest key version automatically
# Old images remain verifiable with their original key version

# List all key versions to see which are active
gcloud kms keys versions list \
  --key image-signing-key \
  --keyring cosign-keyring \
  --location global
```

## Wrapping Up

Container image signing with Cosign and GCP KMS is a foundational supply chain security control. The workflow is straightforward: build, push, sign, verify, deploy. The critical piece is the enforcement - making sure unsigned or incorrectly signed images cannot reach your cluster. Whether you use Kyverno, Binary Authorization, or another admission controller, the verification step must be mandatory and non-bypassable. Start by signing in your main pipeline, add verification in audit mode, then switch to enforcement once you are confident everything is working correctly.
