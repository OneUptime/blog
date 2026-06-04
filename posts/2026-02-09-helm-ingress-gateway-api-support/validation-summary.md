# Validation Summary: How to Build Helm Charts That Support Both Ingress and Gateway API Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm
- Kubernetes Ingress
- Kubernetes Gateway API
- Kubernetes HTTPRoute
- Kubernetes NetworkPolicy
- YAML configuration

## Sources Consulted
- Kubernetes Ingress concept documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes deprecated API migration guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Kubernetes namespace documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Gateway API reference specification: https://gateway-api.sigs.k8s.io/reference/spec/
- Gateway API overview: https://gateway-api.sigs.k8s.io/concepts/api-overview/
- Gateway API TLS guide: https://gateway-api.sigs.k8s.io/guides/tls/
- Gateway API request mirroring guide: https://gateway-api.sigs.k8s.io/guides/user-guides/http-request-mirroring/
- Helm chart template guide, built-in objects: https://helm.sh/docs/chart_template_guide/builtin_objects/
- Helm template command documentation: https://helm.sh/docs/helm/helm_template/
- Helm upgrade command documentation: https://helm.sh/docs/helm/helm_upgrade/

## Issues Found
- The Ingress template rendered deprecated and removed API versions (`networking.k8s.io/v1beta1` and `extensions/v1beta1`). Updated the template to use only the stable `networking.k8s.io/v1` Ingress API, which has been available since Kubernetes 1.19 and is the required migration target after Kubernetes 1.22.
- The Ingress template claimed to check the Kubernetes version, but it used Helm API capability checks. Updated the wording to describe the capability check accurately.
- The Ingress v1 path rendered `pathType` directly from values, which could produce invalid YAML if omitted. Added a default of `Prefix`, matching a valid Ingress v1 path type.
- The Gateway template created a Gateway named with `myapp.fullname`, while the HTTPRoute template attached to `.Values.gateway.gatewayName`. Updated the Gateway metadata name to use `.Values.gateway.gatewayName` with the chart fullname as a fallback.
- The Gateway and HTTPRoute API capability checks used only the API group/version. Updated them to check the concrete Gateway API resources (`gateway.networking.k8s.io/v1/Gateway` and `gateway.networking.k8s.io/v1/HTTPRoute`).
- The NetworkPolicy namespace selectors used a custom `name` label that is not guaranteed to exist. Updated them to use Kubernetes' stable automatic namespace label, `kubernetes.io/metadata.name`.
- The advanced HTTPRoute example rendered whenever Gateway was enabled, even if the HTTPRoute API was not available. Added a matching HTTPRoute capability guard.
- The Gateway test values omitted `listeners`, which are required for a valid Gateway. Added an HTTP listener to the Gateway values example.
- The local `helm template` test commands did not provide API versions for capability-gated resources. Added `--api-versions` flags so local rendering exercises the Ingress and Gateway API templates.
- The text said the shown templates allowed users to enable either or both approaches, but the templates intentionally render only one approach at a time. Updated the wording to say either approach.

## Review Notes
The Gateway API examples use features such as request mirroring that are valid Gateway API fields, but implementation support can vary by controller and conformance level. The post now notes that advanced capabilities depend on the Gateway implementation.
