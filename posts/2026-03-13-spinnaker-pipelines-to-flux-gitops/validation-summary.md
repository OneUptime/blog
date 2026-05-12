# Validation Summary: How to Migrate from Spinnaker Pipelines to Flux GitOps

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Spinnaker (Gate API, deployManifest stage, Manual Judgment stage, Canary Analysis stage)
- Flux CD (Kustomization, HelmRelease, GitRepository, dependsOn ordering, image automation)
- Flagger (Canary resource, metric analysis)
- Kubernetes (Deployments, namespaces, service accounts)
- GitOps workflow patterns (branch protection, PR approvals)
- curl, jq, bash for API export scripting

## Sources Consulted
- Flux CD Kustomization API documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CD Image Automation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux CLI reference (`flux suspend`/`flux resume`): https://fluxcd.io/flux/cmd/flux_suspend_kustomization/
- Spinnaker Gate API reference: https://spinnaker.io/docs/reference/api/
- Spinnaker Kubernetes V2 Provider (deployManifest stage): https://spinnaker.io/docs/reference/providers/kubernetes-v2/
- Flagger Canary CRD documentation: https://docs.flagger.app/usage/how-it-works
- Flagger Canary spec (`flagger.app/v1beta1`): https://docs.flagger.app/usage/deployment-strategies

## Issues Found
No technical issues found.

The post is technically accurate:
- Spinnaker Gate API endpoints (`/applications`, `/applications/{app}/pipelineConfigs`) are correct.
- Spinnaker `deployManifest` stage type with `account`, `cloudProvider`, `manifests`, `namespaceOverride` is valid.
- Flux Kustomization `kustomize.toolkit.fluxcd.io/v1` is the current GA API version.
- The image policy marker comment syntax `# {"$imagepolicy": "flux-system:myapp"}` is the correct format for Flux image automation.
- `dependsOn` field on Kustomization is valid for ordering reconciliation.
- `flux suspend kustomization <name> -n <namespace>` and `flux resume kustomization` are correct CLI commands.
- Flagger Canary `flagger.app/v1beta1` with `targetRef`, `analysis.interval/threshold/maxWeight/stepWeight`, and `metrics[].thresholdRange.min` matches the official spec.

## Review Notes
- The Spinnaker SpEL expression `${ trigger.tag }` in the JSON example is plausible but depends on the trigger type and parameter naming in the user's pipeline; common patterns include `${trigger.tag}`, `${trigger.parameters['tag']}`, or `${trigger.properties['tag']}`. The post is showing it as illustrative, which is appropriate.
- The Step 1 script uses "useless use of cat" (`cat spinnaker-apps.json | jq ...`) — functionally correct, just not idiomatic.
- The Flagger Canary example omits a `service` block (port/targetPort) which is typically required in production; the post is illustrative of the concept rather than a full working manifest, which is acceptable for a migration mapping guide.
- The "Bake (Helm)" → "CI builds chart, HelmRepository" mapping is one valid approach; another option is using Flux's `HelmChart` source with a `GitRepository` containing the chart, but the chosen approach is correct.
