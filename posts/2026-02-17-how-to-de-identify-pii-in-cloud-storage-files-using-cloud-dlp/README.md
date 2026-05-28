# How to De-Identify PII in Cloud Storage Files Using Cloud DLP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud DLP, Cloud Storage, Privacy, Data Protection

Description: Learn how to use Cloud DLP to automatically find and de-identify personally identifiable information in files stored in Google Cloud Storage buckets.

---

You have files in Cloud Storage that contain personally identifiable information - customer exports, log files with email addresses, CSV reports with phone numbers, support tickets with names and addresses. You need to clean this data before sharing it with third parties, moving it to a less restricted environment, or using it for analytics.

Cloud DLP can scan files in Cloud Storage, find sensitive data, and create de-identified copies. In this post, I will show you how to set up de-identification jobs that handle the common file formats you are likely dealing with.

## De-Identification Methods

Before diving into the setup, it helps to understand the de-identification methods Cloud DLP offers:

- **Redaction**: Replace sensitive data with a placeholder like `[REDACTED]` or remove it entirely
- **Masking**: Replace characters with a masking character, like turning `john@example.com` into `j***@***********.com`
- **Bucketing**: Replace specific values with ranges (e.g., age 34 becomes "30-40")
- **Tokenization**: Replace sensitive data with a surrogate token that can be reversed with a key
- **Date shifting**: Shift dates by a random number of days within a range

Each method has trade-offs between privacy and utility. Redaction is the safest but loses all information. Tokenization preserves referential integrity but requires key management.

## Prerequisites

You need:

- Cloud DLP API enabled
- Source Cloud Storage bucket with files to de-identify
- Destination Cloud Storage bucket for de-identified output in a different bucket than the source
- The DLP User role (`roles/dlp.user`) to create jobs
- The DLP De-identify Templates Editor role (`roles/dlp.deidentifyTemplatesEditor`) if you create reusable templates
- Read access for the DLP service agent on the source bucket and write access on the destination bucket

## Step 1: Set Up Your Buckets

Create separate buckets for source and destination to keep things clean:

```bash
# Create a bucket for de-identified output

gsutil mb -p PROJECT_ID -l us-central1 gs://my-project-deidentified/

# Set appropriate permissions - restrict access to the de-identified bucket
gsutil iam ch serviceAccount:service-PROJECT_NUMBER@dlp-api.iam.gserviceaccount.com:roles/storage.objectUser gs://my-project-deidentified/
```

## Step 2: Create a De-Identification Job with the API

For a quick de-identification, you can create a DLP job with the REST API. If you do not provide a de-identify template, Sensitive Data Protection replaces findings in text and structured files with their InfoType names:

```bash
cat > dlp-job.json <<'EOF'
{
  "inspectJob": {
    "storageConfig": {
      "cloudStorageOptions": {
        "fileSet": {
          "url": "gs://my-source-bucket/customer-data/"
        },
        "fileTypes": ["TEXT_FILE", "CSV"]
      }
    },
    "inspectConfig": {
      "infoTypes": [
        {"name": "EMAIL_ADDRESS"},
        {"name": "PHONE_NUMBER"},
        {"name": "PERSON_NAME"},
        {"name": "US_SOCIAL_SECURITY_NUMBER"}
      ]
    },
    "actions": [
      {
        "deidentify": {
          "cloudStorageOutput": "gs://my-project-deidentified/customer-data-clean/",
          "fileTypesToTransform": ["TEXT_FILE", "CSV"]
        }
      }
    ]
  }
}
EOF

curl -s \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://dlp.googleapis.com/v2/projects/PROJECT_ID/dlpJobs" \
  -d @dlp-job.json
```

## Step 3: Define a Detailed De-Identification Configuration

For production use, you want different de-identification methods for different types of data. Store those rules in a de-identify template, then reference the template from the Cloud Storage de-identification job. Here is a JSON request body for a template that applies specific transformations per InfoType:

