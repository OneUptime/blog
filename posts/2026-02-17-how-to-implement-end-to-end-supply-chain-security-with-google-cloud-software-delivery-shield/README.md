# How to Implement End-to-End Supply Chain Security with Google Cloud Software Delivery Shield

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Software Delivery Shield, Supply Chain Security, Binary Authorization, Cloud Build

Description: Learn how to implement end-to-end software supply chain security on Google Cloud using Software Delivery Shield, Binary Authorization, and SLSA framework compliance.

---

Software supply chain attacks have gone from theoretical risks to front-page news. SolarWinds, Log4Shell, and the Codecov breach showed that compromising one link in the software delivery chain can affect thousands of downstream users. Google Cloud's Software Delivery Shield provides a set of integrated tools to secure every stage of your software supply chain, from source code to production deployment.

This guide walks through implementing a complete supply chain security setup using Software Delivery Shield components.

## The Supply Chain Security Problem

A modern software delivery pipeline has many stages where things can go wrong. Source code can be tampered with, dependencies can be compromised, build systems can be hijacked, container images can be modified after building, and deployment configurations can be altered. Securing each stage individually is not enough - you need end-to-end verification that what you deploy is exactly what you intended.

## The SLSA Framework

Software Delivery Shield is built around the SLSA (Supply chain Levels for Software Artifacts) framework. SLSA defines four levels of supply chain security maturity. Level 1 requires build provenance documentation. Level 2 requires a hosted build service. Level 3 requires hardened builds with non-falsifiable provenance. Level 4 requires hermetic, reproducible builds with two-person review.

Google Cloud tools help you reach SLSA Level 3 with reasonable effort.

## Step 1: Secure Your Source Code

Start with Cloud Source Repositories or a connected GitHub/GitLab repository with proper access controls and commit signing.

```bash
# Enable commit signing verification in your repository
# First, set up GPG signing locally
gpg --full-generate-key

# Configure git to use your GPG key
git config --global user.signingkey YOUR_GPG_KEY_ID
git config --global commit.gpgsign true

# For Cloud Source Repositories, enable branch protection
gcloud source repos update my-repo \
  --project=PROJECT_ID \
  --add-branch-protection="main" \
  --require-signed-commits
```

## Step 2: Configure Cloud Build with Provenance

Cloud Build generates SLSA provenance automatically, documenting who built the artifact, what source code was used, and what build steps ran.

```yaml
# cloudbuild.yaml
# Build configuration with supply chain security controls
steps:
  # Step 1: Run SAST (Static Application Security Testing)
  - name: 'gcr.io/cloud-builders/gcloud'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Run security scanning on source code
        echo "Running static analysis..."

  # Step 2: Scan dependencies for known vulnerabilities
  - name: 'gcr.io/cloud-builders/npm'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        npm audit --production
        # Fail the build if high or critical vulnerabilities found
        npm audit --production --audit-level=high

  # Step 3: Build the container image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', '${_REGION}-docker.pkg.dev/${PROJECT_ID}/${_REPO}/${_IMAGE}:${SHORT_SHA}', '.']

  # Step 4: Scan the built image for vulnerabilities
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'artifacts'
      - 'docker'
      - 'images'
      - 'scan'
      - '${_REGION}-docker.pkg.dev/${PROJECT_ID}/${_REPO}/${_IMAGE}:${SHORT_SHA}'
      - '--format=json'

  # Step 5: Push to Artifact Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', '${_REGION}-docker.pkg.dev/${PROJECT_ID}/${_REPO}/${_IMAGE}:${SHORT_SHA}']

# Enable provenance generation (SLSA Level 3)
options:
  requestedVerifyOption: VERIFIED
  logging: CLOUD_LOGGING_ONLY

# Store images in Artifact Registry
images:
  - '${_REGION}-docker.pkg.dev/${PROJECT_ID}/${_REPO}/${_IMAGE}:${SHORT_SHA}'

substitutions:
  _REGION: us-central1
  _REPO: my-app-repo
  _IMAGE: my-app
```

## Step 3: Set Up Artifact Registry with Vulnerability Scanning

Artifact Registry with automatic vulnerability scanning checks every pushed image for known vulnerabilities.

```bash
# Create an Artifact Registry repository with vulnerability scanning
gcloud artifacts repositories create secure-apps \
  --repository-format=docker \
  --location=us-central1 \
  --description="Secure application images" \
  --project=PROJECT_ID

# Enable vulnerability scanning (on by default for Artifact Registry)
gcloud services enable containeranalysis.googleapis.com
gcloud services enable containerscanning.googleapis.com

# Check scan results for an image
gcloud artifacts docker images list-vulnerabilities \
  us-central1-docker.pkg.dev/PROJECT_ID/secure-apps/my-app:latest \
  --format="table(vulnerability.shortDescription,vulnerability.severity,vulnerability.fixAvailable)"
```

## Step 4: Implement Binary Authorization

Binary Authorization ensures that only trusted, verified container images can be deployed to GKE. It checks for attestations - cryptographic signatures that prove an image has passed specific checks.

