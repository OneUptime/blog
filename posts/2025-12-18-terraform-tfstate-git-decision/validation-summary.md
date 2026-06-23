# Validation Summary: How to Decide Whether to Commit .tfstate Files to Git

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform state
- Terraform backends
- AWS S3 backend
- AzureRM backend
- Google Cloud Storage backend
- HCP Terraform / Terraform Cloud
- Git and Git history rewriting
- Git ignore rules

## Sources Consulted
- Terraform state documentation: https://developer.hashicorp.com/terraform/language/state
- Terraform sensitive data documentation: https://developer.hashicorp.com/terraform/language/manage-sensitive-data
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform AzureRM backend documentation: https://developer.hashicorp.com/terraform/language/backend/azurerm
- Terraform GCS backend documentation: https://developer.hashicorp.com/terraform/language/backend/gcs
- Terraform state locking documentation: https://developer.hashicorp.com/terraform/language/state/locking
- Terraform dependency lock file documentation: https://developer.hashicorp.com/terraform/language/files/dependency-lock
- Terraform remote state data source documentation: https://developer.hashicorp.com/terraform/language/state/remote-state-data
- HCP Terraform cloud block documentation: https://developer.hashicorp.com/terraform/cli/cloud/settings
- Git filter-branch documentation: https://git-scm.com/docs/git-filter-branch
- git-filter-repo documentation: https://github.com/newren/git-filter-repo

## Issues Found
- The S3 backend examples used `dynamodb_table` for locking. Terraform's current S3 backend documentation marks DynamoDB-based locking as deprecated and recommends S3 lock files via `use_lockfile`. Updated the S3 backend examples to use `use_lockfile = true`.
- The backend infrastructure example created a DynamoDB lock table solely for deprecated S3 backend locking. Removed that table from the example.
- The `.gitignore` comment suggested the Terraform dependency lock file is only "sometimes" wanted. Terraform's dependency lock file documentation says root module lock files should be committed to version control. Updated the comment to say to commit it for root modules while leaving it commented out in `.gitignore`.
- The Git history cleanup example used `git filter-branch`. Git's own documentation warns about `filter-branch` safety and performance problems and points to `git filter-repo` as the safer alternative. Replaced the example with a `git filter-repo --path ... --invert-paths` command and added a remote restoration step before force-pushing.
- The additional S3 multi-environment backend examples did not enable locking. Added `use_lockfile = true` so they match the post's locking recommendation.

## Review Notes
- The `terraform_remote_state` example is syntactically valid, but Terraform documentation notes that consumers need access to the full state snapshot even though only outputs are exposed in configuration. For highly sensitive stacks, publishing specific values to a separate configuration store can be preferable.
