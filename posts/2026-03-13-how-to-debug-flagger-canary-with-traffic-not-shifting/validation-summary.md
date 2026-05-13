# Validation Summary: How to Debug Flagger Canary with Traffic Not Shifting

## Status
validated

## Post Type
Tutorial / debugging guide

## Technologies Covered
- Flagger
- Kubernetes
- Istio
- Linkerd
- NGINX Ingress Controller
- Service Mesh Interface TrafficSplit

## Sources Consulted
- Flagger installation documentation: https://docs.flagger.app/install/flagger-install-on-kubernetes
- Flagger "How it works" documentation: https://docs.flagger.app/usage/how-it-works
- Flagger Istio canary deployments documentation: https://docs.flagger.app/main/tutorials/istio-progressive-delivery
- Flagger NGINX canary deployments documentation: https://docs.flagger.app/main/tutorials/nginx-progressive-delivery
- Kubernetes Service documentation, including EndpointSlice and Endpoints deprecation notes: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/tasks/administer-cluster/enabling-endpointslices/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Linkerd automatic proxy injection documentation: https://linkerd.io/2/features/proxy-injection/
- Linkerd TrafficSplit documentation: https://linkerd.io/2.10/features/traffic-split/
- ingress-nginx canary annotations documentation: https://kubernetes.github.io/ingress-nginx/examples/canary/

## Issues Found
- The provider check used `grep meshProvider` against the Flagger Deployment YAML. Flagger's Helm `meshProvider` value is rendered into the controller container's `-mesh-provider` argument, so the command was changed to inspect the Flagger container args with jsonpath.
- The text implied that every Canary `.spec.provider` must match the global provider. Flagger documents `.spec.provider` as an optional per-Canary override, so the wording was updated to explain that it only applies when set.
- The service endpoint checks used the legacy `endpoints` resource. Kubernetes v1.33 deprecates the Endpoints API in favor of EndpointSlice, so the commands were changed to inspect EndpointSlices by the `kubernetes.io/service-name` label.
- The direct curl tests reused the same temporary pod name and passed `curl` without explicitly overriding the image command. The examples now use separate pod names, include `--command --`, use `curl -sS`, and include an explicit service port placeholder.
- The sidecar statement was too broad for all possible Istio modes. It now specifically applies to sidecar-based Istio mode and Linkerd.

## Review Notes
The remaining commands and configuration examples are technically valid for the provider-specific resources discussed. Future revisions could add Gateway API examples because Flagger also supports Gateway API routing providers, but that is outside the scope of this post's current content.
