# How to Implement Software Bill of Materials Generation and Storage on Google Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, SBOM, Supply Chain Security, Artifact Registry, DevOps

Description: Generate and store Software Bill of Materials for your container images on Google Cloud using Syft, Artifact Registry, and automated CI/CD pipelines.

---

A Software Bill of Materials (SBOM) is a list of every component, library, and dependency in your software. Think of it as a nutritional label for your code. When the next Log4j-style vulnerability drops, having SBOMs means you can answer the question "Are we affected?" in minutes instead of days.

Regulatory requirements are pushing SBOMs from nice-to-have to mandatory. The US Executive Order on Cybersecurity, the EU Cyber Resilience Act, and various industry standards now require SBOM generation. In this post, I will show you how to generate SBOMs as part of your build pipeline on Google Cloud and store them alongside your container images.

## Choosing an SBOM Format

There are two main SBOM formats:

- **SPDX** - Developed by the Linux Foundation, widely adopted, supports multiple output formats
- **CycloneDX** - Developed by OWASP, more security-focused, supports vulnerability data natively

Both are supported by most tooling. I will use CycloneDX in this post because it has better integration with vulnerability scanning, but the approach works with either format.

## Generating SBOMs with Syft

Syft is the most popular open-source SBOM generator. It supports container images, filesystems, and various package managers.

Here is how to generate an SBOM for a container image locally:

```bash
# Install Syft
curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin

# Generate a CycloneDX SBOM for a container image
syft us-docker.pkg.dev/my-project/my-repo/my-app:latest \
  -o cyclonedx-json \
  > sbom.cyclonedx.json

# Generate an SPDX SBOM (alternative format)
syft us-docker.pkg.dev/my-project/my-repo/my-app:latest \
  -o spdx-json \
  > sbom.spdx.json

# View a summary of what was found
syft us-docker.pkg.dev/my-project/my-repo/my-app:latest \
  -o table
```

## Integrating SBOM Generation into Cloud Build

Add SBOM generation to your CI pipeline right after building and pushing the image:

```yaml
# cloudbuild.yaml
# Build pipeline with automated SBOM generation
steps:
  # Step 1: Build the container image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'us-docker.pkg.dev/${PROJECT_ID}/my-repo/my-app:${SHORT_SHA}'
      - '.'
    id: 'build'

  # Step 2: Push the image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'us-docker.pkg.dev/${PROJECT_ID}/my-repo/my-app:${SHORT_SHA}'
    id: 'push'
    waitFor: ['build']

  # Step 3: Generate SBOM using Syft
  - name: 'anchore/syft:latest'
    args:
      - 'us-docker.pkg.dev/${PROJECT_ID}/my-repo/my-app:${SHORT_SHA}'
      - '-o'
      - 'cyclonedx-json=/workspace/sbom.cyclonedx.json'
      - '-o'
      - 'spdx-json=/workspace/sbom.spdx.json'
    id: 'generate-sbom'
    waitFor: ['push']

  # Step 4: Attach SBOM to the image using Cosign
  - name: 'gcr.io/projectsigstore/cosign'
    entrypoint: 'sh'
    args:
      - '-c'
      - |
        # Get the image digest
        IMAGE_DIGEST=$(crane digest \
          us-docker.pkg.dev/${PROJECT_ID}/my-repo/my-app:${SHORT_SHA})

        # Attach the SBOM as an attestation
        cosign attach sbom \
          --sbom /workspace/sbom.cyclonedx.json \
          --type cyclonedx \
          us-docker.pkg.dev/${PROJECT_ID}/my-repo/my-app@${IMAGE_DIGEST}
    id: 'attach-sbom'
    waitFor: ['generate-sbom']

  # Step 5: Upload SBOM to GCS for long-term storage
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'sh'
    args:
      - '-c'
      - |
        DATE=$(date +%Y-%m-%d)
        gsutil cp /workspace/sbom.cyclonedx.json \
          gs://${PROJECT_ID}-sboms/my-app/${SHORT_SHA}/sbom.cyclonedx.json
        gsutil cp /workspace/sbom.spdx.json \
          gs://${PROJECT_ID}-sboms/my-app/${SHORT_SHA}/sbom.spdx.json
    id: 'store-sbom'
    waitFor: ['generate-sbom']

  # Step 6: Scan the SBOM for known vulnerabilities
  - name: 'anchore/grype:latest'
    args:
      - 'sbom:/workspace/sbom.cyclonedx.json'
      - '-o'
      - 'json'
      - '--file'
      - '/workspace/vulnerabilities.json'
    id: 'scan-sbom'
    waitFor: ['generate-sbom']

images:
  - 'us-docker.pkg.dev/${PROJECT_ID}/my-repo/my-app:${SHORT_SHA}'
```

