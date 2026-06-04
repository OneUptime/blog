# Validation Summary: How to Set Up K3s Auto-Deploying Manifests for Disconnected Edge Locations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- K3s
- Kubernetes Deployments and manifests
- Kubernetes image pull policies
- kubectl
- containerd / ctr
- Docker image save and pull workflows
- Shell scripting

## Sources Consulted
- K3s Managing Packaged Components: https://docs.k3s.io/installation/packaged-components
- K3s Import Images: https://docs.k3s.io/add-ons/import-images
- K3s Air-Gap Install: https://docs.k3s.io/installation/airgap
- K3s Embedded Registry Mirror: https://docs.k3s.io/installation/registry-mirror
- K3s Server CLI Reference: https://docs.k3s.io/cli/server
- Kubernetes Images documentation: https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Docker image save reference: https://docs.docker.com/reference/cli/docker/image/save/

## Issues Found
- Clarified that K3s auto-deploy runs from server nodes and applies manifests on startup and when files change. This matches the K3s AddOns documentation and avoids implying that every node watches the directory.
- Clarified that offline manifest deployment still requires referenced container images to be available locally or via an accessible registry/mirror.
- Added `imagePullPolicy: IfNotPresent` to offline examples and changed `alpine:latest` to `alpine:3.20`. Kubernetes defaults `:latest` images to `Always`, which can cause image pulls to fail at disconnected sites even when images were preloaded.
- Changed manual image import to `sudo k3s ctr -n k8s.io images import images.tar`. K3s documentation notes that the `k8s.io` containerd namespace must be used for images managed with `ctr` to be visible to kubelet.
- Changed `docker save` to the documented `docker save -o images.tar ...` form and quoted the image variable in the pull loop.
- Updated the rollback example to manage application manifests in a dedicated `edge-apps` subdirectory and delete existing resources with `kubectl delete -f` before replacing files. K3s documentation states that deleting manifest files from the auto-deploy directory does not delete the corresponding Kubernetes resources.
- Changed manifest validation from client dry-run to server dry-run so validation checks the local API server without persisting resources.

## Review Notes
- The `inotifywait` monitoring example is technically valid but requires the host to have `inotifywait` installed, usually from the `inotify-tools` package.
- The post intentionally uses simple shell parsing of `image:` lines for small manifest bundles. For larger production bundles, a YAML-aware parser would be more robust.
