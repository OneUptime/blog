# Validation Summary: How to Set Up Istio Primary-Remote on Different Networks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio
- Istio multicluster primary-remote topology
- Kubernetes
- East-west gateways
- IstioOperator configuration
- `istioctl`
- `kubectl`

## Sources Consulted
- Istio official docs: Install Primary-Remote on different networks: https://istio.io/latest/docs/setup/install/multicluster/primary-remote_multi-network/
- Istio official docs: Before you begin for multicluster installation: https://istio.io/latest/docs/setup/install/multicluster/before-you-begin/
- Istio official docs: Verify the multicluster installation: https://istio.io/latest/docs/setup/install/multicluster/verify/
- Istio official docs: `istioctl` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio official docs: Using the `istioctl` command-line tool: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl/

## Issues Found
- The remote cluster setup was missing the `topology.istio.io/controlPlaneClusters=cluster1` annotation on the remote `istio-system` namespace. Added the annotation command and a short explanation because Istio requires it to identify which external control plane should manage the remote cluster.
- The service exposure step was applied too early and then shown against the remote cluster. Updated the tutorial so `expose-istiod.yaml` is applied when exposing the primary control plane, and `expose-services.yaml` is applied after the remote east-west gateway is installed, using the primary cluster context as shown in the official primary-remote multi-network guide.
- The prerequisite recommended `istioctl` 1.20+. Replaced that with Istio's current recommendation to use an `istioctl` version matching the control plane release, avoiding an outdated minimum-version claim.

## Review Notes
The tutorial intentionally uses an IP-based `remotePilotAddress`, which is valid for a walkthrough. Istio's official documentation notes that production environments should prefer `injectionURL` with properly signed DNS certificates when practical.