## Setting Up SBOM Storage

Create a dedicated GCS bucket and BigQuery dataset for SBOM data:

```hcl
# sbom-storage.tf
# Storage infrastructure for SBOMs

# GCS bucket for raw SBOM files
resource "google_storage_bucket" "sboms" {
  name          = "${var.project_id}-sboms"
  project       = var.project_id
  location      = var.region
  force_destroy = false

  # Keep SBOMs for 7 years for compliance
  lifecycle_rule {
    condition {
      age = 2555  # 7 years
    }
    action {
      type = "Delete"
    }
  }

  # Prevent accidental deletion
  lifecycle_rule {
    condition {
      age = 0
    }
    action {
      type = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  versioning {
    enabled = true
  }

  uniform_bucket_level_access = true
}

# BigQuery dataset for SBOM analysis
resource "google_bigquery_dataset" "sbom_data" {
  dataset_id = "sbom_inventory"
  project    = var.project_id
  location   = var.region

  description = "Software Bill of Materials inventory and analysis"
}

# Table for tracking all components across all images
resource "google_bigquery_table" "components" {
  dataset_id = google_bigquery_dataset.sbom_data.dataset_id
  table_id   = "components"
  project    = var.project_id

  schema = jsonencode([
    {
      name = "image_name"
      type = "STRING"
      mode = "REQUIRED"
    },
    {
      name = "image_tag"
      type = "STRING"
      mode = "REQUIRED"
    },
    {
      name = "component_name"
      type = "STRING"
      mode = "REQUIRED"
    },
    {
      name = "component_version"
      type = "STRING"
      mode = "REQUIRED"
    },
    {
      name = "component_type"
      type = "STRING"
      mode = "NULLABLE"
    },
    {
      name = "license"
      type = "STRING"
      mode = "NULLABLE"
    },
    {
      name = "scanned_at"
      type = "TIMESTAMP"
      mode = "REQUIRED"
    }
  ])
}
```

## Parsing and Indexing SBOMs

To make SBOMs queryable, parse them and load the data into BigQuery:

```python
# sbom_indexer.py
# Parses SBOM files and loads component data into BigQuery
import json
from google.cloud import bigquery
from google.cloud import storage
from datetime import datetime

def parse_cyclonedx_sbom(sbom_data):
    """Extract component information from a CycloneDX SBOM."""
    components = []

    for component in sbom_data.get("components", []):
        components.append({
            "name": component.get("name", ""),
            "version": component.get("version", "unknown"),
            "type": component.get("type", ""),
            "purl": component.get("purl", ""),
            "license": extract_license(component),
        })

    return components


def extract_license(component):
    """Extract license information from a CycloneDX component."""
    licenses = component.get("licenses", [])
    if not licenses:
        return "unknown"

    license_names = []
    for lic in licenses:
        if "license" in lic:
            name = lic["license"].get("id") or lic["license"].get("name", "")
            if name:
                license_names.append(name)
        elif "expression" in lic:
            license_names.append(lic["expression"])

    return ", ".join(license_names) if license_names else "unknown"


def index_sbom_to_bigquery(
    project_id, image_name, image_tag, sbom_path
):
    """Parse an SBOM and load it into BigQuery for querying."""
    # Load the SBOM
    storage_client = storage.Client()
    bucket_name = f"{project_id}-sboms"
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(sbom_path)
    sbom_data = json.loads(blob.download_as_string())

    # Parse components
    components = parse_cyclonedx_sbom(sbom_data)

    # Prepare rows for BigQuery
    rows = []
    now = datetime.utcnow().isoformat()
    for comp in components:
        rows.append({
            "image_name": image_name,
            "image_tag": image_tag,
            "component_name": comp["name"],
            "component_version": comp["version"],
            "component_type": comp["type"],
            "license": comp["license"],
            "scanned_at": now,
        })

    # Load into BigQuery
    bq_client = bigquery.Client(project=project_id)
    table_ref = f"{project_id}.sbom_inventory.components"

    errors = bq_client.insert_rows_json(table_ref, rows)
    if errors:
        print(f"BigQuery insert errors: {errors}")
        return False

    print(f"Indexed {len(rows)} components for {image_name}:{image_tag}")
    return True
```

