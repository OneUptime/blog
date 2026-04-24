# Validation Summary: How to Set Kubeconfig Expiry in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- kubeconfig
- Portainer HTTP API
- Bash
- JWT

## Sources Consulted
- Portainer Docs: Kubeconfig - https://docs.portainer.io/sts/user/kubernetes/kubeconfig
- Portainer Docs: Settings / Kubernetes settings - https://docs.portainer.io/sts/admin/settings/general
- Portainer Docs: API documentation overview - https://docs.portainer.io/api/docs
- Portainer API spec (CE 2.39.1) - https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer Docs: Accessing the Portainer API - https://docs.portainer.io/2.21/api/access
- Portainer Docs: Users - https://docs.portainer.io/admin/user/users
- Portainer Docs: Manage access to environments - https://docs.portainer.io/2.33-lts/admin/environments/access
- Portainer source: kubeconfig settings UI - https://github.com/portainer/portainer/blob/develop/app/react/portainer/settings/SettingsView/KubeSettingsPanel/KubeConfigSection.tsx
- Portainer source: kubeconfig download handler - https://github.com/portainer/portainer/blob/develop/api/http/handler/kubernetes/config.go
- Portainer source: kubeconfig JWT expiry handling - https://github.com/portainer/portainer/blob/develop/api/jwt/jwt_kubeconfig.go
- Portainer source: authorization checks - https://github.com/portainer/portainer/blob/develop/api/http/security/bouncer.go
- RFC 7519: JSON Web Token (JWT) - https://www.rfc-editor.org/rfc/rfc7519
- RFC 7515: JSON Web Signature (base64url encoding) - https://www.rfc-editor.org/rfc/rfc7515

## Issues Found
- The post described kubeconfig expiry as a per-environment setting. I corrected this to the documented global admin path under **Settings** in the **Kubernetes settings** section.
- The post claimed the feature was specific to Portainer Business Edition. I removed that restriction because the current Portainer docs and public API schema expose `KubeconfigExpiry` in Community Edition as well.
- The post listed unsupported UI values and custom input (`4h`, `8h`, `7d`, `30d`) for the settings screen. I replaced them with the actual dropdown values Portainer exposes in the UI: `24h`, `168h`, `720h`, `8640h`, and `0`.
- The kubeconfig verification example used the wrong API path (`/api/endpoints/{id}/kubernetes/config`). I updated it to the documented `GET /api/kubernetes/config` endpoint, added the `Accept: text/yaml` header, and passed the environment selection using the `ids` query parameter.
- The JWT inspection example decoded the token payload as standard base64. I corrected it to normalize the JWT's base64url payload before decoding.
- The recommendation that API tokens can be "scoped more tightly" than kubeconfig files was not supported by Portainer's API documentation. I changed this to the documented behavior that API tokens are managed separately and can be revoked independently.
- The revocation section implied already-downloaded kubeconfigs may continue working after user deletion or environment-access removal. I corrected this to reflect Portainer's authorization checks on subsequent requests and clarified that continued access only applies while the user account and permissions remain unchanged.
- The best-practice table recommended 8-hour and 1-hour values even though the documented UI flow exposes preset durations only. I adjusted the recommendations to values that match the UI-based workflow described in the post.
- The conclusion referenced audit log behavior that was not substantiated in the documentation I reviewed. I reworded it to a supported statement about periodic re-authentication.

## Review Notes
- Portainer documents that the kubeconfig download button is only shown when Portainer is accessed over HTTPS.
- Portainer documents that changing kubeconfig expiry affects only newly generated kubeconfig files.
- Portainer documents that kubeconfig tokens become invalid when Portainer restarts, regardless of the configured expiry.
- The Portainer UI labels `8640h` as `1 year`, but the underlying value is 360 days. The post retains the UI-facing wording while using the actual stored duration value.
