# Validation Summary: How to Configure the ArgoCD Login Page

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes ConfigMaps
- Kubernetes Deployments
- kubectl
- CSS
- SSO / OIDC / Dex

## Sources Consulted
- Argo CD Custom Styles documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/custom-styles/
- Argo CD User Management documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/
- Argo CD upstream login component source: https://github.com/argoproj/argo-cd/blob/master/ui/src/app/login/components/login.tsx
- Argo CD upstream login stylesheet source: https://github.com/argoproj/argo-cd/blob/master/ui/src/app/login/components/login.scss
- Argo CD upstream settings source for local-login visibility: https://github.com/argoproj/argo-cd/blob/master/server/settings/settings.go
- Kubernetes kubectl create configmap reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_configmap/
- Kubernetes kubectl command reference for patch and rollout restart: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The post described the login page footer as an Argo CD version number. Current upstream Argo CD login UI shows an Argo project logo footer, with version information available elsewhere in the UI. I updated the default element list, diagram, and footer-hiding comment.
- The description claimed SSO button label customization, but the examples only style the button. Current Argo CD renders the SSO label from the configured OIDC or Dex connector name, or falls back to "SSO Login". I changed the wording to SSO button styling and provider-name-based labels.
- The CSS example used `.login__sso-button`, which is not present in the current Argo CD login component. I changed it to `.login__box_saml`, the upstream class used for the SSO login area.
- The local CSS application commands created a ConfigMap and set `ui.cssurl`, but did not mount the CSS into the `argocd-server` container. Official Argo CD documentation requires relative CSS files to be mounted under `/shared/app`, for example `/shared/app/custom/custom.css`. I added the required deployment patch and clarified the mount path near the first `ui.cssurl` example.
- The security note implied `admin.enabled: "false"` disables all local accounts. Official Argo CD user management documents this as disabling the built-in `admin` account. I clarified that SSO-only deployments should disable admin and avoid `login` capability on other local accounts, adding an `apiKey`-only automation account example.

## Review Notes
CSS customizations depend on Argo CD's internal UI class names, which are not a stable public API. The examples match the current upstream source reviewed on 2026-05-20, but should be rechecked when upgrading Argo CD.
