# Validation Summary: How to Implement Approval-Gated Deployments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD Applications, sync policies, RBAC, hooks, API, and notifications
- GitOps deployment workflows
- GitHub branch protection and CODEOWNERS
- Kubernetes Jobs, ConfigMaps, and Secrets
- Slack Bolt for Python and Block Kit buttons
- ServiceNow REST/Table API integration

## Sources Consulted
- Argo CD automated sync policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD RBAC configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD declarative Application setup: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD sync options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD resource hooks: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Argo CD notifications triggers: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD Slack notifications service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/slack/
- Argo CD API docs: https://argo-cd.readthedocs.io/en/latest/developer-guide/api-docs/
- GitHub CODEOWNERS documentation: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
- GitHub protected branches documentation: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches
- Slack Bolt for Python action handling: https://docs.slack.dev/tools/bolt-python/concepts/actions/
- Slack Block Kit button element: https://docs.slack.dev/reference/block-kit/block-elements/button-element/
- Kubernetes Job documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- ServiceNow REST API documentation: https://www.servicenow.com/docs/r/api-reference/rest-api-explorer/c_RESTAPI.html
- ServiceNow Change Management API documentation: https://www.servicenow.com/docs/r/xanadu/api-reference/rest-apis/change-management-api.html

## Issues Found
- The PR-based Argo CD Application example omitted `spec.project`, `spec.source.repoURL`, and `spec.destination`, which are part of a valid minimal Application manifest. Added those fields so the example is complete.
- The multi-stage Application example omitted `spec.project`. Added `project: production` for consistency with Argo CD Application examples and RBAC references.
- The CODEOWNERS comment implied both listed teams must approve. GitHub requires approval from any listed code owner for a matched pattern, so the comment now says at least one listed owner.
- The Slack bot example used `os.environ` without importing `os`. Added the import.
- The Slack bot example described duplicate approval prevention as self-approval prevention and used `body["user"]["username"]`. Updated the comment and used the stable Slack user ID from the action payload.
- The Slack bot example did not check whether the Argo CD sync API request succeeded. Added `response.raise_for_status()` before announcing deployment initiation.
- The PreSync hook used `kubectl get configmap` from inside the Job, which would require extra tooling and Kubernetes RBAC not shown in the snippet. Changed it to inject the change ticket with `configMapKeyRef`.
- The PreSync hook used a fixed Job name with only `HookSucceeded`. A failed hook could remain and block subsequent retries. Added `BeforeHookCreation` to the hook delete policy.
- The notification trigger was named `on-sync-status-unknown` while it actually triggers on `OutOfSync`. Renamed it to `on-out-of-sync` to match its behavior.

## Review Notes
- The ServiceNow example assumes the organization's change process stores an `approval` field value of `approved`; ServiceNow schemas and workflows are commonly customized, so teams should confirm the exact field and allowed values in their instance.
- The Slack approval bot is a simplified example and stores pending approvals in process memory. A production bot should use durable storage and verify approver authorization.
