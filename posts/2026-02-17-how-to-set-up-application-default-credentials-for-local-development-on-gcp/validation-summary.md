# Validation Summary: How to Set Up Application Default Credentials for Local Development on GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Platform
- Application Default Credentials
- Google Cloud CLI (`gcloud`)
- Google Cloud client libraries
- Cloud Storage client libraries for Python and Node.js
- Service accounts, service account keys, and service account impersonation
- Docker local development

## Sources Consulted
- Google Cloud: How Application Default Credentials works - https://cloud.google.com/docs/authentication/application-default-credentials
- Google Cloud: Set up ADC for a local development environment - https://cloud.google.com/docs/authentication/set-up-adc-local-dev-environment
- Google Cloud SDK: `gcloud auth application-default login` - https://cloud.google.com/sdk/gcloud/reference/auth/application-default/login
- Google Cloud SDK: `gcloud auth application-default set-quota-project` - https://cloud.google.com/sdk/gcloud/reference/auth/application-default/set-quota-project
- Google Cloud SDK: `gcloud auth application-default print-access-token` - https://cloud.google.com/sdk/gcloud/reference/auth/application-default/print-access-token
- Google Cloud: Use service account impersonation - https://cloud.google.com/docs/authentication/use-service-account-impersonation
- Google Cloud Storage: Listing buckets client library examples - https://cloud.google.com/storage/docs/listing-buckets
- Google Cloud Storage: IAM roles for Cloud Storage - https://cloud.google.com/storage/docs/access-control/iam-roles

## Issues Found
- The post description said the article covered workload identity federation, but the body covered user credentials, service account keys, and service account impersonation. Updated the description to match the content.
- The service account impersonation section implied universal client library support. Google documents that local ADC files generated with impersonation are supported only by supported authentication libraries, so the wording was narrowed to "supported client libraries."
- The quota project login example used `--client-id-file=client_id.json` as if it set a quota project. Google Cloud SDK docs state that `--client-id-file` uses the project that owns the OAuth client ID and does not write the quota project to ADC. Replaced it with `gcloud auth application-default login --project=my-project`.
- The multiple-project check attempted to decode an access token as a JWT and grep for a project. Access tokens should not be assumed to be JWTs or to contain project configuration. Replaced the snippet with a check of `quota_project_id` in the local ADC file.
- The identity verification section used `head -1` on `print-access-token` and then decoded the token. Google Cloud SDK docs recommend using the OAuth tokeninfo endpoint to inspect token details such as the associated account, so the snippet was replaced with the documented `curl` command.

## Review Notes
The examples are otherwise consistent with current Google Cloud documentation. The Cloud Storage sample code is syntactically consistent with official Python and Node.js examples, but users still need IAM permissions such as `storage.buckets.list` to list buckets successfully.
