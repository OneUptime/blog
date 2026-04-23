# Validation Summary: Rancher with Teleport for Secure Cluster Access

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Rancher
- Teleport
- Kubernetes
- Helm
- `tctl`
- `tsh`
- `kubectl`
- OIDC
- SAML

## Sources Consulted
- Teleport Helm installation docs: https://goteleport.com/docs/installation/helm/
- `teleport-kube-agent` chart reference: https://goteleport.com/docs/reference/helm-reference/teleport-kube-agent/
- Teleport Kubernetes access controls: https://goteleport.com/docs/enroll-resources/kubernetes-access/controls/
- Teleport Kubernetes access management guide: https://goteleport.com/docs/enroll-resources/kubernetes-access/manage-access/
- Teleport role reference: https://goteleport.com/docs/reference/access-controls/roles/
- Teleport `tsh` CLI reference: https://goteleport.com/docs/reference/cli/tsh/
- Teleport `tctl` CLI reference: https://goteleport.com/docs/reference/cli/tctl/
- Teleport session recording reference: https://goteleport.com/docs/reference/architecture/session-recording/
- Teleport configuration reference: https://goteleport.com/docs/reference/deployment/config/
- Teleport server access getting started guide: https://goteleport.com/docs/enroll-resources/server-access/getting-started/
- Rancher Generic OIDC docs: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/configure-generic-oidc
- Rancher Keycloak SAML docs: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/configure-keycloak-saml

## Issues Found
- The architecture diagram showed Teleport Auth directly inline with Kubernetes and SSH traffic. I updated it to reflect Teleport Kubernetes Service and Teleport SSH Service as the data-plane components, with Teleport Auth handling certificates, RBAC, and audit metadata.
- The prerequisites were incomplete for the commands shown. I added `kubectl`, Kubernetes RBAC prerequisites for impersonated users/groups, and the requirement to enroll nodes separately if SSH access is desired.
- The Helm install example did not apply any Teleport labels, but the role later matched `kubernetes_labels.environment`. I added `--set labels.environment=production` so the example role and cluster registration are consistent.
- The Teleport role used `version: v6` while granting access to `deployment` and `secret` resources. Teleport role v6 only supports `pod` in `kubernetes_resources`, so I changed the role to `version: v7`.
- The role mapped `kubernetes_users` from `{{internal.logins}}`, which refers to SSH logins rather than Kubernetes users and was unnecessary for the example. I removed that field so the example falls back to Teleport's documented default behavior.
- The `tsh kubectl` example used non-standard argument placement. I corrected it to the documented `tsh kubectl exec -it my-pod -- /bin/bash` form.
- The SSH section implied the Kubernetes agent alone provides node SSH access. I clarified that node access requires separately enrolled Teleport SSH Service instances on the cluster nodes.
- The session recording storage example used `audit_events_uri`, which stores audit events rather than session recordings. I corrected it to `teleport.storage.audit_sessions_uri` and kept `auth_service.session_recording` for the recording mode.
- The Rancher SSO navigation path was outdated, and the post implied Rancher role names should match Teleport role names. I updated the navigation to `Users & Authentication → Auth Provider` and clarified that the same IdP groups should be mapped independently in Rancher and Teleport.

## Review Notes
- The walkthrough assumes a self-hosted Teleport deployment for `tctl` token management and `teleport.yaml` changes. Teleport Enterprise Cloud handles Auth/Proxy configuration differently.
- The post now uses Teleport role `v7`, which is compatible with the resource kinds shown. If the tutorial is later expanded to cover CRDs or broader Kubernetes object matching, role `v8` may be a better fit for newer Teleport agents.
