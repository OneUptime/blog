# How to Scan Container Images for Vulnerabilities Using Artifact Analysis in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Artifact Analysis, Container Security, Vulnerability Scanning, DevOps, Security

Description: Use Google Cloud Artifact Analysis to scan container images for security vulnerabilities, view detailed reports, and integrate scanning into your CI/CD pipeline.

---

Artifact Analysis (formerly Container Analysis) is GCP's service for scanning container images and tracking security metadata. It goes beyond basic vulnerability scanning by providing a full picture of what is inside your container images - OS packages, application dependencies, licenses, and known vulnerabilities.

Let me show you how to use Artifact Analysis for comprehensive container security.

## Enabling Artifact Analysis

Start by enabling the required APIs:

```bash
# Enable Container Analysis and on-demand scanning APIs
gcloud services enable \
  containeranalysis.googleapis.com \
  containerscanning.googleapis.com \
  ondemandscanning.googleapis.com \
  --project=my-project
```

Once enabled, automatic scanning kicks in for all images pushed to Artifact Registry (and Container Registry) in your project.

## Automatic Scanning

After enabling the APIs, every Docker image pushed to Artifact Registry is automatically scanned. There is no additional configuration needed:

```bash
# Push an image - it gets scanned automatically
docker push us-central1-docker.pkg.dev/my-project/my-repo/my-app:v1.0.0
```

The scan typically completes within a few minutes after the push. For large images with many packages, it might take a bit longer.

## Viewing Scan Results

### Using gcloud

```bash
# View the vulnerability summary for an image
gcloud artifacts docker images describe \
  us-central1-docker.pkg.dev/my-project/my-repo/my-app:v1.0.0 \
  --show-package-vulnerability \
  --project=my-project
```

For a detailed list of all vulnerabilities:

```bash
# List all vulnerability occurrences for an image
gcloud artifacts docker images list-vulnerabilities \
  us-central1-docker.pkg.dev/my-project/my-repo/my-app:v1.0.0 \
  --format='table(
    vulnerability.shortDescription,
    vulnerability.effectiveSeverity,
    vulnerability.packageIssue[0].affectedPackage,
    vulnerability.packageIssue[0].affectedVersion.fullName,
    vulnerability.packageIssue[0].fixedVersion.fullName
  )' \
  --project=my-project
```

This shows each vulnerability along with the affected package, the vulnerable version, and the fixed version (if available).

### Using the API

For programmatic access, use the Container Analysis API:

```bash
# Get occurrences for a specific image using the API
gcloud artifacts docker images describe \
  us-central1-docker.pkg.dev/my-project/my-repo/my-app:v1.0.0 \
  --show-all-metadata \
  --format=json \
  --project=my-project
```

## On-Demand Scanning

On-demand scanning lets you scan images before pushing them or scan images from external registries. This is useful for shift-left security practices.

### Scanning a Local Image

```bash
# Build an image locally
docker build -t my-app:latest .

# Tag it for Artifact Registry
docker tag my-app:latest \
  us-central1-docker.pkg.dev/my-project/my-repo/my-app:test

# Push it temporarily for scanning
docker push us-central1-docker.pkg.dev/my-project/my-repo/my-app:test

# Run an on-demand scan
SCAN_RESULT=$(gcloud artifacts docker images scan \
  us-central1-docker.pkg.dev/my-project/my-repo/my-app:test \
  --location=us-central1 \
  --format='value(response.scan)')

# View the results
gcloud artifacts docker images list-vulnerabilities $SCAN_RESULT \
  --format='table(
    vulnerability.shortDescription,
    vulnerability.effectiveSeverity,
    vulnerability.packageIssue[0].affectedPackage,
    vulnerability.packageIssue[0].fixedVersion.fullName
  )'
```

### Scanning with Additional Packages

On-demand scanning can also detect vulnerabilities in application-level packages like npm, pip, Go modules, and Java dependencies:

```bash
# Scan with additional package types
gcloud artifacts docker images scan \
  us-central1-docker.pkg.dev/my-project/my-repo/my-app:v1.0.0 \
  --location=us-central1 \
  --additional-package-types=GO,NPM,PYPI,MAVEN \
  --format='value(response.scan)'
```

## Integrating with Cloud Build

Add vulnerability scanning as a gate in your CI/CD pipeline:

