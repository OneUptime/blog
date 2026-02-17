# How to Detect and Block Deployment of Unsigned Container Images with Binary Authorization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Binary Authorization, Container Security, GKE, Image Signing

Description: Learn how to use Binary Authorization on GCP to detect and prevent deployment of unsigned or unverified container images to your GKE clusters.

---

Running unsigned container images in production is like accepting unsigned checks - you have no way to verify where they came from or whether they've been tampered with. Binary Authorization on GCP solves this by acting as a gatekeeper for your GKE clusters, checking that every image has been cryptographically signed before it's allowed to run.

In this guide, I'll show you how to set up Binary Authorization from scratch, configure it to block unsigned images, handle the operational realities like break-glass procedures, and monitor deployment attempts.

## Understanding Image Signing

When we say an image is "signed," we mean an attestor has created a cryptographic signature over the image digest. The digest is a SHA-256 hash of the image contents, so any modification to the image changes the digest, invalidating the signature. This gives you two guarantees: the image came from a trusted source (authentication) and it hasn't been modified since signing (integrity).

## Enabling Binary Authorization

Start by enabling the required APIs and creating the basic setup:

```bash
# Enable Binary Authorization and Container Analysis APIs
gcloud services enable binaryauthorization.googleapis.com
gcloud services enable containeranalysis.googleapis.com
gcloud services enable container.googleapis.com

# Enable Binary Authorization on your GKE cluster
gcloud container clusters update my-cluster \
    --zone us-central1-a \
    --binauthz-evaluation-mode=PROJECT_SINGLETON_POLICY_ENFORCE
```

## Creating the Signing Infrastructure

Set up the KMS key and attestor that will sign your images:

```bash
# Create a keyring for image signing
gcloud kms keyrings create image-signing \
    --location=global

# Create an asymmetric signing key
gcloud kms keys create image-signer \
    --keyring=image-signing \
    --location=global \
    --purpose=asymmetric-signing \
    --default-algorithm=rsa-sign-pkcs1-4096-sha512

# Create the Container Analysis note (required for attestors)
curl -X POST \
    "https://containeranalysis.googleapis.com/v1/projects/YOUR_PROJECT/notes?noteId=image-signing-note" \
    -H "Authorization: Bearer $(gcloud auth print-access-token)" \
    -H "Content-Type: application/json" \
    -d '{
        "attestation": {
            "hint": {
                "humanReadableName": "Image signing attestor"
            }
        }
    }'

# Create the attestor
gcloud container binauthz attestors create image-signing-attestor \
    --attestation-authority-note=image-signing-note \
    --attestation-authority-note-project=YOUR_PROJECT

# Attach the KMS key to the attestor
gcloud container binauthz attestors public-keys add \
    --attestor=image-signing-attestor \
    --keyversion-project=YOUR_PROJECT \
    --keyversion-location=global \
    --keyversion-keyring=image-signing \
    --keyversion-key=image-signer \
    --keyversion=1
```

## Configuring the Enforcement Policy

Define the policy that requires attestation for all deployments:

```yaml
# binauthz-policy.yaml
admissionWhitelistPatterns:
  # Allow GKE system images that GKE needs to function
  - namePattern: "gcr.io/google_containers/*"
  - namePattern: "gcr.io/gke-release/*"
  - namePattern: "gcr.io/config-management-release/*"
  - namePattern: "gcr.io/stackdriver-agents/*"
  - namePattern: "gke.gcr.io/*"
  - namePattern: "registry.k8s.io/*"

globalPolicyEvaluationMode: ENABLE

defaultAdmissionRule:
  evaluationMode: REQUIRE_ATTESTATION
  enforcementMode: ENFORCED_BLOCK_AND_AUDIT_LOG
  requireAttestationsBy:
    - projects/YOUR_PROJECT/attestors/image-signing-attestor
```

Apply the policy:

```bash
gcloud container binauthz policy import binauthz-policy.yaml
```

## Signing Images in CI/CD

Integrate image signing into your build pipeline:

```yaml
# cloudbuild.yaml
steps:
  # Build the image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/YOUR_PROJECT/app/myservice:$COMMIT_SHA'
      - '.'
    id: 'build'

  # Push to Artifact Registry
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'us-central1-docker.pkg.dev/YOUR_PROJECT/app/myservice:$COMMIT_SHA'
    id: 'push'

  # Sign the image after all checks pass
  - name: 'gcr.io/cloud-builders/gcloud'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Get the image digest (the actual content hash)
        IMAGE_URL="us-central1-docker.pkg.dev/YOUR_PROJECT/app/myservice:$COMMIT_SHA"
        DIGEST=$(gcloud artifacts docker images describe "$IMAGE_URL" \
          --format='value(image_summary.digest)')

        echo "Signing image: $IMAGE_URL with digest: $DIGEST"

        # Create the attestation (this is the signing step)
        gcloud container binauthz attestations sign-and-create \
          --artifact-url="us-central1-docker.pkg.dev/YOUR_PROJECT/app/myservice@${DIGEST}" \
          --attestor="image-signing-attestor" \
          --attestor-project="YOUR_PROJECT" \
          --keyversion-project="YOUR_PROJECT" \
          --keyversion-location="global" \
          --keyversion-keyring="image-signing" \
          --keyversion-key="image-signer" \
          --keyversion="1"

        echo "Attestation created successfully"
    id: 'sign'
    waitFor: ['push']
```

