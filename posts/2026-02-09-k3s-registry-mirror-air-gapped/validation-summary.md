# Validation Summary: Configure K3s with Embedded Registry Mirror for Air-Gapped Edge Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- K3s
- Kubernetes Deployments, Services, and CronJobs
- containerd / ctr
- Docker image pull, tag, push, and save workflows
- CNCF Distribution registry
- Skopeo
- Air-gapped container image distribution

## Sources Consulted
- K3s Embedded Registry Mirror documentation: https://docs.k3s.io/installation/registry-mirror
- K3s Private Registry Configuration documentation: https://docs.k3s.io/installation/private-registry
- K3s Import Images documentation: https://docs.k3s.io/add-ons/import-images
- K3s Air-Gap Install documentation: https://docs.k3s.io/installation/airgap
- Kubernetes Images and imagePullPolicy documentation: https://kubernetes.io/docs/concepts/containers/images/
- CNCF Distribution registry configuration documentation: https://distribution.github.io/distribution/about/configuration/
- CNCF Distribution garbage collection documentation: https://distribution.github.io/distribution/about/garbage-collection/
- Skopeo project documentation: https://github.com/containers/skopeo
- Skopeo copy manual reference: https://www.mankier.com/1/skopeo-copy

## Issues Found
- The post described K3s embedded registry mirrors as local pushable caches. K3s documentation describes the embedded registry mirror as a read-only, peer-to-peer distributed mirror that must be enabled separately. Updated the introduction and install command to distinguish private registry mirrors from the embedded distributed registry mirror, and added `--embedded-registry`.
- The K3s install command claimed all pulls would use local mirrors, but containerd falls back to default registry endpoints unless disabled. Added `--disable-default-registry-endpoint` and clarified that it applies to registries listed in `registries.yaml`.
- The registry endpoint used `registry.local`, but the original text did not state that this name must resolve from the node OS where containerd runs. Added a note that cluster DNS names are not available to host containerd.
- The local registry Deployment exposed a ClusterIP Service only, which would not make `registry.local:5000` reachable from host containerd by itself. Added `hostNetwork: true` and `ClusterFirstWithHostNet` so a node-level registry endpoint can work when `registry.local` points to that node or a load balancer.
- The pre-load script pushed Docker Hub official images under paths like `registry.local:5000/nginx:alpine`, while K3s/containerd mirror pulls for `nginx:alpine` resolve to `docker.io/library/nginx:alpine`. Updated image references and tags to use `library/...`.
- The image import command used `ctr` without the `k8s.io` namespace. K3s documentation requires the `k8s.io` namespace for images to be visible to kubelet. Updated the command to `sudo k3s ctr -n k8s.io image import images-bundle.tar`.
- The automated sync CronJob used `docker:dind` with Docker commands but did not start or privilege a Docker daemon. Replaced it with daemonless `skopeo copy` commands.
- The metrics Service exposed port 5001, but the registry Deployment did not enable the registry debug/Prometheus listener. Added the required registry debug and Prometheus environment variables and exposed container port 5001.
- The garbage collection section omitted the documented requirement to stop writes or run the registry read-only during garbage collection. Added a note before the command.

## Review Notes
The tutorial is now technically aligned with current K3s registry mirror behavior and CNCF Distribution registry configuration. For production, the registry authentication example should use TLS because htpasswd basic authentication sends credentials in HTTP headers.
