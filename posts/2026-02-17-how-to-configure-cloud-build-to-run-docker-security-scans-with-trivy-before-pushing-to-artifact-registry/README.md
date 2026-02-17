# How to Configure Cloud Build to Run Docker Security Scans with Trivy Before Pushing to Artifact Registry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Build, Trivy, Docker, Security, Artifact Registry, Vulnerability Scanning

Description: Learn how to integrate Trivy vulnerability scanning into your Cloud Build pipeline to catch security issues before pushing images to Artifact Registry.

---

Pushing a Docker image to production without scanning it for vulnerabilities is like deploying code without running tests. You might get lucky, but eventually something will bite you. Container images can carry vulnerable packages, outdated libraries, and known CVEs that attackers can exploit.

Trivy is an open-source vulnerability scanner from Aqua Security that scans container images, file systems, and git repositories. It is fast, has a comprehensive vulnerability database, and integrates well with CI/CD pipelines. In this post, I will show you how to add Trivy scanning to your Cloud Build pipeline so that no image reaches Artifact Registry without passing a security check.

## The Basic Approach

The idea is straightforward: build the image, scan it with Trivy, and only push it if the scan passes. If Trivy finds critical vulnerabilities, the build fails and nothing gets pushed.

Here is the Cloud Build configuration.

```yaml
# cloudbuild.yaml - Build, scan, and push workflow
steps:
  # Step 1: Build the Docker image
  - name: 'gcr.io/cloud-builders/docker'
    id: 'build'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA'
      - '.'

  # Step 2: Scan the image with Trivy
  - name: 'aquasec/trivy:latest'
    id: 'scan'
    args:
      - 'image'
      - '--exit-code'
      - '1'                    # Exit with code 1 if vulnerabilities found
      - '--severity'
      - 'CRITICAL,HIGH'        # Only fail on critical and high severity
      - '--no-progress'        # Clean output for CI logs
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA'

  # Step 3: Push only if scan passes
  - name: 'gcr.io/cloud-builders/docker'
    id: 'push'
    args:
      - 'push'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA'

# Specify the final images
images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA'
```

The critical part is `--exit-code 1`. This tells Trivy to return a non-zero exit code when it finds vulnerabilities matching the specified severity. Cloud Build treats non-zero exit codes as failures, so the pipeline stops before the push step.

## Setting Up the Artifact Registry Repository

Make sure you have a repository ready.

```bash
# Create the Artifact Registry Docker repository
gcloud artifacts repositories create my-repo \
  --repository-format=docker \
  --location=us-central1 \
  --description="Scanned Docker images"

# Set up a Cloud Build trigger for your repository
gcloud builds triggers create github \
  --name="build-and-scan" \
  --repo-owner="my-org" \
  --repo-name="my-app" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml"
```

## A More Thorough Scanning Configuration

The basic setup works, but you probably want more control over what gets scanned and how results are reported. Here is an enhanced configuration.

```yaml
# cloudbuild.yaml - Enhanced scanning with detailed reporting
steps:
  # Build the image
  - name: 'gcr.io/cloud-builders/docker'
    id: 'build'
    args: ['build', '-t', 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA', '.']

  # Generate a detailed vulnerability report (always succeeds)
  - name: 'aquasec/trivy:latest'
    id: 'report'
    entrypoint: 'sh'
    args:
      - '-c'
      - |
        # Generate a full report in table format for human review
        trivy image --format table \
          --severity CRITICAL,HIGH,MEDIUM \
          us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA \
          | tee /workspace/trivy-report.txt

        # Also generate a JSON report for tooling
        trivy image --format json \
          --output /workspace/trivy-report.json \
          us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA

  # Gate check - fail if critical or high vulnerabilities exist
  - name: 'aquasec/trivy:latest'
    id: 'gate'
    args:
      - 'image'
      - '--exit-code'
      - '1'
      - '--severity'
      - 'CRITICAL,HIGH'
      - '--ignore-unfixed'     # Ignore vulns with no available fix
      - '--no-progress'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA'

  # Push if gate passes
  - name: 'gcr.io/cloud-builders/docker'
    id: 'push'
    args: ['push', 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA']

# Save the scan reports as artifacts
artifacts:
  objects:
    location: 'gs://$PROJECT_ID-build-artifacts/scans/$BUILD_ID/'
    paths:
      - '/workspace/trivy-report.txt'
      - '/workspace/trivy-report.json'
```

