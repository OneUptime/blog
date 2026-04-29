# Validation Summary: How to Use K3s with Kustomize

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- Kustomize
- kubectl
- NGINX container images
- GitOps workflows

## Sources Consulted
- Kubernetes: Declarative Management of Kubernetes Objects Using Kustomize - https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes: Managing Secrets using Kustomize - https://kubernetes.io/docs/tasks/configmap-secret/managing-secret-using-kustomize/
- Kubernetes: kubectl kustomize reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/
- Kubernetes: kubectl command reference (`create namespace`) - https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- K3s: Managing Packaged Components - https://docs.k3s.io/installation/packaged-components
- Kustomize API types reference - https://pkg.go.dev/sigs.k8s.io/kustomize/api/types
- Kustomize project README and kubectl integration matrix - https://github.com/kubernetes-sigs/kustomize
- Docker Hub official NGINX image - https://hub.docker.com/_/nginx
- Docker Hub `nginx:1.25-alpine` digest reference - https://hub.docker.com/layers/library/nginx/1.25-alpine/images/sha256-69fcc4e1cdddc63735fdd0ff4aea1d467120238a2e8d0767c596517664eac19e

## Issues Found
- The prerequisite `kubectl version 1.14+` was too old for the Kustomize features used in the post. I updated it to `kubectl version 1.21+` because older kubectl releases embedded a much older Kustomize version.
- The post used `commonLabels`, which is deprecated in current Kustomize. I replaced those examples with the modern `labels` field and `includeTemplates: true`.
- The development overlay described `namespace` as a namespace prefix. I corrected that wording because `namespace` sets the namespace for namespaced resources.
- The apply section assumed the `development` and `production` namespaces already existed. I added namespace creation commands before the `kubectl apply -k` examples.
- The production image example used an invalid placeholder digest and mixed tag and digest settings. I replaced it with a valid digest pin example.
- The K3s auto-deploy script wrote to a generic `all-resources.yaml` path pattern that can cause AddOn basename collisions. I changed it to a unique manifest filename and added the K3s caveat that removing the file does not delete deployed resources.
- The JSON 6902 patch attempted to append to `/spec/template/spec/containers/0/env/-` even though the base Deployment did not define `env`. I changed the patch to create the `env` list at `/spec/template/spec/containers/0/env`.
- The conclusion overstated K3s auto-deploy as a normal GitOps reconciler. I softened the wording to a GitOps-style workflow so it matches K3s behavior more accurately.

## Review Notes
- The `Component` example is valid, but it uses the alpha `kustomize.config.k8s.io/v1alpha1` API.
- The pinned NGINX digest is version-specific and should be revalidated if the image reference changes.
- `kubectl` was not installed in the local workspace, so CLI validation was done against official Kubernetes command reference pages rather than local `--help` output.
