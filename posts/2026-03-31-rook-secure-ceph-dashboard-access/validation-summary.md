# Validation Summary: How to Secure Ceph Dashboard Access in Rook

## Status
validated

## Post Type
Tutorial / Security Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph Dashboard
- Kubernetes (Ingress, Secrets, TLS)
- NGINX Ingress Controller
- SAML2 SSO (Keycloak/Dex)

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Ceph Dashboard documentation: https://docs.ceph.com/en/latest/mgr/dashboard/
- Ceph Dashboard user management commands: https://docs.ceph.com/en/latest/mgr/dashboard/#user-and-role-management
- Ceph Dashboard SSO documentation: https://docs.ceph.com/en/latest/mgr/dashboard/#enabling-single-sign-on-sso
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- NGINX Ingress Controller annotations: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/

## Issues Found

1. **`ac-user-create` command had incorrect argument order and a non-existent flag** — The original command `ceph dashboard ac-user-create ops-user read-only --password-policy-check-strength` treated `read-only` as the password (second positional argument), not the role. The flag `--password-policy-check-strength` does not exist in the Ceph CLI. A separate `ac-user-set-roles` command was also redundant if the role is passed correctly at creation time. Fixed by providing a generated password as the second argument and `read-only` as the third (role) argument, and removed the redundant set-roles command.

2. **SSO section title said "OIDC" but command used SAML2** — The section was titled "Enabling SSO with OIDC" and the description mentioned "OIDC provider," but the actual command used `ceph dashboard sso setup saml2`, which configures SAML2, not OIDC. These are different protocols. Fixed the title, description, and summary to consistently say SAML2.

3. **`ac-user-set-password` used `--force-password` as a value flag** — The original command `--force-password "$(openssl rand ...)"` treated `--force-password` as if it accepts a value argument. In reality, `--force-password` is a boolean flag that bypasses password policy checks, and the new password is a positional argument. Fixed to `ceph dashboard ac-user-set-password admin "$NEW_PASSWORD" --force-password`.

4. **Password rotation generated two different passwords** — The original post called `openssl rand -base64 32` twice in separate commands: once to set the dashboard password and once to store it in a Kubernetes secret. These would produce different random values, so the stored secret would not match the actual password. Fixed by generating the password once into a shell variable and reusing it for both commands.

## Review Notes
- The CephCluster YAML for enabling TLS (`dashboard.ssl: true`, `dashboard.port: 8443`) is correct per Rook's CRD spec.
- The Ingress manifest uses correct NGINX Ingress annotations and the proper Rook dashboard service name (`rook-ceph-mgr-dashboard`).
- The manual `ceph dashboard set-ssl-certificate` commands are valid but may be unnecessary when Rook manages TLS via the CephCluster CR — in practice, Rook handles certificate injection. The post presents both approaches, which is acceptable.
- Ceph also supports OIDC via `ceph dashboard sso setup oauth2` if OIDC is desired in the future; the post now correctly describes the SAML2 path it actually demonstrates.
