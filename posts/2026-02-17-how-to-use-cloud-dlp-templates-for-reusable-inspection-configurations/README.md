# How to Use Cloud DLP Templates for Reusable Inspection Configurations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud DLP, Templates, Data Security, Compliance

Description: A practical guide to creating and using Cloud DLP inspection and de-identification templates to standardize sensitive data handling across your organization.

---

If you have more than one team using Cloud DLP, you have probably run into consistency problems. One team scans for 5 InfoTypes, another scans for 15. One uses POSSIBLE as the minimum likelihood, another uses LIKELY. De-identification methods vary from team to team. Without standardization, your data protection efforts are inconsistent and hard to audit.

Cloud DLP templates solve this problem. You define your inspection and de-identification configurations once as templates, then reference them in any DLP job. When requirements change, you update the template and all future jobs automatically pick up the new settings.

## Two Types of Templates

Cloud DLP supports two types of templates:

- **Inspect templates**: Define what sensitive data to look for (InfoTypes, min likelihood, custom InfoTypes, rules)
- **De-identify templates**: Define how to transform sensitive data (redaction, masking, tokenization, etc.)

Both types live at the project or organization level and can be referenced by any DLP job.

## Step 1: Create an Inspection Template

Let us create an inspection template that covers common PII detection for a healthcare organization:

```python
from google.cloud import dlp_v2

def create_inspect_template(project_id):
    """Create a reusable inspection template for healthcare PII detection."""

    dlp_client = dlp_v2.DlpServiceClient()

    # Define the inspection configuration
    inspect_config = {
        "info_types": [
            {"name": "EMAIL_ADDRESS"},
            {"name": "PHONE_NUMBER"},
            {"name": "PERSON_NAME"},
            {"name": "DATE_OF_BIRTH"},
            {"name": "US_SOCIAL_SECURITY_NUMBER"},
            {"name": "STREET_ADDRESS"},
            {"name": "CREDIT_CARD_NUMBER"},
            {"name": "US_DRIVERS_LICENSE_NUMBER"},
            {"name": "PASSPORT"},
            {"name": "MEDICAL_RECORD_NUMBER"},
            {"name": "MEDICAL_TERM"},
        ],
        "min_likelihood": dlp_v2.Likelihood.POSSIBLE,
        "include_quote": True,
        "limits": {
            "max_findings_per_request": 5000,
            "max_findings_per_item": 500,
        },
        # Add custom InfoTypes specific to our organization
        "custom_info_types": [
            {
                "info_type": {"name": "PATIENT_ID"},
                "regex": {
                    "pattern": r"PAT-\d{8}"
                },
                "likelihood": dlp_v2.Likelihood.VERY_LIKELY,
            },
            {
                "info_type": {"name": "INSURANCE_ID"},
                "regex": {
                    "pattern": r"INS-[A-Z]{2}\d{10}"
                },
                "likelihood": dlp_v2.Likelihood.VERY_LIKELY,
            },
        ],
        # Rules to reduce false positives
        "rule_set": [
            {
                "info_types": [{"name": "PERSON_NAME"}],
                "rules": [
                    {
                        "exclusion_rule": {
                            "dictionary": {
                                "word_list": {
                                    "words": [
                                        "Admin", "System", "Test",
                                        "Service", "Default",
                                    ]
                                }
                            },
                            "matching_type": "MATCHING_TYPE_FULL_MATCH",
                        }
                    }
                ],
            }
        ],
    }

    # Create the template
    template = {
        "display_name": "Healthcare PII Detection",
        "description": "Standard inspection config for healthcare PII including HIPAA-relevant types",
        "inspect_config": inspect_config,
    }

    parent = f"projects/{project_id}/locations/global"

    response = dlp_client.create_inspect_template(
        parent=parent,
        inspect_template=template,
        template_id="healthcare-pii-v1",
    )

    print(f"Created inspect template: {response.name}")
    return response

create_inspect_template("my-project")
```

## Step 2: Create a De-Identification Template

Now create a matching de-identification template:

