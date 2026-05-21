# Validation Summary: How to Configure SMI Traffic Access Control with Istio

## Status
not-technically-relevant

## Post Type
Tutorial

## Technologies Covered
- Istio
- Service Mesh Interface (SMI)
- SMI TrafficTarget
- SMI HTTPRouteGroup
- SMI TCPRoute
- Kubernetes
- Istio AuthorizationPolicy

## Sources Consulted
- SMI Traffic Access Control v1alpha3 specification: https://github.com/servicemeshinterface/smi-spec/blob/main/apis/traffic-access/v1alpha3/traffic-access.md
- SMI Traffic Specs v1alpha4 specification: https://github.com/servicemeshinterface/smi-spec/blob/main/apis/traffic-specs/v1alpha4/traffic-specs.md
- SMI adapter for Istio repository and README: https://github.com/servicemeshinterface/smi-adapter-istio
- SMI adapter for Istio TrafficTarget demo: https://github.com/servicemeshinterface/smi-adapter-istio/tree/main/docs/smi-traffictarget
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio alpha security policy migration note: https://istio.io/latest/blog/2021/migrate-alpha-policy/
- Kubernetes deprecated API migration guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/

## Issues Found
- The post depends on `servicemeshinterface/smi-adapter-istio`, but that repository was archived on October 20, 2023 and is read-only. A current how-to guide should not present it as an actively usable Istio integration.
- The install commands in the post use non-existent adapter paths: `deploy/crds.yaml` and `deploy/adapter.yaml`. The adapter README documents `deploy/crds/crds.yaml` and `deploy/operator-and-rbac.yaml`.
- The adapter's documented CRD manifest uses `apiextensions.k8s.io/v1beta1`, which Kubernetes no longer serves as of Kubernetes 1.22. The installation path is therefore not usable on current Kubernetes clusters.
- The post uses SMI `TrafficTarget` `access.smi-spec.io/v1alpha3` and traffic specs `specs.smi-spec.io/v1alpha4`, but the archived Istio adapter code and manifests use older SMI `v1alpha1` resources for TrafficTarget and HTTPRouteGroup.
- The post says the adapter translates `TrafficTarget` resources into Istio `AuthorizationPolicy` resources. The official archived adapter creates legacy Istio RBAC resources such as `ServiceRole` and `ServiceRoleBinding` under `rbac.istio.io/v1alpha1`; those pre-Istio 1.4 APIs were replaced by current authorization APIs.
- The TCPRoute example is not supported by the archived adapter install manifest, which defines TrafficTarget, HTTPRouteGroup, and TrafficSplit CRDs but not TCPRoute.
- The "generated AuthorizationPolicy" and `kubectl get authorizationpolicy -o yaml` sections are therefore inaccurate for the adapter referenced by the post.

## Review Notes
This post should be removed or replaced with a new article that uses supported Istio `AuthorizationPolicy` resources directly. Reworking the current post into a correct tutorial would require a substantive rewrite, not a narrow technical correction.