## Testing the Enforcement

Verify that unsigned images get blocked:

```bash
# Try deploying an unsigned image (should be rejected)
kubectl run test-unsigned \
    --image=us-central1-docker.pkg.dev/YOUR_PROJECT/app/unattested-image:latest

# Expected output:
# Error: admission webhook "imagepolicywebhook.image-policy.k8s.io" denied the request:
# Image us-central1-docker.pkg.dev/YOUR_PROJECT/app/unattested-image:latest
# denied by attestor projects/YOUR_PROJECT/attestors/image-signing-attestor:
# No attestations found

# Now try deploying a signed image (should succeed)
kubectl run test-signed \
    --image=us-central1-docker.pkg.dev/YOUR_PROJECT/app/myservice@sha256:abc123...

# Expected output:
# pod/test-signed created
```

## Break-Glass Procedure

Sometimes you need to deploy an unsigned image in an emergency. Binary Authorization supports a break-glass annotation:

```yaml
# emergency-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: emergency-fix
  annotations:
    # This annotation bypasses Binary Authorization
    alpha.image-policy.k8s.io/break-glass: "Emergency fix for incident INC-1234"
spec:
  replicas: 1
  selector:
    matchLabels:
      app: emergency-fix
  template:
    metadata:
      labels:
        app: emergency-fix
    spec:
      containers:
        - name: app
          image: us-central1-docker.pkg.dev/YOUR_PROJECT/app/hotfix:latest
```

Critically, you need to monitor break-glass usage so it doesn't become the default:

```python
from google.cloud import logging_v2

def check_break_glass_usage():
    """Monitor for break-glass deployments and alert the security team"""
    client = logging_v2.Client()

    # Query for break-glass events in the last 24 hours
    filter_str = (
        'resource.type="k8s_cluster" '
        'protoPayload.request.metadata.annotations.'
        '"alpha.image-policy.k8s.io/break-glass" != ""'
    )

    entries = client.list_entries(
        filter_=filter_str,
        order_by=logging_v2.DESCENDING,
        page_size=100,
    )

    break_glass_events = []
    for entry in entries:
        break_glass_events.append({
            "timestamp": entry.timestamp.isoformat(),
            "user": entry.payload.get("authenticationInfo", {}).get(
                "principalEmail", "unknown"
            ),
            "image": _extract_image(entry.payload),
            "justification": _extract_annotation(entry.payload),
        })

    if break_glass_events:
        send_security_alert(break_glass_events)

    return break_glass_events
```

## Monitoring Blocked Deployments

Set up alerting for when Binary Authorization blocks a deployment:

```bash
# Create a log-based metric for blocked deployments
gcloud logging metrics create binauthz-blocked-deployments \
    --description="Count of deployments blocked by Binary Authorization" \
    --log-filter='resource.type="k8s_cluster" protoPayload.response.status.message:"denied by attestor"'

# Create an alert policy
gcloud alpha monitoring policies create \
    --display-name="Binary Auth Blocked Deployment" \
    --condition-display-name="Unsigned image deployment attempted" \
    --condition-filter='metric.type="logging.googleapis.com/user/binauthz-blocked-deployments"' \
    --condition-threshold-value=1 \
    --condition-threshold-duration=0s \
    --notification-channels=YOUR_NOTIFICATION_CHANNEL
```

## Listing and Auditing Attestations

Regularly audit which images have been attested:

```bash
# List all attestations for a specific image
gcloud container binauthz attestations list \
    --attestor=image-signing-attestor \
    --artifact-url="us-central1-docker.pkg.dev/YOUR_PROJECT/app/myservice@sha256:abc123"

# List all attestations from the attestor (for audit purposes)
gcloud container binauthz attestations list \
    --attestor=image-signing-attestor \
    --format="table(name, createTime, resourceUri)"
```

## Dry-Run Mode for Rollout

If you're adding Binary Authorization to an existing cluster, start with dry-run mode to see what would be blocked without actually blocking anything:

```bash
# Enable dry-run mode first
gcloud container clusters update my-cluster \
    --zone us-central1-a \
    --binauthz-evaluation-mode=POLICY_BINDINGS_AND_PROJECT_SINGLETON_POLICY_ENFORCE

# Monitor the audit logs for what would be blocked
gcloud logging read \
    'resource.type="k8s_cluster" AND jsonPayload.enforcementMode="DRYRUN_AUDIT_LOG_ONLY"' \
    --limit=50 \
    --format="table(timestamp, jsonPayload.podName, jsonPayload.imageName)"
```

## Wrapping Up

Binary Authorization turns image signing from a nice-to-have into an enforced requirement. The setup takes some initial effort - creating keys, setting up attestors, modifying your CI/CD pipeline - but once it's in place, you have a hard guarantee that only verified images run in your clusters. The break-glass procedure ensures you're never truly locked out in an emergency, and monitoring break-glass usage keeps that escape hatch from being abused. Start with a single non-critical cluster, get your signing workflow smooth, and then expand to production.
