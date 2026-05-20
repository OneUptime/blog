# Validation Summary: How to Add Custom CSS to ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes ConfigMaps and volume mounts
- Argo CD Helm chart
- CSS
- HTML stylesheet loading
- Content Security Policy
- kubectl

## Sources Consulted
- Argo CD Custom Styles documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/custom-styles/
- Argo CD argocd-cm example: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cm-yaml/
- Argo CD argocd-server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-server/
- Argo CD UI source for runtime stylesheet injection: https://github.com/argoproj/argo-cd/blob/master/ui/src/app/app.tsx
- Argo CD Helm chart values: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml
- Kubernetes ConfigMap mounted volume update behavior: https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/
- Kubernetes kubectl create configmap source: https://github.com/kubernetes/kubernetes/blob/master/staging/src/k8s.io/kubectl/pkg/cmd/create/create_configmap.go
- MDN HTML link element reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/link

## Issues Found
- The Helm values example used `server.config.ui.cssurl`, but the current Argo CD Helm chart passes values for `argocd-cm` through `configs.cm`. Changed the example to use `configs.cm.ui.cssurl` while keeping `server.volumes` and `server.volumeMounts`.
- The external URL section said cross-origin CSS hosting requires CORS headers. Argo CD injects a normal `<link rel="stylesheet">` without `crossorigin`; basic stylesheet loading does not require `Access-Control-Allow-Origin`. Replaced that with accurate `Content-Type` and cache header guidance.
- The data URI section did not mention CSP/browser constraints. Added a short caveat that `data:` stylesheet URLs must be allowed by the browser and Content Security Policy.
- The ConfigMap update section said the mounted CSS updates within a minute. Kubernetes documents that updates are eventual and can take as long as the kubelet sync period plus cache propagation delay, and subPath mounts do not receive updates. Changed the wording to avoid an inaccurate fixed timing claim.
- The CSP note implied only that Argo CD includes CSP headers. Updated it to reflect that `argocd-server` sets a default CSP header and custom policies must allow the custom CSS source.

## Review Notes
- CSS selectors in the examples are version-sensitive because Argo CD UI class names can change between releases. Users should continue to verify selectors with browser developer tools as the post recommends.
- `kubectl` was not installed in the local environment, so command syntax was verified against Kubernetes source/documentation rather than local `kubectl --help`.
