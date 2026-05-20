# Validation Summary: How to Deploy Teleport with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Teleport
- Teleport Helm charts
- Teleport Kubernetes Operator
- Teleport GitHub SSO connector
- Teleport RBAC roles
- Argo CD
- Kubernetes
- GitOps
- kubectl
- tsh and tctl

## Sources Consulted
- Teleport `teleport-cluster` Helm chart reference: https://goteleport.com/docs/reference/helm-reference/teleport-cluster/
- Teleport `teleport-kube-agent` Helm chart reference: https://goteleport.com/docs/reference/helm-reference/teleport-kube-agent/
- Teleport Helm chart repository index: https://charts.releases.teleport.dev/index.yaml
- Teleport v18.8.1 `teleport-cluster` chart values: https://raw.githubusercontent.com/gravitational/teleport/v18.8.1/examples/chart/teleport-cluster/values.yaml
- Teleport v18.8.1 `teleport-kube-agent` chart values: https://raw.githubusercontent.com/gravitational/teleport/v18.8.1/examples/chart/teleport-kube-agent/values.yaml
- Teleport Kubernetes Operator documentation: https://goteleport.com/docs/zero-trust-access/infrastructure-as-code/teleport-operator/
- Teleport Operator secret lookup documentation: https://goteleport.com/docs/zero-trust-access/infrastructure-as-code/teleport-operator/secret-lookup/
- Teleport `TeleportGithubConnector` resource reference: https://goteleport.com/docs/reference/infrastructure-as-code/operator-resources/resources-teleport-dev-githubconnectors/
- Teleport role reference: https://goteleport.com/docs/reference/access-controls/roles/
- Teleport configuration reference: https://goteleport.com/docs/reference/deployment/config/
- Teleport session recording reference: https://goteleport.com/docs/reference/architecture/session-recording/
- Teleport supported releases / upcoming releases: https://goteleport.com/docs/upcoming-releases/
- Teleport `tctl` CLI reference: https://goteleport.com/docs/reference/cli/tctl/
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD diff customization documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/

## Issues Found
- The Helm chart examples pinned Teleport chart version `16.4.6`, which is no longer in the supported current/stable Teleport major versions as of the validation date. Updated both `teleport-cluster` and `teleport-kube-agent` chart references to `18.8.1`, the latest chart version listed in the official chart repository.
- The `teleport-cluster` values used unsupported top-level `teleportConfig`. Updated the example to use `auth.teleportConfig` and `proxy.teleportConfig`, which are the chart-supported override locations.
- The example enabled ingress without setting `service.type: ClusterIP`, and placed ingress annotations under `ingress.spec`. Updated the values to set `service.type: ClusterIP` and place annotations under the chart's `annotations.ingress` value.
- The standalone chart example set `highAvailability.replicaCount: 2` with a single persistent volume. The official chart warns that multi-replica Auth Service deployments need HA backend storage. Changed the standalone example to one replica and added a note to use `aws`, `gcp`, or `azure` chart modes for multi-replica Auth Service deployments.
- The post said roles were managed as Kubernetes custom resources, but the role and GitHub connector examples used native Teleport `tctl` resource YAML. Updated them to Teleport Kubernetes Operator CRDs: `TeleportRole` and `TeleportGithubConnector`.
- The GitHub connector showed a raw `client_secret` placeholder with a comment about Secret references. Updated it to use the operator-supported `secret://...` lookup syntax and added the required Kubernetes Secret annotation.
- The role examples used `require_session_mfa: true`. The current role schema accepts the MFA requirement as an int-or-string value, so the examples now use `require_session_mfa: yes`.
- The kube-agent example enabled the `app` role without providing `apps` or `appResources`, which the chart requires when `roles` contains `app`. Removed `app` from the role list.
- The kube-agent example used the Kubernetes join method without `teleportClusterName`, which the chart requires for Kubernetes JWKS/OIDC joins. Added `teleportClusterName: teleport.example.com`.
- The session recording comment said "to S3" even though the standalone values did not configure an S3 session recording bucket. Updated the comment to describe session recording generically.

## Review Notes
- The Teleport Kubernetes Operator must be enabled and watching the namespace where the `TeleportGithubConnector` and `TeleportRole` resources are applied.
- The example still uses placeholders such as `teleport.example.com`, GitHub OAuth values, storage class names, and Argo CD repository URLs that must be replaced for a real deployment.
- The Argo CD Application examples use valid Application fields and sync options, but `ignoreDifferences` only affects comparison unless paired with `RespectIgnoreDifferences=true` for sync-time behavior.
