# Validation Summary: How to Install Longhorn in an Air-Gapped Environment

## Status
validated

## Post Type
Guide

## Technologies Covered
- Longhorn
- Kubernetes
- Helm
- Docker
- Private container registries
- Air-gapped deployments

## Sources Consulted
- Longhorn Air Gap Installation docs: https://longhorn.io/docs/1.11.0/deploy/install/airgap/
- Longhorn v1.7.0 image list: https://raw.githubusercontent.com/longhorn/longhorn/v1.7.0/deploy/longhorn-images.txt
- Longhorn v1.7.0 deployment manifest: https://raw.githubusercontent.com/longhorn/longhorn/v1.7.0/deploy/longhorn.yaml
- Longhorn v1.7.0 chart values: https://raw.githubusercontent.com/longhorn/longhorn/v1.7.0/chart/values.yaml
- Longhorn v1.7.0 chart README: https://github.com/longhorn/longhorn/blob/v1.7.0/chart/README.md
- Docker CLI reference for `docker image save`: https://docs.docker.com/reference/cli/docker/image/save/
- Docker CLI reference for `docker image load`: https://docs.docker.com/reference/cli/docker/image/load/
- Kubernetes CLI reference for `kubectl create secret docker-registry`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Helm CLI reference for `helm install`: https://docs.helm.sh/docs/helm/helm_install/

## Issues Found
- The upstream `deploy/longhorn-images.txt` file for Longhorn `v1.7.0` is published as a comma-separated list, not one image per line. The original `while read` loops and `docker save` example would therefore treat the entire file as a single image reference. I changed the download step to normalize the list into newline-delimited entries before the later commands use it.
- The original retagging command stripped the `longhornio/` namespace with `${image#*/}`, but the manifest rewrite in Step 5 rewrites references to `${PRIVATE_REGISTRY}/longhornio/...`. That mismatch would cause image pull failures. I changed the retagging logic to preserve the `longhornio/` path so the pushed tags match the modified manifest.
- The Helm example used values that do not match the Longhorn `v1.7.0` chart schema. The root-level `imagePullSecrets` key is not how the chart wires private-registry auth, and the nested `longhorn.manager.image` structure is not the chart’s image override path. I replaced that block with the chart’s supported `privateRegistry` and `image.longhorn.*` values, and added `helm repo add` / `helm repo update` so the `longhorn/longhorn` chart reference is resolvable.

## Review Notes
- The post is now technically correct for the version it targets: Longhorn `v1.7.0`.
- Longhorn’s current documentation is on a newer release line than `v1.7.0`, so prerequisites and compatibility guidance have changed over time. Readers using newer Longhorn versions should re-check the matching versioned docs before applying the same steps unchanged.
- Validation was performed against official documentation and upstream Longhorn release assets. The local review environment did not have `docker`, `kubectl`, or `helm` installed, so command validation was done by comparing against official CLI references and Longhorn’s published manifests and chart sources rather than by executing the commands locally.
