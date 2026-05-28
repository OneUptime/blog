# Validation Summary: How to Create Custom InfoTypes for Cloud DLP Inspection Jobs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Sensitive Data Protection / Cloud DLP
- Cloud DLP API
- Python client library for Cloud DLP
- Custom infoType detectors
- Regular expression custom infoTypes
- Dictionary custom infoTypes
- Stored infoTypes / large custom dictionaries
- JSON inspect configurations

## Sources Consulted
- Google Cloud Sensitive Data Protection: Custom infoType detectors: https://docs.cloud.google.com/sensitive-data-protection/docs/creating-custom-infotypes
- Google Cloud Sensitive Data Protection: Creating a custom regex detector: https://docs.cloud.google.com/sensitive-data-protection/docs/creating-custom-infotypes-regex
- Google Cloud Sensitive Data Protection: Creating a regular custom dictionary detector: https://docs.cloud.google.com/sensitive-data-protection/docs/creating-custom-infotypes-dictionary
- Google Cloud Sensitive Data Protection: Create a large custom dictionary detector: https://docs.cloud.google.com/sensitive-data-protection/docs/creating-stored-infotypes
- Google Cloud Sensitive Data Protection: Customizing match likelihood: https://docs.cloud.google.com/sensitive-data-protection/docs/creating-custom-infotypes-likelihood
- Google Cloud Sensitive Data Protection sample: Scan content using a large custom dictionary detector: https://docs.cloud.google.com/sensitive-data-protection/docs/samples/dlp-inspect-with-stored-infotype
- Google Cloud Python client reference: DlpServiceClient: https://docs.cloud.google.com/python/docs/reference/dlp/latest/google.cloud.dlp_v2.services.dlp_service.DlpServiceClient
- Google Cloud Sensitive Data Protection RPC reference: InspectContentRequest: https://docs.cloud.google.com/sensitive-data-protection/docs/reference/rpc/google.privacy.dlp.v2#inspectcontentrequest

## Issues Found
- The post described three custom infoType options as the complete set. Current Sensitive Data Protection docs include additional custom detector options such as metadata label detectors and surrogate detectors, while regex, dictionary, and stored types remain the common options for content inspection. Updated the wording to say these are three common options for content inspection jobs.
- The Python `inspect_content` examples passed `parent`, `inspect_config`, and `item` as top-level keyword arguments. Current official Python samples use `inspect_content(request={...})`. Updated all `inspect_content` examples to pass a request dictionary.
- The Python `create_stored_info_type` example passed `stored_info_type_id` as a top-level keyword argument. Current official samples pass `stored_info_type_id` inside the request dictionary. Updated the call accordingly.
- The best-practice guidance suggested using stored infoTypes for more than a few hundred dictionary entries. Current docs state regular custom dictionaries can handle much larger lists, while large/stored custom dictionaries are appropriate for very large, frequently changing, or reused lists. Updated the guidance to match.

## Review Notes
The post still uses the Cloud DLP name, which is acceptable because Google notes Cloud DLP is now part of Sensitive Data Protection and the API name remains Cloud Data Loss Prevention API. Future cleanup could mention the Sensitive Data Protection product name explicitly.
