# Validation Summary: How to Manage Linkerd Service Profiles with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linkerd ServiceProfiles
- Linkerd CLI and Viz extension
- Argo CD Applications, sync waves, hooks, and custom health checks
- Kubernetes Jobs and custom resources
- Helm charts
- Kustomize overlays
- Prometheus / PromQL

## Sources Consulted
- Linkerd ServiceProfile reference: https://linkerd.io/2.19/reference/service-profiles/
- Linkerd setting up ServiceProfiles guide: https://linkerd.io/2.18/tasks/setting-up-service-profiles/
- Linkerd Helm installation guide: https://linkerd.io/2-edge/tasks/install-helm/
- Linkerd releases and versions: https://linkerd.io/releases/
- Linkerd Helm edge chart index: https://helm.linkerd.io/edge/index.yaml
- Linkerd Viz CLI reference: https://linkerd.io/2/reference/cli/viz/
- Linkerd proxy metrics reference: https://linkerd.io/2.19/reference/proxy-metrics/
- Argo CD resource health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD sync phases and waves documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/

## Issues Found
- The post described ServiceProfiles as Linkerd's primary route-policy resource. Updated the introduction and summary to reflect current Linkerd guidance: since Linkerd 2.16, Gateway API route resources are preferred, while ServiceProfiles remain supported for backward compatibility.
- The Linkerd Helm chart versions were pinned to an old edge chart version. Updated the Argo CD `targetRevision` examples to the current official edge chart version available in the Linkerd Helm index on 2026-05-20.
- The live-traffic generation example used `linkerd profile --tap`, but tap-based profile generation is provided by `linkerd viz profile`. Updated the command and clarified that the Linkerd Viz extension must be available.
- The Argo CD hook example wrote generated output to an ephemeral container filesystem, which Argo CD would not apply as part of the same sync. Updated the text and example to pipe generated output to `kubectl apply -f -`, using a placeholder custom image that includes both Linkerd and kubectl.
- The Kustomize staging example was labeled as a patch while changing the resource name and namespace, which would not work as a simple strategic merge patch against the shown base resource. Updated it to be an overlay ServiceProfile file instead.
- The metrics command used `linkerd stat sp/...`, which is not the documented command for per-route metrics. Updated it to `linkerd viz routes svc/product-service -n production`.
- The PromQL examples used base `response_*` metrics with `rt_route`. Updated them to use Linkerd's documented route-level metrics: `route_response_total` and `route_response_latency_ms_bucket`.

## Review Notes
ServiceProfiles are technically still valid, but new Linkerd configurations should generally prefer Gateway API HTTPRoute/GRPCRoute resources for route-level metrics, retries, and timeouts. The hook example also assumes appropriate RBAC for applying ServiceProfiles from the Job.
