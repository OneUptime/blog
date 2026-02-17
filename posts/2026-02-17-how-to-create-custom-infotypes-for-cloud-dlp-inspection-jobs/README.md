# How to Create Custom InfoTypes for Cloud DLP Inspection Jobs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud DLP, Data Security, Custom InfoTypes, Privacy

Description: Learn how to create custom InfoTypes in Cloud DLP to detect organization-specific sensitive data patterns like internal IDs, custom account numbers, and proprietary codes.

---

Cloud DLP ships with over 150 built-in InfoTypes that cover common patterns like email addresses, credit card numbers, and social security numbers. But every organization has its own sensitive data patterns. Maybe you have internal employee IDs with a specific format, customer account numbers that follow a naming convention, or medical record identifiers unique to your systems.

Custom InfoTypes let you teach Cloud DLP to recognize these patterns. In this post, I will cover the three types of custom InfoTypes and show you how to use each one.

## Three Types of Custom InfoTypes

Cloud DLP supports three ways to define custom InfoTypes:

1. **Regular expression InfoTypes** - Match data based on a regex pattern
2. **Dictionary InfoTypes** - Match against a list of specific words or phrases
3. **Stored InfoTypes** - Dictionary or regex definitions stored in Cloud DLP for reuse across jobs

Each type has its strengths. Regex is great for structured patterns like IDs and codes. Dictionaries work well for finite lists of sensitive values. Stored InfoTypes save you from duplicating definitions across multiple inspection jobs.

## Custom InfoType 1: Regular Expression

Let us say your company assigns employee IDs in the format `EMP-XXXXX` where X is a digit. Here is how to create a regex-based custom InfoType to detect these:

```python
from google.cloud import dlp_v2

def inspect_with_custom_regex(project_id, content):
    """Inspect text using a custom regex InfoType for employee IDs."""

    dlp_client = dlp_v2.DlpServiceClient()

    # Define a custom InfoType using a regular expression
    custom_info_types = [
        {
            "info_type": {"name": "EMPLOYEE_ID"},
            "regex": {
                # Match patterns like EMP-12345 or EMP-00001
                "pattern": r"EMP-\d{5}"
            },
            "likelihood": dlp_v2.Likelihood.LIKELY,
        }
    ]

    # Include both built-in and custom InfoTypes
    inspect_config = {
        "custom_info_types": custom_info_types,
        "info_types": [
            {"name": "EMAIL_ADDRESS"},
            {"name": "PHONE_NUMBER"},
        ],
        "min_likelihood": dlp_v2.Likelihood.POSSIBLE,
        "include_quote": True,
    }

    # Create the content item to inspect
    item = {"value": content}

    # Run the inspection
    parent = f"projects/{project_id}/locations/global"
    response = dlp_client.inspect_content(
        parent=parent,
        inspect_config=inspect_config,
        item=item,
    )

    # Print findings
    for finding in response.result.findings:
        print(f"InfoType: {finding.info_type.name}")
        print(f"  Quote: {finding.quote}")
        print(f"  Likelihood: {finding.likelihood.name}")

    return response

# Test with sample content
sample = """
Employee John Smith (EMP-45231) reported an issue.
Contact: john.smith@company.com, 555-123-4567.
His manager is EMP-00142.
"""

inspect_with_custom_regex("my-project", sample)
```

Output would show findings for both `EMPLOYEE_ID` (matching `EMP-45231` and `EMP-00142`) and the built-in `EMAIL_ADDRESS` and `PHONE_NUMBER` types.

## Custom InfoType 2: Word List Dictionary

For values that do not follow a pattern but are from a known list, use a dictionary InfoType. This is useful for things like internal project code names, department names, or medication names.

```python
def inspect_with_custom_dictionary(project_id, content):
    """Inspect text using a dictionary-based custom InfoType."""

    dlp_client = dlp_v2.DlpServiceClient()

    # Define a dictionary InfoType with a word list
    custom_info_types = [
        {
            "info_type": {"name": "PROJECT_CODENAME"},
            "dictionary": {
                "word_list": {
                    # These are sensitive internal project code names
                    "words": [
                        "Project Falcon",
                        "Project Mercury",
                        "Project Atlas",
                        "Project Phoenix",
                        "Moonshot Initiative",
                    ]
                }
            },
            "likelihood": dlp_v2.Likelihood.LIKELY,
        },
        {
            "info_type": {"name": "INTERNAL_TEAM"},
            "dictionary": {
                "word_list": {
                    # Internal team names that should not appear in external docs
                    "words": [
                        "Tiger Team Alpha",
                        "Red Cell",
                        "Skunkworks",
                    ]
                }
            },
            "likelihood": dlp_v2.Likelihood.VERY_LIKELY,
        },
    ]

    inspect_config = {
        "custom_info_types": custom_info_types,
        "min_likelihood": dlp_v2.Likelihood.POSSIBLE,
        "include_quote": True,
    }

    item = {"value": content}
    parent = f"projects/{project_id}/locations/global"

    response = dlp_client.inspect_content(
        parent=parent,
        inspect_config=inspect_config,
        item=item,
    )

    for finding in response.result.findings:
        print(f"Found: {finding.info_type.name} = '{finding.quote}'")

    return response

# Test it
sample = """
The launch date for Project Mercury has been moved to Q3.
Tiger Team Alpha will handle the migration.
"""

inspect_with_custom_dictionary("my-project", sample)
```

## Custom InfoType 3: Stored InfoTypes

When you have large dictionaries or need to reuse custom InfoTypes across multiple jobs, stored InfoTypes are the way to go. They are saved in Cloud DLP and referenced by name.

Create a stored InfoType from a Cloud Storage file containing your word list:

