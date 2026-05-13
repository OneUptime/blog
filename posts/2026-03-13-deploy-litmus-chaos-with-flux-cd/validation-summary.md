# Validation Summary: How to Deploy Litmus Chaos with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Helm and HelmRelease
- Kustomize and Flux Kustomization
- LitmusChaos / ChaosCenter
- LitmusChaos ChaosExperiment, ChaosEngine, and ChaosResult CRDs
- Kubernetes RBAC

## Sources Consulted
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux installation prerequisites: https://fluxcd.io/flux/installation/
- LitmusChaos CNCF project page: https://www.cncf.io/projects/litmus/
- LitmusChaos Helm installation documentation: https://litmuschaos.website.cncfstack.com/docs/3.11.0/user-guides/chaoscenter-advanced-installation/
- Litmus Helm chart repository and values: https://github.com/litmuschaos/litmus-helm
- LitmusChaos pod-delete experiment documentation: https://litmuschaos.github.io/litmus/experiments/categories/pods/pod-delete/
- LitmusChaos ChaosExperiment configuration specification: https://litmuschaos.github.io/litmus/experiments/concepts/chaos-resources/chaos-experiment/configuration-specification/

## Issues Found
- Corrected the project maturity claim from CNCF-graduated to CNCF-incubating. The CNCF project page lists Litmus as incubating, not graduated.
- Updated the Kubernetes prerequisite from a fixed Kubernetes 1.24+ statement to requiring a cluster supported by the installed Flux version, because current Flux support depends on the Flux release line.
- Replaced the Litmus Helm `adminConfig.DBUSER` and `adminConfig.DBPASSWORD` example with `ADMIN_USERNAME` and `ADMIN_PASSWORD`. The chart values use `DBUSER` and `DBPASSWORD` for database connectivity, not initial portal login credentials.
- Fixed the Flux/Kustomize example. The original `clusters/my-cluster/litmus/kustomization.yaml` used a Flux `Kustomization` CR where Kustomize expects a `kustomize.config.k8s.io` file, which would break the path build. The Flux `Kustomization` was moved to a separate manifest outside that directory.
- Changed the health check from a guessed `litmus-frontend` Deployment to the `HelmRelease` object, matching Flux guidance for Kustomizations that contain HelmRelease resources.
- Expanded the `pod-delete` ChaosExperiment permissions, command args, image pull policy, and common environment values to match Litmus documentation.
- Added the required `pod-delete` ServiceAccount, Role, and RoleBinding in the application namespace and updated the `ChaosEngine` to use that service account instead of assuming `litmus-admin`.
- Added the experiment manifests to the Kustomize resource list so Flux will actually apply them after they are created.
- Updated the commit command to include the out-of-directory `litmus-kustomization.yaml` file.
- Adjusted the best-practices note about `dependsOn` so it applies only when Litmus installation and experiment manifests are split into separate Flux Kustomizations.

## Review Notes
The local environment did not have `helm`, `kubectl`, or `flux` installed, so CLI behavior was checked against official documentation rather than local `--help` output. The Helm chart version selector `3.x.x` is a broad semver wildcard; pinning an exact chart version is preferable for production GitOps repositories.
