# Validation Summary: How to Use Service Mesh Interface with Istio

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Istio
- Service Mesh Interface (SMI)
- Kubernetes
- SMI TrafficSplit
- SMI TrafficTarget and HTTPRouteGroup
- Istio VirtualService
- Legacy Istio RBAC resources

## Sources Consulted
- SMI project website: https://smi-spec.io/
- SMI specification repository: https://github.com/servicemeshinterface/smi-spec
- SMI Traffic Split specification: https://github.com/servicemeshinterface/smi-spec/blob/main/apis/traffic-split/v1alpha4/traffic-split.md
- SMI adapter for Istio repository: https://github.com/servicemeshinterface/smi-adapter-istio
- SMI adapter for Istio TrafficSplit docs and manifests: https://github.com/servicemeshinterface/smi-adapter-istio/tree/main/docs/smi-trafficsplit
- SMI adapter for Istio TrafficTarget docs and manifests: https://github.com/servicemeshinterface/smi-adapter-istio/tree/main/docs/smi-traffictarget
- Istio install with istioctl documentation: https://istio.io/latest/docs/setup/install/istioctl/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio alpha policy migration documentation: https://istio.io/latest/blog/2021/migrate-alpha-policy/
- Kubernetes deprecated API migration guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/

## Issues Found
- The post described the Istio SMI adapter as a current common approach. The SMI project and adapter repository are archived, so I updated the wording to make clear that this is a legacy lab setup rather than a current production path.
- The adapter installation URLs pointed to `master/deploy/crds.yaml` and `master/deploy/adapter.yaml`, which return 404 for the archived repository. I changed them to the documented `main/deploy/crds/crds.yaml` and `main/deploy/operator-and-rbac.yaml` manifests.
- The adapter pod selector used `app=smi-adapter-istio`, but the published manifest labels the Deployment and pods with `name=smi-adapter-istio`. I corrected the `kubectl get pods` and `kubectl logs` commands.
- The sample TrafficSplit referenced `api-server-v1` and `api-server-v2` Services that were never created. I added versioned Kubernetes Service objects with matching selectors.
- The post claimed TrafficSplit creates both VirtualService and DestinationRule resources. The adapter implementation creates an Istio VirtualService for TrafficSplit, so I removed the DestinationRule verification and translation claim.
- The TrafficTarget example used the newer `access.smi-spec.io/v1alpha3` shape, but the archived adapter CRDs use `access.smi-spec.io/v1alpha1` and `specs.smi-spec.io/v1alpha1`. I changed the example to the adapter-supported `HTTPRouteGroup` plus `TrafficTarget` structure.
- The post claimed TrafficTarget is translated into AuthorizationPolicy resources. The archived adapter creates legacy Istio `ServiceRole` and `ServiceRoleBinding` resources, so I corrected the explanation and noted that modern Istio uses AuthorizationPolicy.
- Cleanup commands referenced the old invalid adapter URLs and omitted the HTTPRouteGroup resource. I updated the URLs and added the HTTPRouteGroup cleanup command.

## Review Notes
The post is now technically accurate as a legacy SMI adapter guide, but the adapter's published CRD manifest uses `apiextensions.k8s.io/v1beta1`, which Kubernetes no longer serves as of v1.22. The adapter also relies on Istio's old RBAC API for TrafficTarget behavior. For modern Istio clusters, native Istio APIs are the practical path unless the adapter is forked and updated.
