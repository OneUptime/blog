# Validation Summary: How to Create IAM Deny Policies to Enforce Security Guardrails in Google Cloud

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud IAM
- IAM deny policies
- Google Cloud CLI (`gcloud iam policies`)
- Cloud Storage IAM and Public Access Prevention
- Service accounts and service account keys
- Resource Manager tags and IAM Conditions
- Organization Policy domain restricted sharing

## Sources Consulted
- Google Cloud IAM deny policies overview: https://docs.cloud.google.com/iam/docs/deny-overview
- Google Cloud IAM deny access guide: https://docs.cloud.google.com/iam/docs/deny-access
- Google Cloud IAM permissions supported in deny policies: https://docs.cloud.google.com/iam/docs/deny-permissions-support
- Google Cloud IAM principal identifiers: https://docs.cloud.google.com/iam/docs/principal-identifiers
- Google Cloud IAM Conditions attribute reference: https://docs.cloud.google.com/iam/docs/conditions-attribute-reference
- Google Cloud IAM Conditions overview: https://docs.cloud.google.com/iam/docs/conditions-overview
- Cloud Storage Public Access Prevention: https://docs.cloud.google.com/storage/docs/public-access-prevention
- Organization Policy domain restricted sharing: https://docs.cloud.google.com/organization-policy/restrict-domains
- Google Cloud SDK `gcloud iam policies create` reference: https://cloud.google.com/sdk/gcloud/reference/iam/policies/create

## Issues Found
- The first Cloud Storage deny policy used v1 permission names (`storage.objects.get`, `storage.objects.list`) and would have denied object access rather than preventing public bucket IAM grants. Replaced it with a `storage.googleapis.com/buckets.setIamPolicy` deny example and clarified that Cloud Storage Public Access Prevention is the correct control for fully blocking public access.
- The service account exception principal used an invalid deny-policy service account identifier (`principal://goog/sa/...`). Replaced it with `principal://iam.googleapis.com/projects/-/serviceAccounts/...`.
- The Cloud SQL delete permission used the v1 service name (`sqladmin.googleapis.com/instances.delete`). Replaced it with the deny-policy v2 permission name `cloudsql.googleapis.com/instances.delete`.
- The production tag condition used `resource.matchTag('env', 'production')`, which omits the required namespaced tag key. Replaced it with `resource.matchTag('123456789012/env', 'production')` and added a note to substitute the real tag key namespaced name.
- The Resource Manager project IAM permission used `resourcemanager.googleapis.com/projects.setIamPolicy`. Replaced it with the supported v2 deny permission `cloudresourcemanager.googleapis.com/projects.setIamPolicy`.
- The Terraform service account exception principal used an invalid service account principal format. Replaced it with the documented IAM service account principal URI.
- The external sharing example tried to use `api.getAttribute('iam.googleapis.com/modifiedGrantsByRole', ...)` in a deny policy and treated returned role names as member identities. IAM deny conditions only support resource tag functions, and `modifiedGrantsByRole` returns modified role names, not policy members. Reworked the section to explain that domain restricted sharing belongs to Organization Policy and changed the deny policy example to restrict who can modify sharing policies.
- The BigQuery sharing example used `bigquery.googleapis.com/datasets.update` for IAM sharing control. Replaced it with `bigquery.googleapis.com/datasets.setIamPolicy`.

## Review Notes
The `gcloud iam policies create/list/get/update/delete` command patterns and attachment point formats matched the official Google Cloud documentation. The post is now technically valid, but production rollouts should still test deny policies on a narrow attachment point first because IAM deny changes are inherited through the resource hierarchy and can interrupt administrative workflows.