```json
{
  "templateId": "pii-storage-deidentify",
  "deidentifyTemplate": {
    "displayName": "PII storage de-identification",
    "deidentifyConfig": {
      "infoTypeTransformations": {
        "transformations": [
          {
            "infoTypes": [{"name": "EMAIL_ADDRESS"}],
            "primitiveTransformation": {
              "characterMaskConfig": {
                "maskingCharacter": "*",
                "numberToMask": 0,
                "reverseOrder": false
              }
            }
          },
          {
            "infoTypes": [{"name": "PHONE_NUMBER"}],
            "primitiveTransformation": {
              "replaceConfig": {
                "newValue": {
                  "stringValue": "[PHONE REDACTED]"
                }
              }
            }
          },
          {
            "infoTypes": [{"name": "US_SOCIAL_SECURITY_NUMBER"}],
            "primitiveTransformation": {
              "replaceConfig": {
                "newValue": {
                  "stringValue": "XXX-XX-XXXX"
                }
              }
            }
          },
          {
            "infoTypes": [{"name": "PERSON_NAME"}],
            "primitiveTransformation": {
              "characterMaskConfig": {
                "maskingCharacter": "#",
                "numberToMask": 0
              }
            }
          },
          {
            "infoTypes": [{"name": "CREDIT_CARD_NUMBER"}],
            "primitiveTransformation": {
              "cryptoReplaceFfxFpeConfig": {
                "cryptoKey": {
                  "kmsWrapped": {
                    "wrappedKey": "BASE64_WRAPPED_KEY",
                    "cryptoKeyName": "projects/PROJECT_ID/locations/global/keyRings/dlp-keyring/cryptoKeys/dlp-key"
                  }
                },
                "commonAlphabet": "NUMERIC"
              }
            }
          }
        ]
      }
    }
  }
}
```

Save the request body as `deidentify-template.json`, then create the template with:

```bash
curl -s \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://dlp.googleapis.com/v2/projects/PROJECT_ID/locations/global/deidentifyTemplates" \
  -d @deidentify-template.json
```

This template masks email addresses, replaces phone numbers with a placeholder, replaces SSNs with a fixed string, masks names, and applies format-preserving encryption to credit card numbers.

## Step 4: Run a De-Identification Job with Python

Here is a Python script that creates a Cloud Storage de-identification job:

```python
from google.cloud import dlp_v2

def deidentify_gcs_files(project_id, source_bucket, source_path,
                          dest_bucket, dest_path, deidentify_template_id):
    """De-identify PII in Cloud Storage files and write output to a new location."""

    dlp_client = dlp_v2.DlpServiceClient()

    # Define InfoTypes to look for
    info_types = [
        {"name": "EMAIL_ADDRESS"},
        {"name": "PHONE_NUMBER"},
        {"name": "PERSON_NAME"},
        {"name": "US_SOCIAL_SECURITY_NUMBER"},
        {"name": "CREDIT_CARD_NUMBER"},
        {"name": "STREET_ADDRESS"},
    ]

    # Configure inspection settings
    inspect_config = {
        "info_types": info_types,
        "min_likelihood": dlp_v2.Likelihood.POSSIBLE,
    }

    # Configure the source and destination in Cloud Storage
    storage_config = {
        "cloud_storage_options": {
            "file_set": {
                "url": f"gs://{source_bucket}/{source_path}"
            },
            "file_types": ["TEXT_FILE", "CSV"],
        }
    }

    parent = f"projects/{project_id}/locations/global"
    transformation_config = {
        "deidentify_template": (
            f"{parent}/deidentifyTemplates/{deidentify_template_id}"
        )
    }

    # Build the job configuration
    job = {
        "inspect_config": inspect_config,
        "storage_config": storage_config,
        "actions": [
            {
                "deidentify": {
                    "cloud_storage_output": f"gs://{dest_bucket}/{dest_path}",
                    "transformation_config": transformation_config,
                    "file_types_to_transform": ["TEXT_FILE", "CSV"],
                }
            }
        ],
    }

    # Submit the job
    response = dlp_client.create_dlp_job(
        request={
            "parent": parent,
            "inspect_job": job,
        }
    )

    print(f"De-identification job created: {response.name}")
    return response

# Run the de-identification
deidentify_gcs_files(
    project_id="my-project",
    source_bucket="my-source-bucket",
    source_path="customer-data/",
    dest_bucket="my-project-deidentified",
    dest_path="customer-data-clean/",
    deidentify_template_id="pii-storage-deidentify"
)
```

