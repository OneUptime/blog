# Validation Summary: How to Configure Cloud Build Triggers to Run Only on Specific Branch Patterns

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Build
- Google Cloud CLI (`gcloud`)
- Cloud Build triggers
- RE2 regular expressions
- Git branch and tag filters
- Cloud Build included and ignored file filters
- Terraform Google provider

## Sources Consulted
- Google Cloud SDK reference for `gcloud builds triggers create github`: https://cloud.google.com/sdk/gcloud/reference/builds/triggers/create/github
- Google Cloud Build trigger REST resource documentation: https://cloud.google.com/build/docs/api/reference/rest/v1/projects.locations.triggers
- Google Cloud Build create and manage triggers documentation: https://cloud.google.com/build/docs/automating-builds/create-manage-triggers
- RE2 syntax reference: https://github.com/google/re2/wiki/Syntax
- Terraform Registry documentation for `google_cloudbuild_trigger`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloudbuild_trigger

## Issues Found
- The post said Cloud Build branch exclusion could be implemented with a negative lookahead pattern such as `^(?!main$|develop$).*`. Cloud Build trigger patterns use RE2 syntax, and RE2 does not support lookahead assertions. I replaced this with an `invertRegex` trigger-config example.
- The trigger listing command used `triggerTemplate.branchName` and `triggerTemplate.tagName`, which are Cloud Source Repository trigger fields. The post's examples create GitHub triggers, so I changed the listing format to `github.push.branch` and `github.push.tag`.
- The local regex test used `grep -P`, which tests PCRE syntax and can accept expressions Cloud Build's RE2 engine rejects. I changed it to `grep -E` for the shown pattern to avoid suggesting PCRE-only behavior.

## Review Notes
The `gcloud` binary is not installed in this workspace, so CLI validation was performed against the current official Google Cloud SDK command reference instead of local `--help` output.
