# Validation Summary: How to Create UI Extensions for ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD UI extensions
- Argo CD proxy extensions
- React
- TypeScript
- webpack
- Kubernetes Deployments and ConfigMaps
- kubectl

## Sources Consulted
- Argo CD UI Extensions documentation: https://argo-cd.readthedocs.io/en/release-3.4/developer-guide/extensions/ui-extensions/
- Argo CD Proxy Extensions documentation: https://argo-cd.readthedocs.io/en/stable/developer-guide/extensions/proxy-extensions/
- webpack externals documentation: https://webpack.js.org/configuration/externals/
- TypeScript JSX documentation: https://www.typescriptlang.org/docs/handbook/jsx
- Kubernetes kubectl create configmap reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_configmap/

## Issues Found
- The post said UI extension bundles are served from a configurable URL. Argo CD documentation states UI extension JavaScript files must be delivered inside `argocd-server` pods under `/tmp/extensions` with file names matching the `extension*.js` pattern. Updated the explanation, diagram, deployment instructions, and conclusion.
- The resource and application examples registered extensions by assigning components to `window.extensions`. Current Argo CD UI extensions register through `window.extensionsAPI`, using `registerResourceExtension`. Updated both examples.
- The application tab example treated application tabs as a separate `window.extensions.applications` registry. Argo CD documents application tabs as resource tab extensions for group `argoproj.io` and kind `Application`. Updated the example and explanation.
- The metrics fetch URL used `/api/extensions/...`, which is not the proxy extension endpoint documented by Argo CD. Updated it to `/extensions/pod-metrics/...` and added the required Argo CD proxy headers for application and project authorization.
- The deployment example served the UI bundle from an Nginx service and used `extension.config` as though it loaded the UI bundle. Updated the post to mount the bundle into `argocd-server` and clarified that `extension.config` configures a proxy backend, not the UI bundle.
- The TypeScript example used TSX but did not include a `tsconfig.json` with a JSX compiler option. Added a minimal TypeScript configuration for JSX.
- The ConfigMap name in the deployment flow needed to match the mounted ConfigMap name. Updated the command and mount to use `pod-metrics-extension`.

## Review Notes
The post is now technically aligned with current Argo CD UI extension and proxy extension documentation. `kubectl` was not installed in the local environment, so the `kubectl create configmap` command was verified against the official Kubernetes command reference rather than local `--help` output.
