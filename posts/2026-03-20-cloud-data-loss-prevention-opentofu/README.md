# How to Set Up Cloud Data Loss Prevention with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, DLP, Data Loss Prevention, OpenTofu, Privacy, Compliance

Description: Learn how to configure Google Cloud Data Loss Prevention (DLP) with OpenTofu to discover, classify, and protect sensitive data across your GCP storage resources.

## Overview

Cloud DLP, part of Sensitive Data Protection, can inspect and classify sensitive data (PII, PHI, financial data) across Cloud Storage, BigQuery, and Datastore. OpenTofu manages DLP inspect templates, de-identify templates, and job triggers for recurring data scans.

## Step 1: Enable DLP API

```hcl
# main.tf - Enable Cloud DLP API

resource "google_project_service" "dlp" {
  project = var.project_id
  service = "dlp.googleapis.com"
}
```

## Step 2: Create an Inspect Template

```hcl
# Template defining what sensitive info types to detect
resource "google_data_loss_prevention_inspect_template" "pii_template" {
  parent       = "projects/${var.project_id}/locations/global"
  description  = "Template for detecting PII data"
  display_name = "PII Detection Template"

  inspect_config {
    # Built-in info types for common PII
    info_types {
      name = "EMAIL_ADDRESS"
    }

    info_types {
      name = "PHONE_NUMBER"
    }

    info_types {
      name = "CREDIT_CARD_NUMBER"
    }

    info_types {
      name = "US_SOCIAL_SECURITY_NUMBER"
    }

    info_types {
      name = "PERSON_NAME"
    }

    # Minimum likelihood for reporting
    min_likelihood = "LIKELY"

    # Report context around findings
    include_quote = true

    limits {
      max_findings_per_request = 100
    }
  }
}
```

## Step 3: Create a De-identify Template

```hcl
# Template for anonymizing sensitive data
resource "google_data_loss_prevention_deidentify_template" "deidentify" {
  parent       = "projects/${var.project_id}/locations/global"
  display_name = "PII De-identification Template"

  deidentify_config {
    info_type_transformations {
      # Mask credit card numbers: 1234-5678-9012-3456 -> ****-****-****-3456
      transformations {
        info_types {
          name = "CREDIT_CARD_NUMBER"
        }

        primitive_transformation {
          character_mask_config {
            masking_character = "*"
            number_to_mask    = 12
            reverse_order     = false
          }
        }
      }

      # Pseudonymize email addresses with a transient crypto key
      transformations {
        info_types {
          name = "EMAIL_ADDRESS"
        }

        primitive_transformation {
          crypto_hash_config {
            crypto_key {
              transient {
                name = "email-hash-key"
              }
            }
          }
        }
      }

      # Redact SSNs
      transformations {
        info_types {
          name = "US_SOCIAL_SECURITY_NUMBER"
        }

        primitive_transformation {
          replace_config {
            new_value {
              string_value = "[REDACTED]"
            }
          }
        }
      }
    }
  }
}
```

## Step 4: Create a DLP Job Trigger

```hcl
# Automated job to scan Cloud Storage for PII
resource "google_data_loss_prevention_job_trigger" "gcs_scan" {
  parent       = "projects/${var.project_id}/locations/global"
  description  = "Scheduled scan of production GCS bucket for PII"
  display_name = "Production GCS PII Scanner"

  triggers {
    schedule {
      recurrence_period_duration = "86400s"  # Run daily
    }
  }

  inspect_job {
    inspect_template_name = google_data_loss_prevention_inspect_template.pii_template.id

    storage_config {
      cloud_storage_options {
        file_set {
          regex_file_set {
            bucket_name   = var.bucket_name
            include_regex = [".*"]
          }
        }
        file_types = ["TEXT_FILE", "IMAGE", "CSV", "TSV"]
        bytes_limit_per_file = 10485760  # 10 MB per file
      }
    }

    actions {
      # Publish a notification when the scan job completes
      pub_sub {
        # The Sensitive Data Protection service agent needs publish access to this topic
        topic = "projects/${var.project_id}/topics/${var.dlp_notifications_topic}"
      }
    }
  }
}
```

## Summary

Cloud DLP with OpenTofu automates sensitive data inspection and classification across GCP storage. Inspect templates define what to find, de-identify templates define how to protect it, and job triggers automate recurring scans. Pub/Sub notifications on job completion can trigger downstream alerting or follow-up processing after each scheduled scan.