```yaml
# cloudbuild.yaml - Scan and gate on vulnerabilities
steps:
  # Build the image
  - id: 'build'
    name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA'
      - '.'

  # Push the image
  - id: 'push'
    name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA']
    waitFor: ['build']

  # Scan and check for vulnerabilities
  - id: 'vulnerability-check'
    name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Run the scan
        echo "Scanning image for vulnerabilities..."
        SCAN=$(gcloud artifacts docker images scan \
          us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA \
          --location=us-central1 \
          --format='value(response.scan)')

        # Count vulnerabilities by severity
        echo "Checking scan results..."
        RESULTS=$(gcloud artifacts docker images list-vulnerabilities $SCAN \
          --format='value(vulnerability.effectiveSeverity)')

        CRITICAL_COUNT=$(echo "$RESULTS" | grep -c 'CRITICAL' || true)
        HIGH_COUNT=$(echo "$RESULTS" | grep -c 'HIGH' || true)

        echo "Critical: $CRITICAL_COUNT, High: $HIGH_COUNT"

        # Block on critical vulnerabilities
        if [ "$CRITICAL_COUNT" -gt 0 ]; then
          echo "BLOCKED: $CRITICAL_COUNT critical vulnerabilities found"
          gcloud artifacts docker images list-vulnerabilities $SCAN \
            --format='table(vulnerability.shortDescription, vulnerability.effectiveSeverity, vulnerability.packageIssue[0].affectedPackage, vulnerability.packageIssue[0].fixedVersion.fullName)' \
            --filter='vulnerability.effectiveSeverity=CRITICAL'
          exit 1
        fi

        # Warn on high vulnerabilities but do not block
        if [ "$HIGH_COUNT" -gt 0 ]; then
          echo "WARNING: $HIGH_COUNT high vulnerabilities found"
          gcloud artifacts docker images list-vulnerabilities $SCAN \
            --format='table(vulnerability.shortDescription, vulnerability.effectiveSeverity, vulnerability.packageIssue[0].affectedPackage, vulnerability.packageIssue[0].fixedVersion.fullName)' \
            --filter='vulnerability.effectiveSeverity=HIGH'
        fi

        echo "Scan passed. Proceeding with deployment."
    waitFor: ['push']

  # Deploy only if scan passes
  - id: 'deploy'
    name: 'gcr.io/cloud-builders/kubectl'
    args: ['set', 'image', 'deployment/my-app', 'my-app=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA']
    env:
      - 'CLOUDSDK_COMPUTE_ZONE=us-central1-a'
      - 'CLOUDSDK_CONTAINER_CLUSTER=my-cluster'
    waitFor: ['vulnerability-check']
```

## Continuous Monitoring

Artifact Analysis does not just scan at push time. It continuously monitors your images for newly discovered vulnerabilities. When a new CVE is published that affects a package in one of your images, the vulnerability report is updated automatically.

Set up notifications for new findings:

```bash
# Create a Pub/Sub topic for vulnerability notifications
gcloud pubsub topics create vulnerability-notes --project=my-project

# Create a subscription
gcloud pubsub subscriptions create vulnerability-sub \
  --topic=vulnerability-notes \
  --project=my-project
```

You can then use a Cloud Function to process these notifications and alert your team.

## Querying Across All Images

Find all images in your project that have critical vulnerabilities:

```bash
# List all images with their vulnerability counts
gcloud artifacts docker images list \
  us-central1-docker.pkg.dev/my-project/my-repo \
  --show-occurrences \
  --occurrence-filter='kind="VULNERABILITY" AND vulnerability.effectiveSeverity="CRITICAL"' \
  --format='table(package, tags, createTime)' \
  --project=my-project
```

## SBOM Generation

Artifact Analysis can also generate Software Bill of Materials (SBOM) for your images:

```bash
# Generate an SBOM for an image
gcloud artifacts sbom export \
  --resource=us-central1-docker.pkg.dev/my-project/my-repo/my-app:v1.0.0 \
  --project=my-project
```

SBOMs are increasingly required for compliance and give you a complete inventory of all software components in your container images.

## Best Practices

1. **Scan during development, not just at deploy time**. Use on-demand scanning in your local workflow to catch issues early.

2. **Block critical vulnerabilities in CI/CD**. Never ship images with known critical CVEs.

3. **Monitor existing images continuously**. New CVEs are discovered daily. An image that was clean yesterday might have vulnerabilities today.

4. **Keep base images updated**. Most vulnerabilities come from outdated OS packages in base images. Use minimal base images (Alpine, distroless) when possible.

5. **Fix or acknowledge vulnerabilities**. Do not just ignore scan results. Either fix them by updating packages or document why a particular CVE does not apply to your use case.

6. **Use SBOMs for compliance**. Generate and store SBOMs alongside your images for audit trails.

## Wrapping Up

Artifact Analysis provides comprehensive vulnerability scanning for your container images on GCP. Enable the APIs for automatic scanning, integrate on-demand scanning into your CI/CD pipeline for deployment gates, and use continuous monitoring to catch newly discovered vulnerabilities in your existing images. Combined with Binary Authorization, you can build a complete supply chain security solution that prevents vulnerable images from reaching production.
