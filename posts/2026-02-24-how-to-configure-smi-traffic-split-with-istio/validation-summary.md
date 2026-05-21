# Validation Summary: How to Configure SMI Traffic Split with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Service Mesh Interface (SMI)
- SMI TrafficSplit
- SMI adapter for Istio
- Kubernetes Deployments and Services
- kubectl
- istioctl

## Sources Consulted
- SMI adapter for Istio repository and README: https://github.com/servicemeshinterface/smi-adapter-istio
- SMI adapter for Istio install manifests: https://github.com/servicemeshinterface/smi-adapter-istio/tree/master/deploy
- SMI adapter for Istio TrafficSplit controller source: https://github.com/servicemeshinterface/smi-adapter-istio/blob/master/pkg/controller/trafficsplit/trafficsplit_controller.go
- SMI Traffic Split v1alpha2 specification: https://github.com/servicemeshinterface/smi-spec/blob/main/apis/traffic-split/v1alpha2/traffic-split.md
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Grafana dashboard task: https://istio.io/latest/docs/tasks/observability/metrics/using-istio-dashboard/
- Kubernetes deprecated API migration guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/

## Issues Found
- The setup commands used non-existent SMI adapter URLs, `deploy/crds.yaml` and `deploy/adapter.yaml`. Updated them to the repository's actual manifest paths, `deploy/crds/crds.yaml` and `deploy/operator-and-rbac.yaml`.
- The post said TrafficSplit resources are translated into both Istio VirtualService and DestinationRule objects. The SMI adapter TrafficSplit controller creates and updates a VirtualService only, so the DestinationRule claim and command were removed.
- The generated VirtualService example used the TrafficSplit name directly and `networking.istio.io/v1`. The adapter source creates a VirtualService named with a `-vs` suffix and uses the v1alpha3 Istio API type, so the example was corrected to `web-app-split-vs` and `networking.istio.io/v1alpha3`.
- The post presented the archived SMI adapter as a current setup path. Added a caveat that the upstream adapter is archived and its bundled CRDs use `apiextensions.k8s.io/v1beta1`, which Kubernetes stopped serving in v1.22.

## Review Notes
- The TrafficSplit examples use `split.smi-spec.io/v1alpha2`, which matches the archived SMI adapter's installed CRD. The latest SMI spec repository also contains newer TrafficSplit versions, but those do not match this adapter's manifests.
- Istio's current VirtualService API supports relative weighted routing semantics, including zero-weight destinations. The adapter normalizes SMI weights into whole-number percentages for Istio VirtualService routes.
- `istioctl dashboard grafana` is still a valid command when Grafana is installed, but Grafana and Prometheus are add-ons that must be installed separately.
