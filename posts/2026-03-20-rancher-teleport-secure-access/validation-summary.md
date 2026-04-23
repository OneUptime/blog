# Validation Summary: How to Configure Rancher with Teleport for Secure Access

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Teleport
- Kubernetes RBAC
- Helm
- OpenID Connect (OIDC)
- Microsoft Entra ID
- `tsh`
- `tctl`

## Sources Consulted
- Teleport `teleport-cluster` Helm chart reference: https://goteleport.com/docs/reference/helm-reference/teleport-cluster/
- Teleport `teleport-kube-agent` Helm chart reference: https://goteleport.com/docs/reference/helm-reference/teleport-kube-agent/
- Teleport role resource reference: https://goteleport.com/docs/reference/infrastructure-as-code/teleport-resources/role/
- Teleport roles reference: https://goteleport.com/docs/reference/access-controls/roles/
- Teleport session recording reference: https://goteleport.com/docs/reference/architecture/session-recording/
- Teleport audit events and records reference: https://goteleport.com/docs/reference/deployment/monitoring/audit/
- Teleport audit event/access monitoring reference: https://goteleport.com/docs/reference/access-controls/access-monitoring-events/
- Teleport `tctl` CLI reference: https://goteleport.com/docs/reference/cli/tctl/
- Teleport `tsh` CLI reference: https://goteleport.com/docs/reference/cli/tsh/
- Teleport OIDC guide: https://goteleport.com/docs/zero-trust-access/sso/integrate-idp/oidc/
- Teleport Microsoft Entra ID OIDC guide: https://goteleport.com/docs/zero-trust-access/sso/integrate-idp/entra-id-oidc/
- Kubernetes RBAC reference: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes `kubectl create role` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_role/

## Issues Found
- The `teleport-cluster` Helm values used raw `auth_service` and `proxy_service` config blocks instead of the chart's documented top-level values such as `clusterName`, `publicAddr`, `kubePublicAddr`, `authentication`, and `sessionRecording`. I replaced the snippet with the current chart schema and added `helm repo update`.
- The `teleport-kube-agent` example omitted the required `kubeClusterName` value for `roles: kube`. I added `kubeClusterName` and changed the token example to `tctl tokens add --type=kube --ttl=1h --format=text`.
- The Teleport role examples used `version: v6` even though the guide relied on fine-grained `kubernetes_resources` behavior that is better represented with `version: v7`. I updated both roles to `v7`.
- The admin role used `record_session: true`, which is not the correct role option shape. I removed it and kept session recording configuration in the dedicated session-recording section.
- The Kubernetes RBAC example was incomplete and invalid because the `RoleBinding` lacked `roleRef.apiGroup`, the `Group` subject lacked `apiGroup`, and the referenced `exec-pods` role was never defined. I added a valid `ClusterRole` for `pods/exec` and completed the binding fields.
- The session-recording section incorrectly used `enhanced_recording` under `auth_service`, which is for Teleport's SSH enhanced session recording rather than Kubernetes session recording. I replaced it with the supported Helm chart `sessionRecording` value.
- The access workflow contradicted the RBAC examples by showing a developer logging into a production cluster and using a namespace that was not granted exec access. I updated the example to a staging cluster and the `development` namespace so it matches the role and RBAC examples.
- The OIDC example was not a valid Teleport auth connector resource. I rewrote it as a proper `kind: oidc`, `version: v3` resource, updated the display name to current Microsoft Entra ID terminology, removed the unsupported `groups` scope, and changed group mappings to Entra group object ID placeholders.
- The `tctl events search` and `tctl events export` commands are not current `tctl` commands. I replaced them with supported `tctl audit query exec`, `tctl recordings ls`, and `tctl recordings download` examples.

## Review Notes
- The post still states `Teleport v14+`, but the corrected snippets were validated against current Teleport documentation in the 18.x docs stream. Readers on older Teleport releases should confirm chart/value compatibility before applying the examples unchanged.
- Using the same OIDC/SAML provider as Rancher requires Teleport Enterprise; Teleport open source supports GitHub and local auth, not OIDC/SAML connectors.
- For Microsoft Entra ID, Teleport role mappings should use the Entra group's object ID, and the Entra application must be configured to emit the `groups` claim.
