# Validation Summary: How to Use Dapr and Linkerd Together

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Linkerd (service mesh)
- Kubernetes
- Helm
- SMI (Service Mesh Interface) / Gateway API

## Sources Consulted
- Linkerd official documentation — https://linkerd.io/2/getting-started/
- Linkerd edge release installation — https://linkerd.io/releases/
- Linkerd proxy configuration annotations — https://linkerd.io/2/reference/proxy-configuration/
- Linkerd traffic splitting (HTTPRoute) — https://linkerd.io/2/tasks/configuring-dynamic-request-routing/
- Linkerd SMI deprecation notice — https://linkerd.io/2/tasks/linkerd-smi/
- Dapr Kubernetes annotations reference — https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr mTLS configuration — https://docs.dapr.io/operations/security/mtls/
- Dapr Helm installation — https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/

## Issues Found

### 1. Linkerd CLI install URL outdated
**What was wrong:** The post used `https://run.linkerd.io/install` which was for stable releases. Since February 2024, Linkerd no longer provides stable release artifacts publicly; the primary open-source distribution uses edge releases.
**What was changed:** Updated to `https://run.linkerd.io/install-edge` and added a comment clarifying it is the edge release.
**Why:** Readers copying the old URL would either get a stale binary or a failure, depending on Linkerd's redirect behavior.

### 2. TrafficSplit resource deprecated
**What was wrong:** The post used `split.smi-spec.io/v1alpha1 TrafficSplit`, which is deprecated. The `linkerd-smi` extension will be removed in a future Linkerd release.
**What was changed:** Replaced the TrafficSplit example with an HTTPRoute resource (`policy.linkerd.io/v1beta3`) using Gateway API-style `parentRefs` and `backendRefs`, which is the current recommended approach for traffic splitting in Linkerd.
**Why:** Readers following the deprecated approach would be building on a feature that is being removed.

### 3. Port exclusion advice was contradictory
**What was wrong:** The post recommended skipping ports 3500, 50001, 50002, and 9090 from Linkerd's proxy on both inbound and outbound. Port 50002 is Dapr's internal gRPC port used for sidecar-to-sidecar communication across the network. Skipping this port from Linkerd while also disabling Dapr's built-in mTLS would leave sidecar-to-sidecar traffic unencrypted — directly contradicting the post's own advice to let Linkerd handle mTLS.
**What was changed:** Removed port 50002 from the skip lists. Updated the explanation to clarify that only localhost-only ports (app-to-sidecar: 3500, 50001) and the metrics port (9090) should be skipped, while the network-facing port (50002) must remain proxied by Linkerd for mTLS.
**Why:** Leaving network traffic unencrypted is a security issue, and the original advice was internally inconsistent.

### 4. mTLS "conflict" wording was inaccurate
**What was wrong:** The post stated disabling Dapr mTLS was needed "to avoid conflicts." Running both Dapr mTLS and Linkerd mTLS does not cause a conflict or breakage — it is redundant, adding unnecessary CPU overhead for double encryption.
**What was changed:** Changed "to avoid conflicts" to "to avoid redundant double encryption."
**Why:** The word "conflict" implies breakage, which is misleading. The Dapr docs recommend choosing one or the other for efficiency, not because they conflict.

## Review Notes
- The Dapr Helm install command is correct but does not show the prerequisite `helm repo add dapr https://dapr.github.io/helm-charts/` and `helm repo update` steps. This is a minor omission acceptable for brevity.
- The Linkerd control plane install may require Gateway API CRDs to be installed beforehand on newer versions. This is a minor environmental prerequisite not critical to mention.
- The Dapr Configuration CRD approach to disabling mTLS is valid but the Helm flag (`--set global.mtls.enabled=false`) is more commonly documented. Both work.
- The post correctly identifies Dapr's default ports (3500, 50001, 50002, 9090).
