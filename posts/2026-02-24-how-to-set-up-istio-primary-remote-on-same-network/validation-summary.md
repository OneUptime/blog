# Validation Summary: How to Set Up Istio Primary-Remote on Same Network

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio
- Kubernetes
- Istio multi-cluster primary-remote topology
- IstioOperator configuration
- Istio east-west gateway
- `istioctl`
- `kubectl`

## Sources Consulted
- Istio primary-remote install guide: https://istio.io/latest/docs/setup/install/multicluster/primary-remote/
- Istio multicluster before-you-begin guide: https://istio.io/latest/docs/setup/install/multicluster/before-you-begin/
- Istio multicluster verification guide: https://istio.io/latest/docs/setup/install/multicluster/verify/
- Istio `samples/multicluster/expose-istiod.yaml`: https://raw.githubusercontent.com/istio/istio/release-1.30/samples/multicluster/expose-istiod.yaml

## Issues Found
- The post stated that multi-cluster Istio always needs a shared root certificate. Istio's current docs state that primary-remote with one primary Istiod CA can use the default self-signed CA, so the wording was corrected while keeping the optional shared-root workflow.
- The post suggested using the primary cluster's `istiod` ClusterIP as the discovery address. The official primary-remote same-network guide exposes Istiod through the primary cluster east-west gateway, so the ClusterIP path was removed.
- The remote setup omitted the `topology.istio.io/controlPlaneClusters=cluster1` annotation on the remote `istio-system` namespace. Added the annotation step because it tells the primary control plane to manage the remote cluster.
- The `expose-istiod.yaml` example only showed a Gateway and used the older `networking.istio.io/v1beta1` API. Updated it to the current `networking.istio.io/v1` Gateway plus the required VirtualService routes for ports 15012 and 15017.
- The health check section did not include the official `istioctl remote-clusters` verification. Added it so the guide checks that Istiod can communicate with the remote cluster API server.

## Review Notes
- The article is aligned with Istio 1.30 documentation after the fixes. The `remote` profile for Helm chart installs is documented as available from Istio 1.24 onward, but this post uses `istioctl install` with an IstioOperator manifest and does not pin a specific Istio version.
