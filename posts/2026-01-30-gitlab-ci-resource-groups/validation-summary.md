# Validation Summary: How to Implement GitLab CI Resource Groups

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD
- GitLab CI resource groups
- GitLab Resource Groups API
- GitLab CI YAML configuration
- Docker
- Kubernetes kubectl deployment commands

## Sources Consulted
- GitLab Docs: Resource group - https://docs.gitlab.com/ci/resource_groups/
- GitLab Docs: Resource group API - https://docs.gitlab.com/api/resource_groups/
- GitLab Docs: CI/CD YAML syntax reference, interruptible - https://docs.gitlab.com/ci/yaml/#interruptible
- GitLab Docs: Customize pipeline configuration, auto-cancel redundant pipelines - https://docs.gitlab.com/ci/pipelines/settings/#auto-cancel-redundant-pipelines

## Issues Found
- The post said GitLab has three resource group process modes. GitLab documents four: `unordered`, `oldest_first`, `newest_first`, and `newest_ready_first`. Updated the section to include `newest_ready_first`, its API command, and its queue diagram entry.
- The `newest_first` section did not mention GitLab's idempotency requirement. Added that `newest_first` and `newest_ready_first` jobs must be idempotent.
- The `resource_group` examples and explanation implied cross-project locking. Clarified that resource groups serialize jobs across pipelines in the same project, and changed the shared infrastructure example to use multiple jobs in one project.
- The cross-project note suggested unspecified GitLab Premium features. Replaced it with external locking or an orchestrating pipeline that holds a resource group while triggering downstream deployments.
- The interruptible example implied `interruptible` alone cancels older jobs. GitLab requires auto-cancel behavior to be enabled/configured for `interruptible` to have that effect. Added `workflow:auto_cancel:on_new_commit: conservative` and adjusted the explanation.
- The troubleshooting section included a `DELETE /resource_groups/:key` API command and claimed it releases locks. The official Resource Groups API does not document a delete endpoint. Removed the unsupported delete command and replaced it with documented `current_job` and `upcoming_jobs` checks plus manual cancellation guidance.

## Review Notes
The remaining Docker and kubectl examples are illustrative and syntactically plausible, but they depend on project-specific runner images, registry authentication, Kubernetes context, namespace setup, and deployment names. The post does not pin a GitLab version; the review used current GitLab documentation as of 2026-06-11.
