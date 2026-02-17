# How to Create Exclusion Rules to Reduce False Positives in Cloud DLP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud DLP, False Positives, Data Security, Inspection Rules

Description: Learn how to create exclusion rules in Cloud DLP to reduce false positive detections and improve the accuracy of your sensitive data scanning jobs.

---

Cloud DLP is aggressive about finding sensitive data, and that is generally what you want. But it also means you get false positives. A product SKU that happens to be 9 digits gets flagged as a social security number. The word "Virginia" in an address gets matched as a person's name. A test phone number like "555-0100" shows up as a real phone number. An internal ID format overlaps with a credit card number pattern.

These false positives waste time during review, inflate your findings, and can trigger unnecessary alerts. Exclusion rules let you tell DLP to ignore specific matches that you know are not actually sensitive data.

## Types of Exclusion Rules

Cloud DLP supports several types of exclusion rules:

1. **Dictionary exclusion**: Exclude specific words or phrases from matches
2. **Regex exclusion**: Exclude matches that match a regex pattern
3. **Exclude InfoType**: Exclude findings that also match another InfoType

You attach exclusion rules to specific InfoTypes through rule sets. The rules are evaluated after initial detection, so DLP first finds all matches and then filters out the exclusions.

## Step 1: Dictionary Exclusion for Known Non-Sensitive Values

The most common exclusion is a list of known values that should not be flagged. Here is how to exclude test data, system-generated values, and common false positives:

```python
from google.cloud import dlp_v2

def inspect_with_dictionary_exclusion(project_id, content):
    """Inspect content with dictionary-based exclusion rules."""

    dlp_client = dlp_v2.DlpServiceClient()

    inspect_config = {
        "info_types": [
            {"name": "PERSON_NAME"},
            {"name": "PHONE_NUMBER"},
            {"name": "EMAIL_ADDRESS"},
            {"name": "US_SOCIAL_SECURITY_NUMBER"},
        ],
        "rule_set": [
            {
                # Apply exclusions to PERSON_NAME detections
                "info_types": [{"name": "PERSON_NAME"}],
                "rules": [
                    {
                        "exclusion_rule": {
                            "dictionary": {
                                "word_list": {
                                    "words": [
                                        # Common false positives for names
                                        "Admin",
                                        "System",
                                        "Service",
                                        "Default",
                                        "Test",
                                        "Example",
                                        "NULL",
                                        "None",
                                        "Unknown",
                                        # State names that get matched as person names
                                        "Virginia",
                                        "Georgia",
                                        "Carolina",
                                        "Montana",
                                        "Dakota",
                                        # Common product or company names
                                        "Amazon",
                                        "Azure",
                                        "Chrome",
                                        "Safari",
                                    ]
                                }
                            },
                            "matching_type": "MATCHING_TYPE_FULL_MATCH",
                        }
                    }
                ],
            },
            {
                # Exclude test phone numbers
                "info_types": [{"name": "PHONE_NUMBER"}],
                "rules": [
                    {
                        "exclusion_rule": {
                            "dictionary": {
                                "word_list": {
                                    "words": [
                                        "555-0100",
                                        "555-0199",
                                        "000-000-0000",
                                        "+1-555-555-5555",
                                    ]
                                }
                            },
                            "matching_type": "MATCHING_TYPE_PARTIAL_MATCH",
                        }
                    }
                ],
            },
            {
                # Exclude test SSNs
                "info_types": [{"name": "US_SOCIAL_SECURITY_NUMBER"}],
                "rules": [
                    {
                        "exclusion_rule": {
                            "dictionary": {
                                "word_list": {
                                    "words": [
                                        "000-00-0000",
                                        "111-11-1111",
                                        "123-45-6789",
                                        "999-99-9999",
                                    ]
                                }
                            },
                            "matching_type": "MATCHING_TYPE_FULL_MATCH",
                        }
                    }
                ],
            },
        ],
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

    print(f"Findings (after exclusions):")
    for finding in response.result.findings:
        print(f"  {finding.info_type.name}: '{finding.quote}' ({finding.likelihood.name})")

    return response

# Test - "Virginia" and "555-0100" should be excluded
sample = """
Customer Virginia Smith called from 555-0100 about account 123-45-6789.
Her real number is 408-555-1234 and SSN is 567-89-0123.
Admin user reported the issue. Contact: admin@company.com
"""

inspect_with_dictionary_exclusion("my-project", sample)
```

## Step 2: Regex-Based Exclusion

When false positives follow a pattern, use regex exclusion rules. This is more flexible than listing every value.

