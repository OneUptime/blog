# Validation Summary: How to Create Exclusion Rules to Reduce False Positives in Cloud DLP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Sensitive Data Protection / Cloud DLP
- Data Loss Prevention API
- Python client library for Cloud DLP
- InspectConfig rule sets
- Exclusion rules, dictionaries, regexes, InfoTypes, and inspection templates

## Sources Consulted
- Google Cloud Sensitive Data Protection REST reference: InspectConfig and ExclusionRule: https://cloud.google.com/sensitive-data-protection/docs/reference/rest/v2/InspectConfig
- Google Cloud Sensitive Data Protection REST reference: projects.locations.content.inspect: https://cloud.google.com/sensitive-data-protection/docs/reference/rest/v2/projects.locations.content/inspect
- Google Cloud Sensitive Data Protection REST reference: projects.locations.inspectTemplates.create: https://cloud.google.com/sensitive-data-protection/docs/reference/rest/v2/projects.locations.inspectTemplates/create
- Google Cloud Python client library reference for DlpServiceClient 3.35.0: https://cloud.google.com/python/docs/reference/dlp/latest/google.cloud.dlp_v2.services.dlp_service.DlpServiceClient
- Google Cloud Sensitive Data Protection InfoType detector reference: https://cloud.google.com/sensitive-data-protection/docs/infotypes-reference

## Issues Found
- The Python `inspect_content` examples passed `parent`, `inspect_config`, and `item` as separate flattened arguments. The current Python client documents `inspect_content` as taking a request object or dict, so the examples were updated to call `inspect_content(request={...})`.
- The regex SKU exclusion example matched a `SKU`, `PRD`, or `INV` prefix even though exclusion regex matching is applied to the finding itself. The example was changed to use internal numeric SKU ranges that are part of the SSN-like finding quote.
- The overlapping InfoType explanation used a phone-number-to-person-name example that did not match the code. It was changed to describe email-address overlap with `PERSON_NAME` and `DOMAIN_NAME`, which matches the example.
- The post made the three listed exclusion rule types sound exhaustive. It now says the post covers three common exclusion rule types, because the API also includes specialized exclusion mechanisms.
- The inspection template example passed `template_id` as a flattened Python argument, but the current Python client method does not expose `template_id` as a flattened parameter. The unsupported argument was removed.
- The `MATCHING_TYPE_PARTIAL_MATCH` explanation was too broad. It now distinguishes regex substring matches, dictionary-token partial matches, and overlapping excluded InfoTypes.

## Review Notes
Cloud DLP is now part of Google Cloud Sensitive Data Protection, but the API name remains Cloud Data Loss Prevention API. The post's use of "Cloud DLP" is still understandable and compatible with the Python `google.cloud.dlp_v2` client naming.