```python
def create_deidentify_template(project_id):
    """Create a reusable de-identification template for healthcare data."""

    dlp_client = dlp_v2.DlpServiceClient()

    # Define how each type of sensitive data should be de-identified
    deidentify_config = {
        "info_type_transformations": {
            "transformations": [
                {
                    # Mask email addresses preserving domain
                    "info_types": [{"name": "EMAIL_ADDRESS"}],
                    "primitive_transformation": {
                        "character_mask_config": {
                            "masking_character": "*",
                            "characters_to_ignore": [
                                {"characters_to_skip": "@."}
                            ],
                        }
                    }
                },
                {
                    # Replace SSN with fixed placeholder
                    "info_types": [{"name": "US_SOCIAL_SECURITY_NUMBER"}],
                    "primitive_transformation": {
                        "replace_config": {
                            "new_value": {"string_value": "XXX-XX-XXXX"}
                        }
                    }
                },
                {
                    # Replace phone numbers
                    "info_types": [{"name": "PHONE_NUMBER"}],
                    "primitive_transformation": {
                        "replace_config": {
                            "new_value": {"string_value": "(XXX) XXX-XXXX"}
                        }
                    }
                },
                {
                    # Date shift birth dates by a random amount (up to 30 days)
                    "info_types": [{"name": "DATE_OF_BIRTH"}],
                    "primitive_transformation": {
                        "date_shift_config": {
                            "upper_bound_days": 30,
                            "lower_bound_days": -30,
                        }
                    }
                },
                {
                    # Redact names, addresses, and custom IDs
                    "info_types": [
                        {"name": "PERSON_NAME"},
                        {"name": "STREET_ADDRESS"},
                        {"name": "PATIENT_ID"},
                        {"name": "INSURANCE_ID"},
                        {"name": "MEDICAL_RECORD_NUMBER"},
                    ],
                    "primitive_transformation": {
                        "replace_config": {
                            "new_value": {"string_value": "[REDACTED]"}
                        }
                    }
                },
                {
                    # Tokenize credit card numbers (reversible with key)
                    "info_types": [{"name": "CREDIT_CARD_NUMBER"}],
                    "primitive_transformation": {
                        "crypto_replace_ffx_fpe_config": {
                            "crypto_key": {
                                "kms_wrapped": {
                                    "wrapped_key": "BASE64_WRAPPED_KEY",
                                    "crypto_key_name": "projects/my-project/locations/global/keyRings/dlp-keyring/cryptoKeys/dlp-key",
                                }
                            },
                            "common_alphabet": "NUMERIC",
                        }
                    }
                },
            ]
        }
    }

    template = {
        "display_name": "Healthcare De-Identification",
        "description": "Standard de-id config for healthcare data - HIPAA compliant",
        "deidentify_config": deidentify_config,
    }

    parent = f"projects/{project_id}/locations/global"

    response = dlp_client.create_deidentify_template(
        parent=parent,
        deidentify_template=template,
        template_id="healthcare-deid-v1",
    )

    print(f"Created de-identify template: {response.name}")
    return response

create_deidentify_template("my-project")
```

## Step 3: Use Templates in Jobs

Now any team can reference these templates in their DLP jobs without knowing the details of the configuration:

```python
def run_job_with_templates(project_id, dataset_id, table_id):
    """Run a DLP job using templates instead of inline configs."""

    dlp_client = dlp_v2.DlpServiceClient()

    # Reference templates by their full resource name
    inspect_template = f"projects/{project_id}/locations/global/inspectTemplates/healthcare-pii-v1"
    deidentify_template = f"projects/{project_id}/locations/global/deidentifyTemplates/healthcare-deid-v1"

    # Configure the BigQuery table to scan
    storage_config = {
        "big_query_options": {
            "table_reference": {
                "project_id": project_id,
                "dataset_id": dataset_id,
                "table_id": table_id,
            }
        }
    }

    # Create the job referencing templates - no inline config needed
    job = {
        "inspect_template_name": inspect_template,
        "storage_config": storage_config,
        "actions": [
            {
                "save_findings": {
                    "output_config": {
                        "table": {
                            "project_id": project_id,
                            "dataset_id": "dlp_results",
                            "table_id": f"{table_id}_findings",
                        }
                    }
                }
            }
        ],
    }

    parent = f"projects/{project_id}/locations/global"
    response = dlp_client.create_dlp_job(
        parent=parent,
        inspect_job=job,
    )

    print(f"Job created with templates: {response.name}")
    return response
```

