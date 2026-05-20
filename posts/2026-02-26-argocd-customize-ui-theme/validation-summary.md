# Validation Summary: How to Customize the ArgoCD UI Theme

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes ConfigMaps
- Argo CD Helm chart values
- CSS overlays and UI theming

## Sources Consulted
- Argo CD Custom Styles documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/custom-styles/
- Argo CD UI Customization documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/ui-customization/
- Argo CD `argocd-cm.yaml` example configuration: https://github.com/argoproj/argo-cd/blob/master/docs/operator-manual/argocd-cm.yaml
- Argo CD UI source for layout and theme wrapper classes: https://github.com/argoproj/argo-cd/tree/master/ui/src/app/shared/components/layout
- Argo CD UI source for sidebar classes: https://github.com/argoproj/argo-cd/tree/master/ui/src/app/sidebar
- Argo CD UI source for health and sync status icon rendering: https://github.com/argoproj/argo-cd/blob/master/ui/src/app/applications/components/utils.tsx
- Argo CD Helm chart values: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml

## Issues Found
- The post described Argo CD theme customization as overriding runtime CSS custom properties such as `--argo-color-*`. Current Argo CD UI styles are compiled from SCSS and theme classes, so I changed the guidance to use CSS overlays targeting rendered UI classes.
- Several CSS examples used selectors that do not match the current Argo CD UI, including `.nav-bar`, `.nav-bar__logo`, and status modifier classes. I updated them to use current selectors such as `.sidebar`, `.sidebar__logo`, `.sidebar__nav-item--active`, and the rendered health/sync icon attributes.
- The data URI `ui.cssurl` example was not supported by the official Argo CD documentation, which documents remote CSS URLs and files mounted into the `argocd-server` container. I replaced it with a small mounted CSS file example.
- The ConfigMap-hosted CSS option did not explicitly say the file must be mounted under `/shared/app` and referenced relative to that directory. I added that requirement based on the official custom styles documentation.
- The dark theme example used `body.theme-dark`, but current Argo CD applies `.theme-dark` on a wrapper element, not on `body`. I updated the selectors to `.theme-dark .cd-layout`, `.theme-dark .sidebar`, and `.theme-dark .white-box`.
- The Helm example used `server.config.ui.cssurl`, which is not the current argo-helm values structure. I updated it to use `configs.cm.ui.cssurl` with `server.volumes` and `server.volumeMounts` for the mounted stylesheet.
- The conclusion referred to the "navbar" as the recommended starting point, but the rest of the corrected post targets the Argo CD sidebar. I changed this to "sidebar".

## Review Notes
Custom CSS for Argo CD depends on rendered UI class names and can break across Argo CD releases. The official docs recommend developing and testing overlays with browser developer tools, so future updates should re-check selectors against the Argo CD version in use.