```bash
# Enable Binary Authorization
gcloud services enable binaryauthorization.googleapis.com

# Create an attestor for build verification
gcloud container binauthz attestors create build-attestor \
  --attestation-authority-note=build-note \
  --attestation-authority-note-project=PROJECT_ID

# Create a KMS key for signing attestations
gcloud kms keyrings create binauthz-keys --location=global
gcloud kms keys create attestation-key \
  --keyring=binauthz-keys \
  --location=global \
  --purpose=asymmetric-signing \
  --default-algorithm=ec-sign-p256-sha256

# Associate the key with the attestor
gcloud container binauthz attestors public-keys add \
  --attestor=build-attestor \
  --keyversion-project=PROJECT_ID \
  --keyversion-location=global \
  --keyversion-keyring=binauthz-keys \
  --keyversion-key=attestation-key \
  --keyversion=1
```

## Step 5: Create the Binary Authorization Policy

The policy defines which attestations are required before an image can be deployed.

```yaml
# binauthz-policy.yaml
# Binary Authorization policy requiring build attestation
defaultAdmissionRule:
  evaluationMode: REQUIRE_ATTESTATION
  enforcementMode: ENFORCED_BLOCK_AND_AUDIT_LOG
  requireAttestationsBy:
    - projects/PROJECT_ID/attestors/build-attestor

# Allow specific system images without attestation
admissionWhitelistPatterns:
  - namePattern: "gcr.io/google-containers/*"
  - namePattern: "gcr.io/gke-release/*"
  - namePattern: "us-central1-docker.pkg.dev/PROJECT_ID/secure-apps/*"

# Cluster-specific overrides (optional)
clusterAdmissionRules:
  us-central1.production-cluster:
    evaluationMode: REQUIRE_ATTESTATION
    enforcementMode: ENFORCED_BLOCK_AND_AUDIT_LOG
    requireAttestationsBy:
      - projects/PROJECT_ID/attestors/build-attestor
      - projects/PROJECT_ID/attestors/security-scan-attestor
```

```bash
# Apply the policy
gcloud container binauthz policy import binauthz-policy.yaml

# Enable Binary Authorization on your GKE cluster
gcloud container clusters update production-cluster \
  --zone=us-central1-a \
  --binauthz-evaluation-mode=PROJECT_SINGLETON_POLICY_ENFORCE
```

## Step 6: Automate Attestation in CI/CD

Add attestation creation to your Cloud Build pipeline so that images are automatically attested after passing all checks.

```python
from google.cloud import binaryauthorization_v1
from google.cloud import kms

def create_attestation(project_id, image_uri, attestor_id):
    """Create a Binary Authorization attestation for a verified image."""
    client = binaryauthorization_v1.BinauthzManagementServiceV1Client()

    # Get the image digest (required for attestation)
    import subprocess
    result = subprocess.run(
        ["gcloud", "artifacts", "docker", "images", "describe", image_uri,
         "--format=value(image_summary.digest)"],
        capture_output=True, text=True,
    )
    digest = result.stdout.strip()
    image_with_digest = f"{image_uri.split(':')[0]}@{digest}"

    # Sign the attestation with KMS
    kms_client = kms.KeyManagementServiceClient()
    key_name = (
        f"projects/{project_id}/locations/global/keyRings/binauthz-keys"
        f"/cryptoKeys/attestation-key/cryptoKeyVersions/1"
    )

    # Create the attestation payload
    payload = f'{{"resourceUri": "{image_with_digest}"}}'.encode()

    # Sign with KMS
    sign_response = kms_client.asymmetric_sign(
        request={
            "name": key_name,
            "data": payload,
        }
    )

    # Create the attestation via the Binary Authorization API
    attestation = {
        "resource_uri": image_with_digest,
        "signatures": [
            {
                "public_key_id": key_name,
                "signature": sign_response.signature,
            }
        ],
    }

    print(f"Created attestation for {image_with_digest}")
    return attestation
```

## Step 7: Monitor Supply Chain Security

Set up comprehensive monitoring for your supply chain security controls.

```bash
# Monitor for Binary Authorization violations
gcloud logging read '
  resource.type="k8s_cluster"
  AND protoPayload.response.reason="FORBIDDEN"
  AND protoPayload.response.message:"Binary Authorization"
' --limit=50 --format=json

# Check vulnerability scan results across all images
gcloud artifacts docker images list \
  us-central1-docker.pkg.dev/PROJECT_ID/secure-apps \
  --include-tags \
  --format="table(version,tags,metadata.vulnerabilities)"
```

The flow from code commit to production deployment should now look like this: code is committed with signed commits, Cloud Build builds and scans the image, vulnerability scanning checks for known CVEs, attestation is created after all checks pass, Binary Authorization verifies the attestation before allowing deployment, and everything is logged and auditable.

Software supply chain security is not a single tool - it is a chain of verification steps that together provide confidence that what runs in production is exactly what you intended to build. Software Delivery Shield integrates these steps into a cohesive workflow on Google Cloud.