The `--ignore-unfixed` flag is important. Some vulnerabilities exist in base image packages but have no fix available yet. Failing the build on those is counterproductive since there is nothing you can do about them. This flag skips those and only fails on vulnerabilities that have patches available.

## Scanning Both the Image and the Dockerfile

Trivy can also scan your Dockerfile and IaC files for misconfigurations.

```yaml
# cloudbuild.yaml - Scan both Dockerfile config and built image
steps:
  # Scan Dockerfile for misconfigurations
  - name: 'aquasec/trivy:latest'
    id: 'config-scan'
    args:
      - 'config'
      - '--exit-code'
      - '1'
      - '--severity'
      - 'CRITICAL,HIGH'
      - '.'                    # Scan all config files in the workspace

  # Build the image
  - name: 'gcr.io/cloud-builders/docker'
    id: 'build'
    args: ['build', '-t', 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA', '.']

  # Scan the built image
  - name: 'aquasec/trivy:latest'
    id: 'image-scan'
    args:
      - 'image'
      - '--exit-code'
      - '1'
      - '--severity'
      - 'CRITICAL,HIGH'
      - '--ignore-unfixed'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA'

  # Push
  - name: 'gcr.io/cloud-builders/docker'
    id: 'push'
    args: ['push', 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA']
```

The config scan catches things like running as root, using `latest` tag as a base image, exposing unnecessary ports, and other Dockerfile best practices.

## Using a Trivy Configuration File

For consistent settings across multiple repositories, use a Trivy configuration file.

```yaml
# trivy.yaml - Shared Trivy configuration
severity:
  - CRITICAL
  - HIGH

exit-code: 1

# Ignore vulnerabilities with no fix
ignore-unfixed: true

# Skip specific file patterns
skip-files:
  - "**/*_test.go"
  - "**/testdata/**"

# Custom vulnerability ignore list
ignorefile: ".trivyignore"
```

Create a `.trivyignore` file for known false positives or accepted risks.

```text
# .trivyignore - Vulnerabilities we have reviewed and accepted

# CVE-2023-xxxxx: Not exploitable in our configuration
CVE-2023-12345

# CVE-2024-xxxxx: Waiting for upstream fix, mitigated by network policy
CVE-2024-67890
```

Then simplify your Cloud Build config.

```yaml
# cloudbuild.yaml - Using trivy.yaml config file
steps:
  - name: 'gcr.io/cloud-builders/docker'
    id: 'build'
    args: ['build', '-t', 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA', '.']

  - name: 'aquasec/trivy:latest'
    id: 'scan'
    args:
      - 'image'
      - '--config'
      - 'trivy.yaml'           # Use the config file
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA'

  - name: 'gcr.io/cloud-builders/docker'
    id: 'push'
    args: ['push', 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA']
```

## Caching the Trivy Database

Trivy downloads its vulnerability database on every run, which adds time to your builds. You can cache it in a GCS bucket.

```yaml
# cloudbuild.yaml - With Trivy database caching
steps:
  # Download cached Trivy database
  - name: 'gcr.io/cloud-builders/gsutil'
    id: 'cache-restore'
    entrypoint: 'sh'
    args:
      - '-c'
      - |
        # Try to restore the cache, but do not fail if it does not exist
        gsutil -m cp -r gs://$PROJECT_ID-trivy-cache/db /workspace/trivy-cache/ || true

  - name: 'gcr.io/cloud-builders/docker'
    id: 'build'
    args: ['build', '-t', 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA', '.']

  - name: 'aquasec/trivy:latest'
    id: 'scan'
    env:
      - 'TRIVY_CACHE_DIR=/workspace/trivy-cache'
    args:
      - 'image'
      - '--exit-code'
      - '1'
      - '--severity'
      - 'CRITICAL,HIGH'
      - '--ignore-unfixed'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA'

  # Save updated cache
  - name: 'gcr.io/cloud-builders/gsutil'
    id: 'cache-save'
    args: ['cp', '-r', '/workspace/trivy-cache/db', 'gs://$PROJECT_ID-trivy-cache/']

  - name: 'gcr.io/cloud-builders/docker'
    id: 'push'
    args: ['push', 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA']
```

## Wrapping Up

Adding Trivy to your Cloud Build pipeline is one of those small investments that pays off significantly. You catch vulnerable packages before they reach production, get visibility into your image security posture, and create an audit trail of scan results. The combination of Cloud Build's managed infrastructure and Trivy's comprehensive vulnerability database gives you a security scanning pipeline that requires minimal maintenance and catches real issues.