```python
def create_stored_infotype(project_id, stored_infotype_id, gcs_path):
    """Create a stored InfoType from a word list in Cloud Storage."""

    dlp_client = dlp_v2.DlpServiceClient()

    # Define the stored InfoType configuration
    # The word list is stored in a GCS file, one word per line
    config = {
        "display_name": "Internal Account Numbers",
        "description": "List of sensitive internal account identifiers",
        "large_custom_dictionary": {
            "output_path": {
                "path": f"gs://my-project-dlp-config/stored-infotypes/{stored_infotype_id}/"
            },
            "cloud_storage_file_set": {
                "url": gcs_path
            },
        },
    }

    parent = f"projects/{project_id}/locations/global"

    response = dlp_client.create_stored_info_type(
        parent=parent,
        config=config,
        stored_info_type_id=stored_infotype_id,
    )

    print(f"Created stored InfoType: {response.name}")
    return response

# Create the stored InfoType from a GCS file
create_stored_infotype(
    "my-project",
    "internal-account-numbers",
    "gs://my-project-dlp-config/wordlists/account-numbers.txt"
)
```

Then reference it in your inspection jobs:

```python
def inspect_with_stored_infotype(project_id, content, stored_infotype_name):
    """Use a stored InfoType in an inspection job."""

    dlp_client = dlp_v2.DlpServiceClient()

    # Reference the stored InfoType
    custom_info_types = [
        {
            "info_type": {"name": "INTERNAL_ACCOUNT"},
            "stored_type": {
                "name": stored_infotype_name
            },
        }
    ]

    inspect_config = {
        "custom_info_types": custom_info_types,
        "info_types": [{"name": "EMAIL_ADDRESS"}],
        "min_likelihood": dlp_v2.Likelihood.POSSIBLE,
        "include_quote": True,
    }

    item = {"value": content}
    parent = f"projects/{project_id}/locations/global"

    response = dlp_client.inspect_content(
        parent=parent,
        inspect_config=inspect_config,
        item=item,
    )

    return response
```

## Using Custom InfoTypes in JSON Configurations

If you prefer JSON configurations (for REST API calls or Terraform), here is how custom InfoTypes look:

```json
{
  "inspectConfig": {
    "customInfoTypes": [
      {
        "infoType": {"name": "EMPLOYEE_ID"},
        "regex": {
          "pattern": "EMP-\\d{5}"
        },
        "likelihood": "LIKELY"
      },
      {
        "infoType": {"name": "INTERNAL_PROJECT"},
        "dictionary": {
          "wordList": {
            "words": ["Project Falcon", "Project Mercury", "Project Atlas"]
          }
        },
        "likelihood": "VERY_LIKELY"
      },
      {
        "infoType": {"name": "MEDICAL_RECORD_ID"},
        "regex": {
          "pattern": "MRN-[A-Z]{2}\\d{8}"
        },
        "likelihood": "VERY_LIKELY"
      }
    ],
    "infoTypes": [
      {"name": "EMAIL_ADDRESS"},
      {"name": "PHONE_NUMBER"}
    ],
    "minLikelihood": "POSSIBLE",
    "includeQuote": true
  }
}
```

## Adjusting Detection Sensitivity

Custom InfoTypes let you control the `likelihood` field, which affects how aggressively DLP flags matches. The levels from least to most confident are:

- `VERY_UNLIKELY`
- `UNLIKELY`
- `POSSIBLE`
- `LIKELY`
- `VERY_LIKELY`

For regex patterns that are very specific (like `EMP-\d{5}`), set likelihood to `VERY_LIKELY`. For broader patterns that might produce false positives, use `POSSIBLE` or `LIKELY` and filter results on the consumer side.

You can also add context rules to improve accuracy:

```python
# Add a proximity rule - only flag the pattern when it appears near certain keywords
custom_info_types = [
    {
        "info_type": {"name": "INTERNAL_ID"},
        "regex": {
            "pattern": r"[A-Z]{3}-\d{6}"
        },
        "detection_rules": [
            {
                "hotword_rule": {
                    "hotword_regex": {
                        # Only match when the pattern appears near these words
                        "pattern": r"(?i)(account|id|identifier|number)"
                    },
                    "proximity": {
                        "window_before": 50,
                    },
                    "likelihood_adjustment": {
                        "fixed_likelihood": dlp_v2.Likelihood.VERY_LIKELY,
                    },
                }
            }
        ],
        "likelihood": dlp_v2.Likelihood.POSSIBLE,
    }
]
```

This tells DLP to initially flag `[A-Z]{3}-\d{6}` patterns as `POSSIBLE`, but boost them to `VERY_LIKELY` when they appear within 50 characters of words like "account" or "id".

## Best Practices

**Start broad, then narrow.** Begin with permissive patterns and review the results. Tighten regex patterns or add detection rules to reduce false positives over time.

**Combine built-in and custom InfoTypes.** Use built-in InfoTypes for standard data (emails, SSNs) and custom InfoTypes for organization-specific patterns. They work together seamlessly.

**Use stored InfoTypes for large dictionaries.** If your word list has more than a few hundred entries, a stored InfoType backed by a Cloud Storage file is more practical than an inline word list.

**Version control your definitions.** Store your custom InfoType JSON configurations in version control alongside your inspection job configs. This gives you an audit trail of what you are scanning for.

**Test with known samples.** Create test data that includes known instances of your custom patterns and verify DLP detects them before rolling out to production scanning.

## Summary

Custom InfoTypes extend Cloud DLP beyond its built-in detection capabilities. Use regex InfoTypes for structured patterns, dictionary InfoTypes for known word lists, and stored InfoTypes for large reusable dictionaries. Combine these with detection rules and likelihood tuning to minimize false positives while catching the sensitive data patterns unique to your organization.
