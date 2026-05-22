# Validation Summary: How to Set Up Istio for Service Mesh Interface (SMI) Compatibility

## Status
not-technically-relevant

## Post Type
Tutorial / setup guide

## Technologies Covered
- Istio
- Service Mesh Interface (SMI)
- SMI adapter for Istio
- Kubernetes CustomResourceDefinitions
- Flagger
- Kubernetes Services
- Istio VirtualService, DestinationRule, and authorization resources

## Sources Consulted
- SMI specification repository: https://github.com/servicemeshinterface/smi-spec
- SMI latest stable specification v0.6.0: https://github.com/servicemeshinterface/smi-spec/blob/main/SPEC_LATEST_STABLE.md
- SMI Traffic Split v1alpha4 specification: https://github.com/servicemeshinterface/smi-spec/blob/main/apis/traffic-split/v1alpha4/traffic-split.md
- SMI Traffic Access Control v1alpha3 specification: https://github.com/servicemeshinterface/smi-spec/blob/main/apis/traffic-access/v1alpha3/traffic-access.md
- SMI Traffic Specs v1alpha4 specification: https://github.com/servicemeshinterface/smi-spec/blob/main/apis/traffic-specs/v1alpha4/traffic-specs.md
- SMI adapter for Istio repository: https://github.com/servicemeshinterface/smi-adapter-istio
- SMI adapter for Istio README and install manifests: https://github.com/servicemeshinterface/smi-adapter-istio/blob/main/README.md
- SMI adapter for Istio releases: https://github.com/servicemeshinterface/smi-adapter-istio/releases
- Flagger Istio canary deployment documentation: https://docs.flagger.app/tutorials/istio-progressive-delivery
- Flagger Canary CRD schema: https://raw.githubusercontent.com/fluxcd/flagger/main/artifacts/flagger/crd.yaml
- Kubernetes deprecated API migration guide for CRD v1beta1 removal: https://kubernetes.io/docs/reference/using-api/deprecation-guide/#customresourcedefinition-v122

## Issues Found
- The SMI specification repository is archived and read-only. The repository states that the project is archived, with the latest SMI release at v0.6.0 from January 20, 2021. A 2026 guide presenting SMI as a current interoperability standard is misleading.
- The `servicemeshinterface/smi-adapter-istio` repository is archived and read-only. Its latest release is `v0.1.0` from October 17, 2019, so it is not a current Istio integration path.
- The install command `kubectl apply -f https://github.com/servicemeshinterface/smi-adapter-istio/releases/latest/download/smi-adapter-istio.yaml` resolves to a missing release asset and returns 404.
- The Helm repository `https://servicemeshinterface.github.io/smi-adapter-istio` returns 404 for `index.yaml`, so the Helm installation instructions are not valid.
- The adapter's official install manifests use `apiextensions.k8s.io/v1beta1` CustomResourceDefinition objects. That API version is not served in Kubernetes v1.22 and later, so the adapter cannot be installed as written on modern Kubernetes clusters.
- The adapter's bundled CRDs are old SMI versions: `TrafficTarget` and `HTTPRouteGroup` v1alpha1 and `TrafficSplit` v1alpha2. The post's examples use the later SMI `access.smi-spec.io/v1alpha3`, `specs.smi-spec.io/v1alpha4`, and `split.smi-spec.io/v1alpha4` resources, which do not match the adapter's install manifests.
- The post says TrafficTarget translates to Istio `AuthorizationPolicy`, but the archived adapter grants permissions for the old `rbac.istio.io` API group and its examples were written for Istio 1.1-era RBAC, not modern `security.istio.io` AuthorizationPolicy resources.
- The Flagger example uses `provider: smi:istio`, but the current Flagger Canary CRD provider enum does not include that value. Current accepted values include `istio`, `osm`, and `smi:v1alpha1` through `smi:v1alpha3`.
- The Flagger example says Flagger will create SMI TrafficSplit resources for Istio via `provider: smi:istio`; current Flagger Istio documentation describes Flagger creating Istio VirtualServices and DestinationRules directly for the Istio provider.

## Review Notes
The post was not edited because the central setup path is obsolete rather than a small technical mistake. Correcting it would require rewriting the article around historical SMI usage or replacing it with a current Istio/Gateway API or Flagger/Istio guide.
