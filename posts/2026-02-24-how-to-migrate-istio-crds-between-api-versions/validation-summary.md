# Validation Summary: How to Migrate Istio CRDs Between API Versions

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Istio
- Kubernetes CustomResourceDefinitions
- kubectl
- istioctl
- Helm
- YAML
- Python
- yq

## Sources Consulted
- Istio: Introducing Istio v1 APIs: https://istio.io/latest/blog/2024/v1-apis/
- Istio configuration reference: https://istio.io/latest/docs/reference/config/
- Istio Telemetry reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Wasm Plugin reference: https://istio.io/latest/docs/reference/config/proxy_extensions/wasm-plugin/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes CRD versioning documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definition-versioning/

## Issues Found
- The original API-version replacement command would have converted EnvoyFilter manifests from `networking.istio.io/v1alpha3` to `networking.istio.io/v1`, but EnvoyFilter is still only `v1alpha3`. I updated the text and command to exclude `envoyfilters.yaml`.
- The original text implied that checking `.spec.versions[?(@.storage==true)]` shows what is stored for a particular object. I clarified that this shows the CRD storage version used for newly written objects, while objects may previously have been written through older served versions.
- The original `sed -i ''` command was macOS-specific. I replaced it with a portable `perl -pi` command.
- The Telemetry caveat was too vague. I updated it to mention the specific v1alpha1 fields that were not promoted to v1: `metrics.reportingInterval`, `accessLogging.filter`, and `tracing.useRequestIdForTraceSampling`.
- The WasmPlugin note did not state the current API version. I added that WasmPlugin remains `extensions.istio.io/v1alpha1`.
- The rollback guidance assumed old API versions are always still served. I changed it to tell readers to verify `.spec.versions[].served` on their installed CRDs.
- The closing summary overstated that migration is only version-string replacement. I revised it to mention resources without a v1 API and fields not promoted to v1.

## Review Notes
The commands are structurally correct, but readers should still run `istioctl analyze` and server-side dry-run against their own cluster because CRD versions and validation policies depend on the installed Istio version.
