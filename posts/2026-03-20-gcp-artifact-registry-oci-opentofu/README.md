# How to Use GCP Artifact Registry as OCI Registry for OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GCP Artifact Registry, OCI Registry, Google Cloud, Provider Distribution

Description: Learn how to use Google Cloud Artifact Registry as an OCI registry for storing and distributing OpenTofu providers and modules in GCP-centric environments.

## Introduction

Google Cloud Artifact Registry supports OCI artifacts alongside Docker images and other package formats. For GCP-centric organizations, it provides IAM-based authentication, multi-region repositories, CMEK encryption, and VPC Service Controls - making it a natural choice for OpenTofu module packages and provider mirrors.

## Creating Artifact Registry Repositories

```hcl
# artifact_registry.tf

resource "google_artifact_registry_repository" "opentofu_providers" {
  provider = google

  location      = "us-central1"
  repository_id = "opentofu-providers"
  description   = "OpenTofu provider mirror"
  format        = "DOCKER"  # OCI artifacts use Docker format

  labels = {
    purpose = "opentofu-registry"
  }
}

resource "google_artifact_registry_repository" "opentofu_modules" {
  provider = google

  location      = "us-central1"
  repository_id = "opentofu-modules"
  description   = "OpenTofu module registry"
  format        = "DOCKER"
}

# Multi-region repository for global access

resource "google_artifact_registry_repository" "opentofu_providers_multiregion" {
  provider = google

  location      = "us"  # Multi-region
  repository_id = "opentofu-providers-global"
  description   = "OpenTofu providers (multi-region)"
  format        = "DOCKER"
}
```

## IAM Permissions

```hcl
# Grant push access to CI/CD service account
resource "google_artifact_registry_repository_iam_member" "cicd_writer" {
  provider   = google
  location   = google_artifact_registry_repository.opentofu_providers.location
  repository = google_artifact_registry_repository.opentofu_providers.name
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${google_service_account.cicd.email}"
}

# Grant read access to compute service accounts
resource "google_artifact_registry_repository_iam_member" "compute_reader" {
  provider   = google
  location   = google_artifact_registry_repository.opentofu_providers.location
  repository = google_artifact_registry_repository.opentofu_providers.name
  role       = "roles/artifactregistry.reader"
  member     = "serviceAccount:${data.google_compute_default_service_account.default.email}"
}

# Grant read to all internal users (domain-wide)
resource "google_artifact_registry_repository_iam_member" "internal_reader" {
  provider   = google
  location   = google_artifact_registry_repository.opentofu_providers.location
  repository = google_artifact_registry_repository.opentofu_providers.name
  role       = "roles/artifactregistry.reader"
  member     = "domain:company.com"
}
```

## Authentication

```bash
# Authenticate ORAS; OpenTofu can discover the same Docker-style credentials
gcloud auth print-access-token | oras login \
  -u oauth2accesstoken \
  --password-stdin us-central1-docker.pkg.dev

# For service accounts in CI/CD
gcloud auth activate-service-account ACCOUNT \
  --key-file=/path/to/service-account-key.json
gcloud auth print-access-token | oras login \
  -u oauth2accesstoken \
  --password-stdin us-central1-docker.pkg.dev

# With Workload Identity or other ambient Google credentials
gcloud auth print-access-token | oras login \
  -u oauth2accesstoken \
  --password-stdin us-central1-docker.pkg.dev
```

## Pushing Providers to Artifact Registry

```bash
#!/bin/bash
# push-provider-to-gar.sh

set -euo pipefail

GCP_PROJECT="${GOOGLE_CLOUD_PROJECT}"
REGION="us-central1"
GAR_REGISTRY="${REGION}-docker.pkg.dev/${GCP_PROJECT}/opentofu-providers"
PROVIDER_NAMESPACE="hashicorp"
PROVIDER_TYPE="google"
PROVIDER_VERSION="5.5.0"

# Authenticate ORAS and write Docker-style credentials for OpenTofu
gcloud auth print-access-token | oras login \
  -u oauth2accesstoken \
  --password-stdin "${REGION}-docker.pkg.dev"

WORK_DIR=$(mktemp -d)
trap "rm -rf $WORK_DIR" EXIT

cat > "$WORK_DIR/versions.tf" << EOF
terraform {
  required_providers {
    google = {
      source  = "${PROVIDER_NAMESPACE}/${PROVIDER_TYPE}"
      version = "= ${PROVIDER_VERSION}"
    }
  }
}
EOF

cd "$WORK_DIR"
tofu init -backend=false
tofu providers mirror \
  -platform=linux_amd64 \
  -platform=linux_arm64 \
  "$WORK_DIR/mirror/"

MIRROR_DIR="$WORK_DIR/mirror/registry.opentofu.org/${PROVIDER_NAMESPACE}/${PROVIDER_TYPE}"
LAYOUT="$WORK_DIR/layout"
mkdir -p "$LAYOUT"

oras push \
  --artifact-type application/vnd.opentofu.provider-target \
  --artifact-platform linux/amd64 \
  --oci-layout "${LAYOUT}:linux_amd64" \
  "${MIRROR_DIR}/terraform-provider-${PROVIDER_TYPE}_${PROVIDER_VERSION}_linux_amd64.zip:archive/zip"

oras push \
  --artifact-type application/vnd.opentofu.provider-target \
  --artifact-platform linux/arm64 \
  --oci-layout "${LAYOUT}:linux_arm64" \
  "${MIRROR_DIR}/terraform-provider-${PROVIDER_TYPE}_${PROVIDER_VERSION}_linux_arm64.zip:archive/zip"

oras manifest index create \
  --artifact-type="application/vnd.opentofu.provider" \
  --oci-layout "${LAYOUT}:${PROVIDER_VERSION}" \
  linux_amd64 \
  linux_arm64

ARTIFACT="${GAR_REGISTRY}/${PROVIDER_NAMESPACE}/${PROVIDER_TYPE}:${PROVIDER_VERSION}"

oras cp \
  --from-oci-layout "${LAYOUT}:${PROVIDER_VERSION}" \
  "$ARTIFACT"

echo "Pushed: $ARTIFACT"
```

