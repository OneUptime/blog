# Validation Summary: How to Create OpenTelemetry Resource Detectors

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry JavaScript SDK (`@opentelemetry/sdk-node`)
- `@opentelemetry/resources` (`Resource`, `Detector` interface, built-in `envDetector`, `processDetector`, `hostDetector`)
- `@opentelemetry/resource-detector-aws` (EC2, ECS, EKS, Lambda detectors)
- `@opentelemetry/resource-detector-gcp` (`gcpDetector`)
- `@opentelemetry/resource-detector-azure` (VM, App Service, Functions detectors)
- `@opentelemetry/semantic-conventions` (`SemanticResourceAttributes`)
- OTLP HTTP exporters for traces and metrics
- Kubernetes Downward API
- TypeScript / Node.js (`fetch`, `AbortSignal.timeout`)
- Vitest (for unit testing example)

## Sources Consulted
- OpenTelemetry JS NodeSDK source (`NodeSDKConfiguration` interface): https://github.com/open-telemetry/opentelemetry-js/blob/main/experimental/packages/opentelemetry-sdk-node/src/types.ts
- OpenTelemetry JS `@opentelemetry/resources` package (Detector interface, built-in detector exports): https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-resources
- OpenTelemetry JS Contrib AWS/GCP/Azure resource detector exports: https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/detectors/node
- OpenTelemetry Semantic Conventions for cloud, host, k8s, service, and VCS attributes: https://opentelemetry.io/docs/specs/semconv/
- Kubernetes Downward API documentation: https://kubernetes.io/docs/concepts/workloads/pods/downward-api/

## Issues Found

1. **Incorrect `NodeSDK` resource detection timeout API (Section 6, "Detection Timeout").**
   The original snippet showed a `resourceDetectionOptions: { detectors, timeout }` field on `NodeSDK` and an unused `detectResourcesSync` import:
   ```typescript
   resourceDetectionOptions: {
     detectors: [awsEc2Detector, customSlowDetector],
     timeout: 5000,
   }
   ```
   Verified against `NodeSDKConfiguration` in the upstream `@opentelemetry/sdk-node` source — there is no `resourceDetectionOptions` option and no built-in detection timeout at the SDK level. The supported pattern is per-detector timeouts using `AbortSignal.timeout()`/`AbortController`. Rewrote the example to show a detector that uses `AbortSignal.timeout(5000)` internally and falls back to `Resource.empty()` on timeout, which matches the same pattern used elsewhere in the post (Sections 5 and 9).

## Review Notes

- The post targets the OpenTelemetry JS 1.x / `@opentelemetry/resources` 1.x API: the async `Detector` interface returning `Promise<Resource>`, the `Resource` class with `new Resource(attributes)` and `Resource.empty()`, and `SemanticResourceAttributes` from `@opentelemetry/semantic-conventions`. This API is still supported in widely-deployed versions but has been superseded in `@opentelemetry/resources` 2.x by a synchronous `ResourceDetector` interface returning `DetectedResource`, factory functions (`resourceFromAttributes()`, `emptyResource()`, `defaultResource()`), and the `ATTR_*` constants from `@opentelemetry/semantic-conventions` / `/incubating`. Readers on 2.x will need to translate the patterns; the conceptual content (merging, prioritization, graceful degradation, semantic conventions, K8s Downward API) carries over unchanged.
- All listed detector exports (`awsEc2Detector`, `awsEcsDetector`, `awsEksDetector`, `awsLambdaDetector`, `gcpDetector`, `azureVmDetector`, `azureAppServiceDetector`, `azureFunctionsDetector`, `envDetector`, `processDetector`, `hostDetector`) were verified as correct.
- `cloud.platform` values shown (`aws_ec2`, `gcp_compute_engine`, `azure_vm`) match the OpenTelemetry semantic conventions registry.
- The VCS attribute names used by the custom Git detector (`vcs.repository.url`, `vcs.commit.id`, `vcs.branch`) are informal naming used by the example. The current OpenTelemetry VCS semantic conventions use more granular names (e.g. `vcs.repository.url.full`, `vcs.repository.ref.revision`, `vcs.repository.ref.name`). Since the post presents this as a custom detector example rather than as canonical convention usage, this is fine as-is, though future readers may want to align with the published VCS conventions.
- `AbortSignal.timeout()` requires Node.js 17.3+ and is the recommended approach in the post — fine for any modern Node target.
