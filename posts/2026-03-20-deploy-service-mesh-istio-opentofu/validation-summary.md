# Validation Summary: How to Deploy Service Mesh (Istio) with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- OpenTofu / Terraform-style HCL
- Helm
- Kubernetes
- Istio `PeerAuthentication`
- Istio `Gateway`
- Istio `VirtualService`

## Sources Consulted
- Istio Install with Helm: https://istio.io/latest/docs/setup/install/helm/
- Istio Supported Releases: https://istio.io/latest/docs/releases/supported-releases/
- Istio sidecar injection: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio `PeerAuthentication` reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio authentication policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio `Gateway` reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio `VirtualService` reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio official Helm chart repository index: https://istio-release.storage.googleapis.com/charts/index.yaml
- Istio `istiod` chart source (`1.29.2`): https://istio-release.storage.googleapis.com/charts/istiod-1.29.2.tgz
- Istio `gateway` chart source (`1.29.2`): https://istio-release.storage.googleapis.com/charts/gateway-1.29.2.tgz
- HashiCorp Kubernetes provider `kubernetes_manifest` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/manifest.md
- HashiCorp Helm provider `helm_release` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-helm/main/docs/resources/release.md
- Amazon EKS NLB annotations guidance: https://docs.aws.amazon.com/eks/latest/userguide/auto-configure-nlb.html
- AWS Load Balancer Controller NLB guidance: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/nlb/

## Issues Found
- The post pinned Istio Helm charts to `1.20.2`. Istio `1.20` is outside the support window as of 2026-05-01, so the chart versions were updated to `1.29.2`, the current supported stable patch release in the official chart repository.
- The `istiod` values block used `pilot.resources`, `pilot.autoscaleEnabled`, `pilot.autoscaleMin`, and `pilot.autoscaleMax`. In the current `istiod` chart these settings are top-level values, so the example would not apply the intended control-plane resource and autoscaling settings. The snippet was corrected to use the chart’s actual value paths.
- The `meshConfig.defaultConfig` comment incorrectly said it was setting the default mTLS mode. That block configures proxy defaults, and the `tracing.sampling` field controls trace sampling, not mTLS. The comment was corrected.
- The Istio custom resources used `security.istio.io/v1beta1` and `networking.istio.io/v1beta1`. Current Istio docs use the stable `v1` APIs for `PeerAuthentication`, `Gateway`, and `VirtualService`, so the examples were updated accordingly.
- The `PeerAuthentication` comment described the policy as “cluster-wide”. A root-namespace policy is mesh-wide for workloads in the mesh, so the comment and best-practice wording were corrected to match Istio’s documented scope.
- The ingress gateway example combined a fixed `replicaCount` with the gateway chart’s default autoscaling behavior. That does not preserve a fixed desired replica count over time, so the example was corrected by disabling autoscaling when using environment-specific replica counts.
- The ingress gateway example included AWS-specific NLB annotations in a generic Kubernetes tutorial. The `aws-load-balancer-type: nlb` annotation is not current general guidance across modern EKS modes, so the provider-specific annotations were removed to keep the example technically correct and portable.
- The post implied that `kubernetes_manifest` can be used for Istio custom resources in the same initial run that installs the CRDs. The provider’s own documentation requires API access at plan time, and in practice these resources should be applied after the CRDs already exist. The post was updated to make that two-phase requirement explicit for fresh clusters.

## Review Notes
- The namespace label `istio-injection=enabled` is still valid for automatic sidecar injection. If operators use revision-based installs, `istio.io/rev` labels should be used instead, as documented by Istio.
- The example assumes the default Istio root namespace is `istio-system`. If an installation uses a different root namespace, the mesh-wide `PeerAuthentication` must use that namespace instead.
- The tutorial now pins supported versions, but Istio has a short support window. This post should be revisited when a newer supported minor release replaces `1.29`.
