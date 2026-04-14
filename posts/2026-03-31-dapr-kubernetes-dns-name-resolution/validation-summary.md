# Validation Summary: How to Configure Kubernetes DNS Name Resolution in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes DNS
- Dapr Name Resolution (nameresolution.kubernetes)
- Dapr Service Invocation API
- Dapr Go SDK
- Dapr Access Control Policies
- kubectl CLI

## Sources Consulted
- Dapr Kubernetes DNS Name Resolution component reference: https://docs.dapr.io/reference/components-reference/supported-name-resolution/nr-kubernetes/
- Dapr Configuration overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr Go SDK client documentation: https://docs.dapr.io/developing-applications/sdks/go/go-client/
- Dapr Go SDK on pkg.go.dev: https://pkg.go.dev/github.com/dapr/go-sdk/client
- Dapr Access Control / Invoke Allowlist: https://docs.dapr.io/operations/configuration/invoke-allowlist/
- Dapr Arguments and Annotations Overview: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr GitHub issues #4849 and #4366 for service naming and labeling details

## Issues Found

### 1. Name resolution incorrectly shown as a Component resource
- **What was wrong:** The explicit Kubernetes name resolution configuration was shown as a `kind: Component` resource with `spec.type: nameresolution.kubernetes` and settings under `spec.metadata`. In Dapr, name resolution is configured within a `kind: Configuration` resource under `spec.nameResolution`, not as a standalone Component.
- **What was changed:** Replaced the `kind: Component` YAML with a `kind: Configuration` resource using the correct `spec.nameResolution` structure with `component: "kubernetes"` and `configuration.clusterDomain`.
- **Why:** Applying the original YAML as a Component would not configure name resolution. Dapr expects this in a Configuration resource.

### 2. Access control policy missing trustDomain in policy entry
- **What was wrong:** The access control policy entry for `order-service` was missing the `trustDomain` field. Per Dapr's official documentation, each policy entry should include a `trustDomain` to match the caller's trust domain.
- **What was changed:** Added `trustDomain: "cluster.local"` to the policy entry, consistent with the top-level `trustDomain` value.
- **Why:** Omitting `trustDomain` from individual policy entries may cause unexpected behavior in access control evaluation.

### 3. Incorrect label selector for finding Dapr services
- **What was wrong:** The command `kubectl get svc -l app=order-service` uses the generic `app` label, which is not a label that Dapr applies to the services it creates. Dapr's operator uses the label `dapr.io/app-id`.
- **What was changed:** Updated to `kubectl get svc -l dapr.io/app-id=order-service`.
- **Why:** Using the wrong label would return no results, misleading the reader during troubleshooting.

## Review Notes
- The DNS name format `{app-id}-dapr.{namespace}.svc.cluster.local` is correct and well-documented.
- The Go SDK `InvokeMethod(ctx, appID, methodName, verb)` signature is correct.
- The cross-namespace invocation format `<app-id>.<namespace>` is correct per Dapr documentation.
- The service invocation URL format `http://localhost:3500/v1.0/invoke/{appId}/method/{methodName}` is correct.
- The troubleshooting section with `nslookup` from within the cluster is a good practice recommendation.
