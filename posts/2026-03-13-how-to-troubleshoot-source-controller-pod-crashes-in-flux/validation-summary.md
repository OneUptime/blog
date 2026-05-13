# Validation Summary: How to Troubleshoot Source Controller Pod Crashes in Flux

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux
- Flux source-controller
- Kubernetes
- kubectl
- Kustomize patches
- Prometheus metrics

## Sources Consulted
- Flux Source Controllers documentation: https://fluxcd.io/flux/components/source/
- Flux Source Controller options: https://fluxcd.io/flux/components/source/options/
- Flux installation documentation and generated install manifest: https://fluxcd.io/flux/installation/
- Flux bootstrap persistent storage guidance: https://v2-0.docs.fluxcd.io/flux/cheatsheets/bootstrap/
- Flux troubleshooting cheatsheet: https://fluxcd.io/flux/cheatsheets/troubleshooting/
- Flux GitRepository documentation for custom CA handling: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux HelmRepository documentation for `certSecretRef`: https://fluxcd.io/flux/components/source/helmrepositories/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/

## Issues Found
- The direct JSON patch used `replace` on `/resources/limits/memory`, but Flux's generated source-controller Deployment may not define that path. Changed it to a strategic merge patch keyed by the `manager` container name so it can add or update requests and limits.
- The storage section stated that source-controller stores artifacts on a persistent volume and described a PVC named `source-controller`. Flux defaults the artifact cache to an `emptyDir` mounted at `/data`, and persistent storage is optional. Updated the wording and commands to check PVCs only when configured and to inspect pod mount events.
- The TLS section implied custom CA mounting problems commonly crash the controller during startup. Flux custom CA configuration is normally set on source resources such as `GitRepository`, `HelmRepository`, `OCIRepository`, or `Bucket`, and TLS errors usually appear as reconciliation failures. Updated the wording accordingly.
- The events command filtered on `involvedObject.name=source-controller`, which misses pod events whose names include the generated pod suffix. Replaced it with a sorted namespace event listing filtered by `grep source-controller`.
- The summary listed TLS misconfiguration as a typical pod crash cause. Updated it to refer to startup configuration problems instead.

## Review Notes
The post is technically relevant and the remaining commands use current Kubernetes and Flux conventions. The `kubectl` binary was not installed in the local environment, so CLI flags were verified against official Kubernetes documentation rather than local `--help` output.