## Step 5: Handle Different File Types

Cloud DLP handles different file types differently:

**Text and CSV files**: DLP scans the content directly and replaces sensitive values inline. The de-identified file has the same structure as the original.

**JSON files**: DLP scans JSON files as text files. Inline replacements can preserve valid JSON when the transformed values remain properly quoted, but JSON is not a separate Cloud Storage de-identification file type.

**Images**: DLP can redact text in images by blacking out regions. This is useful for scanned documents.

**Structured files**: For CSV and TSV files, DLP treats the input as structured data.

Specify which file types to scan:

```python
# Configure which file types to process
storage_config = {
    "cloud_storage_options": {
        "file_set": {
            "url": "gs://my-bucket/data/"
        },
        # Only scan file types supported for Cloud Storage de-identification
        "file_types": [
            "TEXT_FILE",
            "CSV",
            "TSV",
        ],
    }
}
```

## Step 6: Automate with Cloud Functions

Set up automatic de-identification whenever new files arrive in your source bucket:

```python
import functions_framework
from google.cloud import dlp_v2

@functions_framework.cloud_event
def deidentify_on_upload(cloud_event):
    """Triggered when a file is uploaded to the source bucket.
    Automatically creates a DLP de-identification job."""

    data = cloud_event.data
    bucket = data["bucket"]
    file_name = data["name"]

    # Skip files that are not text-based
    if not file_name.endswith(('.csv', '.txt', '.json')):
        print(f"Skipping non-text file: {file_name}")
        return

    dlp_client = dlp_v2.DlpServiceClient()
    project_id = "my-project"

    # Build the de-identification job for this specific file
    job = {
        "inspect_config": {
            "info_types": [
                {"name": "EMAIL_ADDRESS"},
                {"name": "PHONE_NUMBER"},
                {"name": "PERSON_NAME"},
                {"name": "US_SOCIAL_SECURITY_NUMBER"},
            ],
            "min_likelihood": dlp_v2.Likelihood.POSSIBLE,
        },
        "storage_config": {
            "cloud_storage_options": {
                "file_set": {
                    "url": f"gs://{bucket}/{file_name}"
                }
            }
        },
        "actions": [
            {
                "deidentify": {
                    "cloud_storage_output": f"gs://{project_id}-deidentified/auto-cleaned/",
                    "file_types_to_transform": ["TEXT_FILE", "CSV"],
                }
            }
        ],
    }

    parent = f"projects/{project_id}/locations/global"
    response = dlp_client.create_dlp_job(
        request={
            "parent": parent,
            "inspect_job": job,
        }
    )
    print(f"Created de-identification job: {response.name} for file: {file_name}")
```

## Tips and Gotchas

**Test with sample data first.** Before running de-identification on production data, try it on a small sample and verify the output looks right. Misconfigured transformations can corrupt data in ways that are hard to fix.

**Watch your costs.** Cloud DLP charges for bytes inspected, and de-identification jobs can also incur transformation charges based on bytes transformed. Use file type filters to control costs.

**Preserve file metadata.** De-identified files get new metadata. If the original file metadata matters (timestamps, custom metadata), you will need to copy it separately.

**Handle partial failures gracefully.** If a job fails partway through, some files may be de-identified and some may not. Check the job results to see which files were processed.

## Summary

Cloud DLP makes it possible to clean sensitive data from Cloud Storage files at scale. Define your de-identification transformations per InfoType, point DLP at your source bucket, and let it create clean copies in your destination bucket. For ongoing data flows, automate the process with Cloud Functions triggered by file uploads. The key is to match your de-identification method to your use case - redaction for maximum privacy, masking for readability, and tokenization when you need reversibility.
