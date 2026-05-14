# Validation Summary: How to Deploy Linkerd with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linkerd
- Flux CD
- Kubernetes
- Helm and HelmRelease resources
- cert-manager
- step CLI
- Gateway API
- OpenTelemetry-compatible distributed tracing

## Sources Consulted
- Linkerd official Helm installation documentation: https://linkerd.io/2-edge/tasks/install-helm/
- Linkerd official certificate generation documentation: https://linkerd.io/2-edge/tasks/generate-certificates/
- Linkerd official Kubernetes version support reference: https://linkerd.io/2-edge/reference/k8s-versions/
- Linkerd official distributed tracing documentation: https://linkerd.io/2-edge/tasks/distributed-tracing/
- Linkerd official Linkerd-Jaeger migration documentation: https://linkerd.io/2-edge/tasks/jaeger-extension-migration/
- Linkerd official Helm chart repository index: https://helm.linkerd.io/edge/index.yaml
- Flux official HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- cert-manager issuer and certificate behavior as referenced by Linkerd control plane TLS rotation documentation: https://linkerd.io/2.11/tasks/automatically-rotating-control-plane-tls-credentials/

## Issues Found
- The prerequisites used a fixed Kubernetes version of v1.26 or later. Linkerd compatibility is release-dependent, so this was changed to require a cluster compatible with the chosen Linkerd release.
- The prerequisites omitted Gateway API CRDs, which current Linkerd Helm installation documentation lists as a prerequisite. Added Gateway API CRDs to the prerequisites.
- The certificate storage example used an Opaque `linkerd-trust-anchor` secret with only `ca.crt`, while cert-manager CA issuer workflows expect a TLS secret containing `tls.crt` and `tls.key`. Updated the example to use a `kubernetes.io/tls` trust anchor secret.
- The Linkerd control plane values mixed `identity.externalCA: true` with an inline `identityTrustAnchorsPEM` value. With `externalCA: true`, the chart expects the trust roots ConfigMap to already exist. Added the `linkerd-identity-trust-roots` ConfigMap and removed the inline trust anchor value from the HelmRelease.
- The unused `https://helm.buoyant.cloud` HelmRepository was presented as a Linkerd extensions repository, but the post installs extension charts from the official Linkerd edge repository. Removed the unused repository.
- The chart version examples used `"2024.x"`, which is outdated for this 2026 post and would not select the current intended chart family. Updated Linkerd CRDs, control plane, and Viz examples to `"2026.4.x"`.
- The Linkerd Viz example included `defaultNamespace`, which is not a value in the current `linkerd-viz` chart. Removed that value.
- The Linkerd Viz HelmRelease was namespaced to `linkerd-viz` without creating that namespace. Added a Namespace manifest to the Viz example.
- The post recommended installing the `linkerd-jaeger` extension. Linkerd documentation now says the extension is deprecated in Linkerd 2.19 and later and no longer available for modern tracing workflows. Replaced the HelmRelease with current OpenTelemetry-compatible collector configuration guidance.
- The sample Deployment placed Linkerd proxy resource override annotations on the Deployment metadata. Linkerd injector configuration annotations must be on the pod template or namespace. Moved the annotations under `spec.template.metadata.annotations`.
- The Flux reconciliation command only listed HelmReleases in the `linkerd` namespace, missing the Viz release in `linkerd-viz`. Changed it to `flux get helmreleases -A`.
- The conclusion overstated cert-manager as automating all mTLS certificate rotation. Corrected it to identity issuer certificate rotation, since trust anchor rotation remains a separate operational concern.

## Review Notes
- The examples use the Linkerd edge Helm repository and pin to the 2026.4 chart family. Future updates should re-check the Linkerd chart version and Kubernetes compatibility together before bumping the version range.