## Pushing Modules to Artifact Registry

```bash
#!/bin/bash
# push-module-to-gar.sh

set -euo pipefail

MODULE_DIR="${1:?Usage: $0 <module-dir> <version>}"
VERSION="${2:?}"
GCP_PROJECT="${GOOGLE_CLOUD_PROJECT}"
REGION="us-central1"
MODULE_NAME=$(basename "$MODULE_DIR")
ARCHIVE="${PWD}/${MODULE_NAME}-${VERSION}.zip"

GAR_REGISTRY="${REGION}-docker.pkg.dev/${GCP_PROJECT}/opentofu-modules"

gcloud auth print-access-token | oras login \
  -u oauth2accesstoken \
  --password-stdin "${REGION}-docker.pkg.dev"

# Package module
(
  cd "$MODULE_DIR"
  zip -r "$ARCHIVE" . \
    -x '.terraform/*' '*.tfstate*' '.git/*'
)

ARTIFACT="${GAR_REGISTRY}/${MODULE_NAME}:${VERSION}"

oras push \
  --artifact-type=application/vnd.opentofu.modulepkg \
  "$ARTIFACT" \
  "${ARCHIVE}:archive/zip"

# Tag latest
oras tag "$ARTIFACT" latest

rm "$ARCHIVE"
echo "Pushed module: $ARTIFACT"
```

## Configuring OpenTofu to Use GAR

```hcl
# ~/.tofurc

provider_installation {
  oci_mirror {
    repository_template = "us-central1-docker.pkg.dev/my-gcp-project/opentofu-providers/hashicorp/${type}"
    include             = ["registry.opentofu.org/hashicorp/*"]
  }

  direct {
    exclude = ["registry.opentofu.org/hashicorp/*"]
  }
}
```

```hcl
# For modules
module "gke" {
  source = "oci://us-central1-docker.pkg.dev/my-gcp-project/opentofu-modules/gke?tag=2.0.0"

  project_id = var.project_id
  name       = "production"
}
```

## Cloud Build Pipeline for Mirror Updates

```yaml
# cloudbuild.yaml
steps:
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        apt-get update
        apt-get install -y gnupg unzip

        # Install OpenTofu
        curl --proto '=https' --tlsv1.2 -fsSL https://get.opentofu.org/install-opentofu.sh -o install-opentofu.sh
        chmod +x install-opentofu.sh
        ./install-opentofu.sh --install-method standalone

        # Install oras
        curl -LO https://github.com/oras-project/oras/releases/download/v1.3.0/oras_1.3.0_linux_amd64.tar.gz
        tar -xzf oras_1.3.0_linux_amd64.tar.gz
        mv oras /usr/local/bin/

        # Configure auth
        gcloud auth print-access-token | oras login \
          -u oauth2accesstoken \
          --password-stdin us-central1-docker.pkg.dev

        # Run mirror update
        ./scripts/push-provider-to-gar.sh

serviceAccount: 'projects/$PROJECT_ID/serviceAccounts/opentofu-mirror-sa@$PROJECT_ID.iam.gserviceaccount.com'

options:
  logging: CLOUD_LOGGING_ONLY
```

## Conclusion

GCP Artifact Registry provides IAM-based authentication, multi-region support, and CMEK encryption for OpenTofu module packages and provider mirrors. OpenTofu can install module packages directly from OCI repositories, and can use OCI repositories as a secondary mirror for providers. Use `oras login` with a short-lived Google access token so both ORAS and OpenTofu can reuse the same Docker-style credentials. Use `roles/artifactregistry.reader` on the compute service account or a domain-wide binding to give all team members pull access without individual IAM role assignments.