## Step 4: Manage Templates with Terraform

For infrastructure-as-code management, define templates in Terraform:

```hcl
# Inspection template for standard PII detection
resource "google_data_loss_prevention_inspect_template" "standard_pii" {
  parent       = "projects/${var.project_id}/locations/global"
  display_name = "Standard PII Detection"
  description  = "Detects common PII types across the organization"

  inspect_config {
    info_type {
      name = "EMAIL_ADDRESS"
    }
    info_type {
      name = "PHONE_NUMBER"
    }
    info_type {
      name = "US_SOCIAL_SECURITY_NUMBER"
    }
    info_type {
      name = "PERSON_NAME"
    }
    info_type {
      name = "CREDIT_CARD_NUMBER"
    }

    min_likelihood = "POSSIBLE"

    limits {
      max_findings_per_request = 5000
    }

    # Custom InfoType for internal employee IDs
    custom_info_types {
      info_type {
        name = "EMPLOYEE_ID"
      }
      regex {
        pattern = "EMP-\\d{5}"
      }
      likelihood = "VERY_LIKELY"
    }
  }
}

# De-identification template
resource "google_data_loss_prevention_deidentify_template" "standard_deid" {
  parent       = "projects/${var.project_id}/locations/global"
  display_name = "Standard De-Identification"
  description  = "Standard de-identification transformations"

  deidentify_config {
    info_type_transformations {
      transformations {
        info_types {
          name = "EMAIL_ADDRESS"
        }
        primitive_transformation {
          character_mask_config {
            masking_character = "*"
          }
        }
      }
      transformations {
        info_types {
          name = "US_SOCIAL_SECURITY_NUMBER"
        }
        primitive_transformation {
          replace_config {
            new_value {
              string_value = "XXX-XX-XXXX"
            }
          }
        }
      }
    }
  }
}
```

## Step 5: List and Update Templates

Templates are not set in stone. List and update them as requirements evolve:

```bash
# List all inspection templates in a project
gcloud dlp inspect-templates list --project=PROJECT_ID

# Describe a specific template
gcloud dlp inspect-templates describe \
  projects/PROJECT_ID/locations/global/inspectTemplates/healthcare-pii-v1

# Delete a template (only if no jobs reference it)
gcloud dlp inspect-templates delete \
  projects/PROJECT_ID/locations/global/inspectTemplates/old-template
```

To update a template programmatically:

```python
def update_inspect_template(project_id, template_id):
    """Add a new InfoType to an existing inspection template."""

    dlp_client = dlp_v2.DlpServiceClient()

    template_name = f"projects/{project_id}/locations/global/inspectTemplates/{template_id}"

    # Get the current template
    current = dlp_client.get_inspect_template(request={"name": template_name})

    # Add a new InfoType to the existing config
    new_info_type = dlp_v2.InfoType(name="IBAN_CODE")
    current.inspect_config.info_types.append(new_info_type)

    # Update the template
    response = dlp_client.update_inspect_template(
        request={
            "name": template_name,
            "inspect_template": current,
            "update_mask": {"paths": ["inspect_config.info_types"]},
        }
    )

    print(f"Updated template: {response.name}")
    return response
```

## Organization-Level Templates

For organizations with multiple projects, create templates at the organization level so every project can use them:

```python
# Create an org-level template
parent = f"organizations/{org_id}/locations/global"
response = dlp_client.create_inspect_template(
    parent=parent,
    inspect_template=template,
    template_id="org-standard-pii",
)
```

Org-level templates are ideal for enforcing company-wide scanning standards. Project teams can reference the org template and optionally add their own project-level templates for additional requirements.

## Summary

Templates bring consistency and maintainability to your Cloud DLP setup. Define inspection and de-identification configurations once, reference them across all your jobs, and update centrally when requirements change. Use project-level templates for team-specific needs and organization-level templates for company-wide standards. Combined with Terraform, you get version-controlled, auditable data protection configurations that scale across your entire GCP environment.