```python
def inspect_with_regex_exclusion(project_id, content):
    """Exclude matches that follow known non-sensitive patterns."""

    dlp_client = dlp_v2.DlpServiceClient()

    inspect_config = {
        "info_types": [
            {"name": "US_SOCIAL_SECURITY_NUMBER"},
            {"name": "CREDIT_CARD_NUMBER"},
            {"name": "PHONE_NUMBER"},
        ],
        "rule_set": [
            {
                # Exclude SSN-like patterns that are actually product SKUs
                "info_types": [{"name": "US_SOCIAL_SECURITY_NUMBER"}],
                "rules": [
                    {
                        "exclusion_rule": {
                            "regex": {
                                # SKU format: 3 digits, dash, 2 digits, dash, 4 digits
                                # Same format as SSN but starts with specific prefixes
                                "pattern": r"(SKU|PRD|INV)-?\d{3}-?\d{2}-?\d{4}"
                            },
                            "matching_type": "MATCHING_TYPE_FULL_MATCH",
                        }
                    },
                    {
                        "exclusion_rule": {
                            "regex": {
                                # Exclude SSNs that start with 000 or 900-999
                                # (these are not valid SSN ranges)
                                "pattern": r"(000|9\d{2})-\d{2}-\d{4}"
                            },
                            "matching_type": "MATCHING_TYPE_FULL_MATCH",
                        }
                    },
                ],
            },
            {
                # Exclude credit card patterns that are actually internal IDs
                "info_types": [{"name": "CREDIT_CARD_NUMBER"}],
                "rules": [
                    {
                        "exclusion_rule": {
                            "regex": {
                                # Internal order IDs that happen to be 16 digits
                                "pattern": r"ORD\d{16}"
                            },
                            "matching_type": "MATCHING_TYPE_PARTIAL_MATCH",
                        }
                    },
                ],
            },
            {
                # Exclude phone number patterns in specific formats
                "info_types": [{"name": "PHONE_NUMBER"}],
                "rules": [
                    {
                        "exclusion_rule": {
                            "regex": {
                                # Exclude numbers in the 555 test range
                                "pattern": r"555-01\d{2}"
                            },
                            "matching_type": "MATCHING_TYPE_PARTIAL_MATCH",
                        }
                    },
                ],
            },
        ],
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
        print(f"  {finding.info_type.name}: '{finding.quote}'")

    return response
```

## Step 3: Exclude by Overlapping InfoType

Sometimes a value matches one InfoType but also matches another that you know is not sensitive. For example, a US phone number might also match a PERSON_NAME if DLP interprets part of the number as a name-like string.

```python
def inspect_with_infotype_exclusion(project_id, content):
    """Exclude findings that overlap with another InfoType."""

    dlp_client = dlp_v2.DlpServiceClient()

    inspect_config = {
        "info_types": [
            {"name": "PERSON_NAME"},
            {"name": "EMAIL_ADDRESS"},
            {"name": "DOMAIN_NAME"},
        ],
        "rule_set": [
            {
                # If something matches both PERSON_NAME and EMAIL_ADDRESS,
                # exclude the PERSON_NAME match (it is probably just the
                # name part of an email, not an actual person name finding)
                "info_types": [{"name": "PERSON_NAME"}],
                "rules": [
                    {
                        "exclusion_rule": {
                            "exclude_info_types": {
                                "info_types": [{"name": "EMAIL_ADDRESS"}]
                            },
                            "matching_type": "MATCHING_TYPE_PARTIAL_MATCH",
                        }
                    }
                ],
            },
            {
                # Exclude DOMAIN_NAME findings that overlap with EMAIL_ADDRESS
                "info_types": [{"name": "DOMAIN_NAME"}],
                "rules": [
                    {
                        "exclusion_rule": {
                            "exclude_info_types": {
                                "info_types": [{"name": "EMAIL_ADDRESS"}]
                            },
                            "matching_type": "MATCHING_TYPE_PARTIAL_MATCH",
                        }
                    }
                ],
            },
        ],
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
        print(f"  {finding.info_type.name}: '{finding.quote}'")

    return response
```

## Step 4: Combine Multiple Exclusion Strategies

In practice, you will want to combine different exclusion types. Here is a comprehensive example:

