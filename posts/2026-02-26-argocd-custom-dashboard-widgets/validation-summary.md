# Validation Summary: How to Build Custom ArgoCD Dashboard Widgets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD UI extensions
- Argo CD proxy extensions
- Argo CD REST API
- React and TypeScript
- Python Flask
- Kubecost / OpenCost allocation APIs
- Kubernetes ConfigMaps and kubectl

## Sources Consulted
- Argo CD UI Extensions documentation: https://argo-cd.readthedocs.io/en/stable/developer-guide/extensions/ui-extensions/
- Argo CD Proxy Extensions documentation: https://argo-cd.readthedocs.io/en/stable/developer-guide/extensions/proxy-extensions/
- Argo CD API Docs: https://argo-cd.readthedocs.io/en/stable/developer-guide/api-docs/
- Kubecost Allocation API documentation: https://www.ibm.com/docs/en/kubecost/self-hosted/2.x?topic=apis-allocation-api
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/

## Issues Found
- The proxy extension URLs incorrectly used `/api/extensions/<name>`. Updated the React examples and curl command to use Argo CD's documented `/extensions/<name>` path.
- Proxy extension requests were missing the mandatory `Argocd-Application-Name` and `Argocd-Project-Name` headers. Added those headers to the frontend fetch examples and curl test command.
- The backend example attempted to read an `X-ArgoCD-Token` header that Argo CD proxy extensions do not provide. Updated it to read an `ARGOCD_TOKEN` environment variable and call the Argo CD API with a bearer token.
- The application tab registration used a non-documented `window.extensions.applications` object. Updated it to use `window.extensionsAPI.registerResourceExtension` with the documented `argoproj.io` / `Application` group and kind.
- The proxy extension ConfigMap did not enable the proxy extension feature flag. Added the required `argocd-cmd-params-cm` setting `server.enable.proxy.extension: 'true'`.
- The Kubecost query used an unsupported `namespace` query parameter for the shown response shape. Updated it to aggregate by namespace with `aggregate=namespace&accumulate=true`.
- The local copy command targeted a Deployment with `kubectl cp`, which expects a pod file spec. Updated the command to resolve an `argocd-server` pod name first.
- Removed an unused `statusIcons` constant from the compliance widget to avoid TypeScript `noUnusedLocals` failures in stricter projects.

## Review Notes
The examples are still intentionally illustrative. A production deployment should mount UI extension bundles into all `argocd-server` pods through the Argo CD deployment or Helm values rather than copying a file into one running pod for local testing.
