# Validation Summary: How to Get Started with Linkerd Service Mesh on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linkerd service mesh
- Kubernetes
- Helm
- Linkerd CLI and Viz extension
- Gateway API HTTPRoute
- SMI TrafficSplit
- Linkerd authorization policy CRDs
- Linkerd mTLS certificates

## Sources Consulted
- Linkerd CLI install reference: https://linkerd.io/docs/reference/cli/install/
- Linkerd Helm installation guide: https://linkerd.io/2.19/tasks/install-helm/
- Linkerd mTLS certificate generation guide: https://linkerd.io/docs/tasks/generate-certificates/
- Linkerd Gateway API support: https://linkerd.io/2-edge/features/gateway-api/
- Linkerd retries and timeouts feature guide: https://linkerd.io/2.19/features/retries-and-timeouts/
- Linkerd retries reference: https://linkerd.io/docs/reference/retries/
- Linkerd timeouts reference: https://linkerd.io/docs/reference/timeouts/
- Linkerd service profiles reference: https://linkerd.io/docs/reference/service-profiles/
- Linkerd authorization policy reference: https://linkerd.io/docs/reference/authorization-policy/
- Linkerd TrafficSplit feature guide: https://linkerd.io/2.19/features/traffic-split/
- Linkerd SMI extension guide: https://linkerd.io/docs/tasks/linkerd-smi/
- Linkerd Viz CLI reference: https://linkerd.io/2/reference/cli/viz/
- Linkerd check CLI reference: https://linkerd.io/2/reference/cli/check/
- Linkerd diagnostics CLI reference: https://linkerd.io/2/reference/cli/diagnostics/
- Linkerd automatic proxy injection docs: https://linkerd.io/2.15/features/proxy-injection/

## Issues Found
- The post described Linkerd as having a built-in dashboard. Linkerd provides the dashboard through the Linkerd Viz extension, so the wording was updated to avoid implying it is part of the core control plane.
- The Helm install example passed certificate PEM data with `--set`. Official Helm examples use `--set-file` for the trust anchor, issuer certificate, and issuer key files, which is safer for PEM formatting. Updated the command accordingly.
- The Helm install example omitted the Gateway API prerequisite now required for several current Linkerd features. Added the official Gateway API CRD install command before installing the Linkerd CRDs.
- The TrafficSplit section did not mention that TrafficSplit and the Linkerd SMI extension are deprecated. Added a note in the snippet comment while preserving the existing example.
- The `Server` resource used `policy.linkerd.io/v1beta3`, but current Linkerd documentation uses `policy.linkerd.io/v1beta1`. Updated the API version.
- The retries and timeouts example used `ServiceProfile` as the primary configuration mechanism. Current Linkerd documentation says ServiceProfiles are still supported for backwards compatibility but have been supplanted by Gateway API resources since Linkerd 2.16. Replaced the example with `gateway.networking.k8s.io/v1` `HTTPRoute` resources and current `retry.linkerd.io/*` and `timeout.linkerd.io/*` annotations.

## Review Notes
- The `linkerd viz routes` command is plausible, but route-aware output depends on having route definitions available. New Linkerd deployments should prefer Gateway API resources for route-aware configuration.
- The Helm example uses the Linkerd edge chart repository as in the current Linkerd Helm documentation. Production users should pin chart versions and follow their chosen release channel policy.
