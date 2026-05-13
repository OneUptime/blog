# Validation Summary: How to Configure Kustomize Controller Concurrency Workers in Flux

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Flux
- Flux kustomize-controller
- Kubernetes Deployments
- Kustomize patches
- Prometheus metrics
- kubectl

## Sources Consulted
- Flux kustomize-controller options: https://fluxcd.io/flux/components/kustomize/options/
- Flux bootstrap customization guide: https://fluxcd.io/flux/installation/configuration/bootstrap-customization/
- Flux vertical scaling guide: https://fluxcd.io/flux/installation/configuration/vertical-scaling/
- Flux kustomize-controller documentation: https://fluxcd.io/flux/components/kustomize/
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux installation manifest: https://github.com/fluxcd/flux2/releases/latest/download/install.yaml
- fluxcd/kustomize-controller Dockerfile: https://raw.githubusercontent.com/fluxcd/kustomize-controller/main/Dockerfile

## Issues Found
- The post said the default configuration was a "single-worker" bottleneck and described processing as sequential, but Flux documents `--concurrent` as defaulting to 4. Updated the wording to describe the default worker configuration and queued processing instead.
- The Deployment patch replaced the entire controller `args` list. This can drop current or future install-generated arguments and is not the approach shown in the Flux bootstrap and vertical scaling docs. Replaced it with a JSON6902 patch that appends `--concurrent=20`.
- The monitoring command used `kubectl exec` with `curl` inside the kustomize-controller container. The current controller image is Alpine-based and does not install `curl`; Flux documents metrics on port 8080 at `/metrics`. Updated the example to use `kubectl port-forward` and run `curl` locally.

## Review Notes
The `--concurrent=20` value is technically valid, but the optimal value is workload-dependent. Flux's vertical scaling guide also notes that higher kustomize-controller concurrency can run into node disk I/O contention unless `/tmp` is backed by memory.
