# Validation Summary: How to Manage Linkerd Service Profiles with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linkerd ServiceProfiles
- Linkerd CLI and Linkerd Viz CLI
- Flux CD v2 Kustomizations
- Kubernetes custom resources
- Kustomize
- OpenAPI/Swagger
- gRPC route matching

## Sources Consulted
- Linkerd Service Profiles reference: https://linkerd.io/2/reference/service-profiles/
- Linkerd Service Profiles feature documentation: https://linkerd.io/2/features/service-profiles/
- Linkerd Setting Up Service Profiles task documentation: https://linkerd.io/2.18/tasks/setting-up-service-profiles/
- Linkerd CLI reference: https://linkerd.io/2.18/reference/cli/
- Linkerd Viz CLI reference: https://linkerd.io/2/reference/cli/viz/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux reconcile kustomization CLI reference: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/

## Issues Found
- ServiceProfiles are no longer the preferred approach for new Linkerd deployments as of Linkerd 2.16. Added a compatibility caveat noting that Gateway API resources supersede ServiceProfiles for per-route metrics, retries, and timeouts in new deployments.
- The introduction described latency "per endpoint"; Linkerd's ServiceProfile feature provides per-route request volume, success rate, and latency metrics. Updated the wording to match Linkerd's documented metrics.
- The OpenAPI generation example omitted the namespace even though the post's ServiceProfiles target the `production` namespace. Added `-n production`.
- The tap-based generation command used `linkerd profile --tap`, but current Linkerd documentation uses `linkerd viz profile --tap` for generating a ServiceProfile from observed traffic. Updated the command and the related best-practice bullet.
- The tap example said it reads routes via reflection. Linkerd's documented tap workflow observes live traffic; it does not use reflection. Updated the comment accordingly.
- The retry-rate validation command did not request wide output, which Linkerd documents as the way to distinguish effective and actual outbound metrics when using `--to`. Added `-o wide`.
- The `linkerd viz stat serviceprofile/...` command used an unsupported `stat` resource type in current Linkerd Viz docs. Replaced it with `linkerd viz routes service/api-service -n production` for route-level monitoring.

## Review Notes
The ServiceProfile manifests use the documented `linkerd.io/v1alpha2` API, route fields, match conditions, retry budget fields, and fully qualified service DNS naming pattern. The Flux Kustomization manifest uses the current `kustomize.toolkit.fluxcd.io/v1` API and valid `dependsOn`, `path`, `prune`, and `sourceRef` fields. YAML snippets were parsed successfully after the edits. Local `linkerd` and `flux` binaries were not installed, so CLI verification was performed against official documentation rather than local `--help` output.
