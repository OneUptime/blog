# Validation Summary: How to Secure API Keys with Application and IP Restrictions in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Platform
- API Keys API
- Google Cloud CLI (`gcloud`)
- Google Maps Platform API key restrictions
- Cloud Monitoring
- Java `keytool`

## Sources Consulted
- Google Cloud: Manage API keys: https://docs.cloud.google.com/docs/authentication/api-keys
- Google Cloud: Best practices for managing API keys: https://cloud.google.com/docs/authentication/api-keys-best-practices
- Google Cloud SDK: `gcloud services api-keys create`: https://docs.cloud.google.com/sdk/gcloud/reference/services/api-keys/create
- Google Cloud SDK: `gcloud services api-keys update`: https://cloud.google.com/sdk/gcloud/reference/services/api-keys/update
- Google Cloud SDK: `gcloud services api-keys list`: https://cloud.google.com/sdk/gcloud/reference/services/api-keys/list
- API Keys API REST reference: https://docs.cloud.google.com/api-keys/docs/reference/rest/v2/projects.locations.keys
- Google Cloud: Monitoring API usage: https://docs.cloud.google.com/apis/docs/monitoring
- Google Cloud SDK: `gcloud monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Cloud Monitoring API `projects.timeSeries.list`: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.timeSeries/list
- Google Maps Platform API key security best practices: https://developers.google.com/maps/api-security-best-practices

## Issues Found
- The IP restriction example included `10.128.0.0/20`, which is an internal RFC1918 range. Google Cloud API key server restrictions support external caller IP addresses, IPv6 addresses, and CIDR subnets, but not internal IP addresses or `localhost`. Replaced it with `198.51.100.0/24`, a documentation/example external range.
- The `gcloud services api-keys list` examples displayed `uid` while the subsequent update/delete examples use the key resource ID. Changed the table format to `name.basename():label=KEY_ID` so the displayed value matches the `KEY_ID` expected by `gcloud services api-keys update`.
- The `gcloud monitoring time-series list` command is not available in the current documented `gcloud monitoring` command group. Replaced it with a Cloud Monitoring API `timeSeries` request using `curl` and `gcloud auth print-access-token`.
- The monitoring example used BSD `date -v-24H`, which does not work in typical Linux or Google Cloud Shell environments. Replaced it with GNU-compatible `date -u -d '24 hours ago'`.
- The alerting policy command used stale flags (`--condition-threshold-value`, `--condition-threshold-comparison`, and `--condition-threshold-duration`). Updated the command to current `gcloud monitoring policies create` flags: `--if='> 10000'` and `--duration=300s`.
- The alert filter now includes `resource.type="consumed_api"` to match the documented Service Runtime API usage metric resource for Google API consumers.

## Review Notes
The API key restriction commands and flags for IP addresses, HTTP referrers, Android applications, iOS bundle IDs, and API targets are current in the official `gcloud services api-keys` documentation. Google notes that some application restrictions, especially HTTP referrer and mobile-app restrictions, can be bypassed and should be combined with API restrictions and monitoring, which is consistent with the post.