## Querying SBOMs for Vulnerability Response

When a new vulnerability is announced, query your SBOM data to find affected images:

```sql
-- Find all images containing a specific vulnerable component
-- Use this when a CVE is announced to quickly identify affected services
SELECT DISTINCT
  image_name,
  image_tag,
  component_version,
  scanned_at
FROM `project.sbom_inventory.components`
WHERE
  component_name = 'log4j-core'
  AND component_version LIKE '2.%'
  AND component_version < '2.17.1'
ORDER BY scanned_at DESC;
```

```sql
-- License compliance check across all images
-- Identify components with problematic licenses
SELECT
  component_name,
  component_version,
  license,
  COUNT(DISTINCT image_name) as used_in_images
FROM `project.sbom_inventory.components`
WHERE
  license IN ('GPL-3.0-only', 'GPL-2.0-only', 'AGPL-3.0-only')
GROUP BY component_name, component_version, license
ORDER BY used_in_images DESC;
```

```sql
-- Find outdated components used across multiple images
-- Helps prioritize dependency updates
SELECT
  component_name,
  component_version,
  COUNT(DISTINCT image_name) as image_count,
  ARRAY_AGG(DISTINCT image_name LIMIT 5) as example_images
FROM `project.sbom_inventory.components`
GROUP BY component_name, component_version
HAVING image_count > 3
ORDER BY image_count DESC
LIMIT 50;
```

## Automating Vulnerability Alerts

Set up automated alerts when a known vulnerable component is found in your SBOM inventory:

```python
# vuln_alerter.py
# Checks SBOM inventory against new vulnerability feeds
from google.cloud import bigquery

def check_vulnerability(project_id, component_name, affected_versions):
    """Check if any deployed images contain a vulnerable component."""
    client = bigquery.Client(project=project_id)

    # Build version filter
    version_conditions = " OR ".join(
        [f'component_version = "{v}"' for v in affected_versions]
    )

    query = f"""
    SELECT DISTINCT
      image_name,
      image_tag,
      component_version,
      scanned_at
    FROM `{project_id}.sbom_inventory.components`
    WHERE
      component_name = @component_name
      AND ({version_conditions})
    ORDER BY scanned_at DESC
    """

    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter(
                "component_name", "STRING", component_name
            ),
        ]
    )

    results = client.query(query, job_config=job_config).result()
    affected = list(results)

    if affected:
        print(f"ALERT: {len(affected)} images affected by vulnerability")
        for row in affected:
            print(f"  {row.image_name}:{row.image_tag} "
                  f"(version {row.component_version})")

    return affected
```

## Wrapping Up

SBOM generation is becoming table stakes for modern software development. The good news is that the tooling has matured significantly - Syft generates comprehensive SBOMs, Cosign lets you attach them to images, and BigQuery makes them queryable at scale. Build it into your pipeline once, and you will have the data you need when the next critical vulnerability hits. The few minutes of build time it adds will save you hours or days of scrambling when you need to answer "What is affected?" during an incident.
