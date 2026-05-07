# Validation Summary: How to Apply Kubernetes YAML from Podman Desktop

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman Desktop
- Podman
- Kubernetes
- Kubernetes YAML manifests
- kubectl
- Deployments
- Services
- ConfigMaps
- Secrets

## Sources Consulted
- Podman Desktop documentation: Applying a YAML manifest, https://podman-desktop.io/docs/kubernetes/applying-a-yaml-manifest
- Podman Desktop tutorial: Deploying a Kubernetes application, https://podman-desktop.io/tutorial/deploying-a-kubernetes-application
- Podman documentation: podman-kube-generate, https://docs.podman.io/en/v5.8.0/markdown/podman-kube-generate.1.html
- Kubernetes kubectl apply reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl create reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/
- Kubernetes kubectl diff reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_diff/
- Kubernetes kubectl set env reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_env/
- Kubernetes Secrets documentation, https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes API reference, https://kubernetes.io/docs/reference/generated/kubernetes-api/

## Issues Found
- The Podman Desktop Apply YAML workflow described a generic built-in YAML editor, direct paste flow, and target context selection step. The official Apply YAML documentation describes opening the relevant Kubernetes object page, selecting a namespace, clicking Apply YAML, selecting a manifest file, and confirming. Updated the steps to match the documented flow.
- The Podman YAML generation example used `podman generate kube`. Current Podman documentation presents the command as `podman kube generate`, so the example was updated to use the current documented form.

## Review Notes
The Kubernetes manifests and kubectl examples are syntactically consistent with the official Kubernetes references. Local `kubectl` and `podman` binaries were not installed in the review environment, so command verification was performed against official documentation rather than local CLI help.
