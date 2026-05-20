# Validation Summary: How to Implement Change Approval Workflows with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications and sync policies
- Argo CD sync windows
- Argo CD RBAC
- Argo CD resource hooks and notifications
- Kubernetes Jobs
- GitHub branch protection and CODEOWNERS
- ServiceNow Table API integration
- Git and Argo CD CLI

## Sources Consulted
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD Sync Windows: https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD Resource Hooks / Sync Phases and Waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Build Environment Variables: https://argo-cd.readthedocs.io/en/latest/user-guide/build-environment/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD Notifications triggers and templates: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Kubernetes Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- GitHub protected branches documentation: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- GitHub CODEOWNERS documentation: https://docs.github.com/articles/about-code-owners
- ServiceNow Table API / REST API Explorer documentation: https://developer.servicenow.com/dev.do?_escaped_fragment_=%2Flearn%2Fcourses%2Fxanadu%2Fapp_store_learnv2_rest_xanadu_rest_integrations%2Fapp_store_learnv2_rest_xanadu_inbound_rest_integrations%2Fapp_store_learnv2_rest_xanadu_exercise_prepare_and_send_an_api_request_to_the_table_api

## Issues Found
- The sync window example used an always-active `allow` window with `manualSync: true` for emergencies. An active allow window permits syncs, so this would not be emergency-only and could allow automated syncs continuously. I changed the example to put `manualSync: true` on the restrictive allow and deny windows instead.
- The ServiceNow PreSync hook used the third-party `requests` package in `python:3.11-slim`, which does not include that dependency by default. I changed the example to use Python standard-library `urllib` modules.
- The ServiceNow hook used a fixed `metadata.name`. Named hooks can be reused awkwardly across syncs, especially after failures. I changed it to `generateName` so Argo CD can create a fresh hook Job per sync.
- The RBAC example was fenced as `csv` even though it is a Kubernetes ConfigMap YAML manifest. I changed the fence to `yaml`.
- The two-person-rule example assumed a PreSync Kubernetes Job had access to a Git checkout and an `ARGOCD_APP_SYNC_INITIATOR` environment variable. Argo CD does not document such a hook environment variable, and Kubernetes Jobs do not automatically contain the Git repository. I changed the example to an approval-service script that checks the commit author before calling `argocd app sync`.

## Review Notes
- The RBAC `override` action is powerful and allows syncing arbitrary local manifests when combined with `sync`. It is technically valid, but production environments should grant it only when users explicitly need override syncs.
- The ServiceNow query is still an illustrative example. Real deployments should align the `state`, `approval`, and `cmdb_ci` fields with the organization's ServiceNow data model.