```json
{
  "inspectConfig": {
    "infoTypes": [
      {"name": "PERSON_NAME"},
      {"name": "US_SOCIAL_SECURITY_NUMBER"},
      {"name": "PHONE_NUMBER"},
      {"name": "EMAIL_ADDRESS"},
      {"name": "CREDIT_CARD_NUMBER"}
    ],
    "ruleSet": [
      {
        "infoTypes": [{"name": "PERSON_NAME"}],
        "rules": [
          {
            "exclusionRule": {
              "dictionary": {
                "wordList": {
                  "words": ["Admin", "System", "Service", "Test", "Default",
                            "Virginia", "Georgia", "Montana", "Dakota"]
                }
              },
              "matchingType": "MATCHING_TYPE_FULL_MATCH"
            }
          },
          {
            "exclusionRule": {
              "regex": {
                "pattern": "^[A-Z]{2,3}$"
              },
              "matchingType": "MATCHING_TYPE_FULL_MATCH"
            }
          },
          {
            "exclusionRule": {
              "excludeInfoTypes": {
                "infoTypes": [{"name": "EMAIL_ADDRESS"}]
              },
              "matchingType": "MATCHING_TYPE_PARTIAL_MATCH"
            }
          }
        ]
      },
      {
        "infoTypes": [{"name": "US_SOCIAL_SECURITY_NUMBER"}],
        "rules": [
          {
            "exclusionRule": {
              "regex": {
                "pattern": "(000|666|9\\d{2})-\\d{2}-\\d{4}"
              },
              "matchingType": "MATCHING_TYPE_FULL_MATCH"
            }
          }
        ]
      }
    ],
    "minLikelihood": "POSSIBLE"
  }
}
```

## Step 5: Use Exclusion Rules in Templates

For organization-wide consistency, put your exclusion rules in DLP templates:

```python
def create_template_with_exclusions(project_id):
    """Create an inspection template with built-in exclusion rules."""

    dlp_client = dlp_v2.DlpServiceClient()

    template = {
        "display_name": "PII Detection with Exclusions",
        "description": "Standard PII detection with false positive exclusions",
        "inspect_config": {
            "info_types": [
                {"name": "PERSON_NAME"},
                {"name": "EMAIL_ADDRESS"},
                {"name": "PHONE_NUMBER"},
                {"name": "US_SOCIAL_SECURITY_NUMBER"},
            ],
            "rule_set": [
                {
                    "info_types": [{"name": "PERSON_NAME"}],
                    "rules": [
                        {
                            "exclusion_rule": {
                                "dictionary": {
                                    "word_list": {
                                        "words": [
                                            "Admin", "System", "Service",
                                            "Test", "Default", "NULL",
                                            "N/A", "Unknown",
                                        ]
                                    }
                                },
                                "matching_type": "MATCHING_TYPE_FULL_MATCH",
                            }
                        },
                    ],
                },
            ],
            "min_likelihood": dlp_v2.Likelihood.POSSIBLE,
        },
    }

    parent = f"projects/{project_id}/locations/global"

    response = dlp_client.create_inspect_template(
        parent=parent,
        inspect_template=template,
        template_id="pii-with-exclusions-v1",
    )

    print(f"Template created: {response.name}")
    return response
```

## Matching Type Explained

The `matching_type` parameter controls how the exclusion matches against findings:

- **`MATCHING_TYPE_FULL_MATCH`**: The entire finding must match the exclusion pattern. Use this for exact values like specific test SSNs or known non-sensitive words.
- **`MATCHING_TYPE_PARTIAL_MATCH`**: The finding is excluded if it contains the exclusion pattern. Use this for broader patterns or when the finding includes surrounding context.
- **`MATCHING_TYPE_INVERSE_MATCH`**: Excludes findings that do NOT match the pattern. Use this to create allow-lists - only keep findings that match a specific pattern.

## Iterative Approach to Exclusion Rules

Building good exclusion rules is an iterative process:

1. **Run an initial scan** without exclusion rules
2. **Review the findings** and identify common false positives
3. **Categorize the false positives** - are they specific values (dictionary), patterns (regex), or overlapping types (InfoType exclusion)?
4. **Create exclusion rules** for the most common false positive categories
5. **Re-run the scan** and check that true positives were not accidentally excluded
6. **Repeat** until the false positive rate is acceptable

Keep a log of false positives you encounter. Over time, this becomes your exclusion rule library that you can share across teams and projects.

## Summary

Exclusion rules are essential for practical DLP scanning. Without them, the noise from false positives drowns out real findings and erodes trust in the scanning results. Use dictionary exclusions for known non-sensitive values, regex exclusions for patterns, and InfoType exclusions for overlapping detections. Put your exclusion rules in templates for consistency, and refine them iteratively based on actual scan results. The goal is not zero false positives - it is a manageable false positive rate that lets your team focus on real sensitive data.
