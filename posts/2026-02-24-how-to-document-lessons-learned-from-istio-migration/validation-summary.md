# Validation Summary: How to Document Lessons Learned from Istio Migration

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio
- Kubernetes
- mTLS
- Istio DestinationRule
- IstioOperator install configuration
- Kubernetes NetworkPolicy
- Kubernetes pod security controls

## Sources Consulted
- Istio Protocol Selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio CNI installation guide: https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio Security Model: https://istio.io/latest/docs/ops/deployment/security-model/
- Istio Canary Upgrades: https://istio.io/latest/docs/setup/upgrade/canary/
- Istio installation customization: https://istio.io/latest/docs/setup/additional-setup/customize-installation/
- Istio in-cluster operator deprecation announcement: https://istio.io/latest/blog/2024/in-cluster-operator-deprecation-announcement/
- Kubernetes PodSecurityPolicy documentation: https://kubernetes.io/docs/concepts/security/pod-security-policy/
- Kubernetes Pod Security Admission stable announcement: https://kubernetes.io/blog/2022/08/25/pod-security-admission-stable/

## Issues Found
- The decision-log example listed "Istio Operator" as a current installation alternative. Istio's in-cluster operator was deprecated in Istio 1.23 and removed in Istio 1.24, while `istioctl install` with an `IstioOperator` YAML file remains supported. I changed the wording to "in-cluster Istio Operator" and noted that it has been removed from current Istio releases.
- The mTLS rollout example said STRICT mode would break services that talk to external databases without sidecars. Istio `PeerAuthentication` STRICT mode controls inbound traffic to workloads, so the more accurate migration risk is non-mesh clients sending plaintext traffic to meshed workloads. I changed the example to legacy clients without sidecars.
- The pod-init troubleshooting example referred to PodSecurityPolicy. PodSecurityPolicy was deprecated in Kubernetes v1.21 and removed in v1.25. I changed the wording to a restrictive pod admission policy and updated the resolution to installing Istio CNI, which official Istio docs recommend to remove the need for privileged `istio-init` containers in application pods.
- The 503 troubleshooting example described `http1MaxPendingRequests` defaulting to 1024. Current Istio DestinationRule reference documents the default as `2^32-1`. I changed the example to say an existing DestinationRule override of 1024 was too low.

## Review Notes
The IstioOperator configuration uses the install API consumed by `istioctl install`, which remains supported even though the in-cluster operator controller was removed. The MySQL/server-first protocol note and `tcp-` port naming guidance are consistent with Istio protocol selection documentation.
