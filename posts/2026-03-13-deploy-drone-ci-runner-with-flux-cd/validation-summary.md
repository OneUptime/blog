# Validation Summary: How to Deploy Drone CI Runner with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Drone CI
- Drone Kubernetes runner
- Drone Helm charts
- Flux CD HelmRepository, HelmRelease, and Kustomization resources
- Kubernetes Secrets, RBAC, and pods
- Helm

## Sources Consulted
- Drone Kubernetes runner configuration reference: https://docs.drone.io/runner/kubernetes/configuration/reference/
- Drone Kubernetes runner installation documentation: https://docs.drone.io/runner/kubernetes/installation/
- Drone Kubernetes pipeline nodes documentation: https://docs.drone.io/pipeline/kubernetes/syntax/nodes/
- Drone Kubernetes runner resource setting references: https://docs.drone.io/runner/kubernetes/configuration/reference/drone-resource-request-cpu/, https://docs.drone.io/runner/kubernetes/configuration/reference/drone-resource-request-memory/, https://docs.drone.io/runner/kubernetes/configuration/reference/drone-resource-limit-cpu/, https://docs.drone.io/runner/kubernetes/configuration/reference/drone-resource-limit-memory/
- Official Drone Helm charts repository: https://github.com/drone/charts
- Drone chart repository index: https://charts.drone.io/index.yaml
- Drone runner kube chart package 0.1.10: https://charts.drone.io/drone-runner-kube-0.1.10.tgz
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Helm release guide: https://v2-7.docs.fluxcd.io/flux/guides/helmreleases/

## Issues Found
- The post described the Kubernetes runner Helm chart as a current official chart. The official chart repository now marks `drone-runner-kube` as deprecated, so the text now calls it the archived official chart and warns that the runner and chart are deprecated upstream.
- The prerequisites mentioned Drone Cloud. The Kubernetes runner requires a Drone server RPC secret matching the server configuration, so this was corrected to a self-hosted Drone server 1.6.0 or later.
- The HelmRelease used `extraEnvFrom`, but the archived `drone-runner-kube` chart exposes `extraSecretNamesForEnvFrom`. The snippet now uses the correct chart value.
- The HelmRelease used a broad chart semver range. Since the chart is archived and the latest indexed release is 0.1.10, the guide now pins `version: "0.1.10"`.
- Step 4 showed a standalone ConfigMap with `config.yaml`, but the official chart only maps `values.env` into the runner environment and does not mount that ConfigMap. The example now uses the supported `DRONE_RESOURCE_*` environment variables.
- The description claimed workloads run in autoscaling pods, but the guide does not configure autoscaling. This was corrected to ephemeral pods.
- The introduction referred specifically to Docker containers. For Kubernetes pipelines, "container" is the accurate runtime-neutral wording.

## Review Notes
The Flux `HelmRepository`, `HelmRelease`, and `Kustomization` API versions and basic fields are current for Flux v2. The Drone Kubernetes runner remains documented but is marked beta/community in Drone docs and deprecated in the official Helm chart repository, so future updates should consider whether this guide should remain published or be replaced with a supported Drone runner pattern.
