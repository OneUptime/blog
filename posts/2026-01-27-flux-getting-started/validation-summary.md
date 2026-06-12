# Validation Summary: How to Get Started with Flux for GitOps

## Status
validated

## Post Type
Tutorial / Getting started guide

## Technologies Covered
- Kubernetes
- Flux CD / GitOps Toolkit
- Flux CLI
- GitRepository, Kustomization, HelmRepository, HelmRelease, Provider, Alert, and Receiver custom resources
- Helm
- Kustomize
- GitHub, GitLab, and generic Git bootstrap flows
- OneUptime Kubernetes Agent

## Sources Consulted
- Flux installation documentation: https://fluxcd.io/flux/installation/
- Flux get started guide: https://fluxcd.io/flux/get-started/
- Flux GitHub bootstrap documentation: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux generic Git server bootstrap documentation: https://fluxcd.io/flux/installation/bootstrap/generic-git-server/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Notification API reference v1: https://fluxcd.io/flux/components/notification/api/v1/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux webhook receiver guide: https://fluxcd.io/flux/guides/webhook-receivers/
- OneUptime Kubernetes Agent documentation: https://oneuptime.com/docs/telemetry/kubernetes-agent

## Issues Found
- The prerequisites snippet described `kubectl version --client` as a Flux compatibility check. Flux compatibility depends on the target cluster version, so the command was changed to `kubectl version`.
- The GitRepository example described `ignore` as a repository path option. `ignore` configures exclude patterns for source artifacts, so the comment was corrected.
- The variable substitution Deployment example was missing required Deployment selector/template labels and a container image. Added matching `spec.selector.matchLabels`, pod template labels, and an example image.
- The HelmRelease `valuesFrom` example said inline values have the lowest priority. Flux merges `valuesFrom` first and inline `.spec.values` overwrite those values, so the comment was corrected.
- Provider and Alert examples used `notification.toolkit.fluxcd.io/v1`, but in the current Flux docs Provider and Alert are `notification.toolkit.fluxcd.io/v1beta3`; only Receiver is `v1`. Updated the Provider and Alert API versions.
- The webhook URL example implied the receiver token is used directly in the URL. Flux generates a unique receiver path, so the instructions now tell readers to inspect the Receiver status and compose the URL from the external address plus generated path.
- The OneUptime HelmRelease example used the wrong chart name and values key, and omitted the HelmRepository source. Updated it to use the `kubernetes-agent` chart from `https://helm-chart.oneuptime.com`, `oneuptime.apiKey`, `clusterName`, and namespace creation.

## Review Notes
The Flux CLI, kubectl, and Helm binaries were not installed in the review environment, so command behavior and schemas were verified against official documentation rather than local CLI help output.
