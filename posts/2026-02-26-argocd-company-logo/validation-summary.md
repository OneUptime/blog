# Validation Summary: How to Add Company Logo to ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD UI customization
- Argo CD `argocd-cm` and `ui.cssurl`
- Kubernetes ConfigMaps, Deployments, volumes, and volume mounts
- argo-helm chart values
- CSS overrides for Argo CD UI elements
- kubectl commands

## Sources Consulted
- Argo CD Custom Styles documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/custom-styles/
- Argo CD `argocd-cm` example documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cm-yaml/
- Argo CD upstream UI source for sidebar, login logo, and favicon paths: https://github.com/argoproj/argo-cd
- argo-helm chart README and values reference: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/README.md
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl rollout restart reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/

## Issues Found
- The CSS examples used `.nav-bar__logo` selectors that do not match the current Argo CD UI. Updated them to current sidebar selectors such as `.sidebar__logo__text-logo`, `.sidebar__logo__character`, `.sidebar__logo-container`, and `.sidebar`.
- The mounted-logo CSS used `./custom/logo/logo.svg` from a stylesheet loaded at `./custom/css/custom.css`, which would resolve to the wrong browser path. Updated the examples to use `../logo/logo.svg`.
- The Helm example used deprecated `server.config`. Updated it to `configs.cm`, which is the current argo-helm location for `argocd-cm` data.
- The favicon section described replacing `/shared/app/favicon.ico`, but current Argo CD references `assets/favicon/favicon-32x32.png` and `assets/favicon/favicon-16x16.png`. Updated the ConfigMap and volume mount examples to replace those PNG files.
- The favicon requirements table allowed ICO as the recommended format for Argo CD's current default paths. Updated it to PNG with both 16x16 and 32x32 sizes.
- The "Custom Styles Extension" wording implied a separate Argo CD extension mechanism. Updated the section heading to describe the actual init-container static-file copy approach.

## Review Notes
- `kubectl` was not installed in the local environment, so command syntax was verified against the official Kubernetes kubectl reference instead of local `--help` output.
- The custom CSS selectors depend on Argo CD UI internals and may need to be rechecked after major Argo CD upgrades.
