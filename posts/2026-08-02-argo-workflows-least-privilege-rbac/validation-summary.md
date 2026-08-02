# Validation Summary: Least-Privilege RBAC for Argo Workflows: Controllers, Executors, Users, and Retries

## Status
validated

## Post Type
Security configuration guide

## Technologies Covered
- Argo Workflows 3.4 and later, including Argo Workflows 4 executor identity configuration
- Kubernetes RBAC Roles, RoleBindings, and ServiceAccounts
- Kubernetes service-account token mounting and token Secrets
- Argo Server client, server, and SSO authentication modes
- Argo Workflow Restrictions and WorkflowTemplates
- Argo CLI retry and resubmit operations
- kubectl, jq, Bash, and YAML
- Cloud workload identity and artifact-store authorization

## Sources Consulted
- Argo Workflows v4.0.8 release, the latest stable release at review time: https://github.com/argoproj/argo-workflows/releases/tag/v4.0.8
- Argo Workflows Workflow RBAC documentation: https://argo-workflows.readthedocs.io/en/latest/workflow-rbac/
- Argo Workflows field reference, including `WorkflowSpec`, `Template`, and `ExecutorConfig`: https://argo-workflows.readthedocs.io/en/release-4.0/fields/
- Argo Workflows workflow executor documentation: https://argo-workflows.readthedocs.io/en/release-4.0/workflow-executors/
- Argo Workflows security documentation: https://argo-workflows.readthedocs.io/en/latest/security/
- Argo Workflows installation and managed-namespace documentation: https://argo-workflows.readthedocs.io/en/latest/installation/ and https://argo-workflows.readthedocs.io/en/latest/managed-namespace/
- Argo Workflows Workflow Restrictions documentation: https://argo-workflows.readthedocs.io/en/latest/workflow-restrictions/
- Argo Workflows Argo Server auth-mode documentation: https://argo-workflows.readthedocs.io/en/latest/argo-server-auth-mode/
- Argo Workflows SSO RBAC documentation: https://argo-workflows.readthedocs.io/en/latest/argo-server-sso/
- Argo Workflows service-account token Secret documentation: https://argo-workflows.readthedocs.io/en/latest/service-account-secrets/
- Argo Workflows `argo retry` CLI reference: https://argo-workflows.readthedocs.io/en/latest/cli/argo_retry/
- Argo Workflows v4.0.8 retry server implementation: https://github.com/argoproj/argo-workflows/blob/v4.0.8/server/workflow/workflow_server.go
- Argo Workflows v4.0.8 retry CLI implementation: https://github.com/argoproj/argo-workflows/blob/v4.0.8/cmd/argo/commands/retry.go
- Argo Workflows official controller RBAC manifests: https://github.com/argoproj/argo-workflows/tree/main/manifests/cluster-install-no-crds/workflow-controller-rbac
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes ServiceAccount documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes service-account administration documentation: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/

## Issues Found

1. **Workflow Pod and executor identities were presented as universally identical.** Argo Workflows 4 supports `spec.executor.serviceAccountName` and template-level `executor.serviceAccountName`, while a template-level `serviceAccountName` can also override the Workflow-level runtime account. Updated the actor map and runtime guidance, and documented how `automountServiceAccountToken: false` plus a dedicated executor account separates application and executor credentials.

2. **The namespace-install warning conflated namespace and managed-namespace topologies.** Reworded it to state precisely that a namespace-scoped installation accepting user submissions should configure a managed namespace separate from the Argo component namespace.

3. **Secret resolution omitted the kubelet.** Kubernetes resolves normal Pod Secret references through the kubelet, while Argo-specific Secret access can involve the controller or executor. Updated the explanation without changing the least-privilege recommendation for submitters.

4. **The SSO RBAC example was incomplete for Kubernetes 1.24 and later.** Kubernetes no longer automatically creates long-lived service-account token Secrets, and Argo's SSO RBAC currently requires a discoverable token Secret. Added the correctly named and annotated Secret, and clarified that the target RoleBinding must name the `team-a-operator` ServiceAccount from namespace `argo`.

5. **The retry Role was stated too generally for all `argo retry` modes.** The shown `get`/`update` Workflow and `delete` Pod permissions are sufficient for retrying a named Workflow without follow-up streaming, but selectors and `@latest` require Workflow `list`; `--wait` and `--watch` require Workflow `watch`; and `--log` also requires Workflow `watch`, Pod `list`/`watch`, and `pods/log` `get`. Scoped the base Role description and added the exact mode-dependent permissions verified from the v4.0.8 CLI and server implementations.

6. **The official controller RBAC link pointed to a removed path.** Updated it from `manifests/cluster-install/workflow-controller-rbac` to the current `manifests/cluster-install-no-crds/workflow-controller-rbac` directory.

## Review Notes
- All eight YAML code blocks parse successfully.
- The complete Workflow example passes strict offline linting with the official Argo Workflows v4.0.8 CLI.
- The Bash block passes `bash -n`, and the binding-discovery jq expression works with jq 1.6.
- The `kubectl auth can-i` resource syntax and impersonation flag match kubectl v1.34.1 help. A live authorization result depends on the target cluster and therefore was not executed during this static review.
- The executor minimum of `create` and `patch` on `workflowtaskresults.argoproj.io` remains the documented minimum for Argo Workflows 3.4 and later.
