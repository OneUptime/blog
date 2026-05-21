# Validation Summary: How to Configure Proxy Image Version in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio sidecar injection
- IstioOperator configuration
- Envoy / Istio proxyv2 images
- Kubernetes Deployments, Pods, image pull policies, and image pull secrets
- kubectl and istioctl commands

## Sources Consulted
- Istio Resource Annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio ProxyConfig reference: https://istio.io/latest/docs/reference/config/networking/proxy-config/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- IstioOperator Options reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio supported releases / control plane and data plane skew: https://istio.io/latest/docs/releases/supported-releases/
- Istio sidecar injection template source: https://github.com/istio/istio/blob/master/manifests/charts/istio-control/istio-discovery/files/injection-template.yaml
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes labels and selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/

## Issues Found
- The command for reading `.data.values` from the `istio-sidecar-injector` ConfigMap piped YAML content to `jq`. Changed it to `yq` because Istio documents `.data.values` as the injector values file.
- The monitoring examples used `kubectl exec -l app=canary-service`, but the generated Kubernetes reference for `kubectl exec` supports a pod or resource target such as `deploy/name`, not a label selector in the command synopsis. Changed the examples to `kubectl exec deploy/canary-service`.
- The version skew section claimed Istio supports proxy versions at +/- 1 minor version from the control plane. Istio documents that the control plane may be one version ahead of the data plane, but the data plane cannot be ahead of the control plane. Updated the explanation and example.
- The init container section said a proxy image override does not automatically update the init container. Istio's injection template uses the full `sidecar.istio.io/proxyImage` annotation for both the sidecar and init container, so the text was corrected.

## Review Notes
- `sidecar.istio.io/proxyImage` is documented as an Alpha annotation. It is valid, but future reviews should re-check whether Istio changes or graduates this annotation.
- The guide uses older example Istio versions such as `1.20.0` and `1.21.0`; they are illustrative, but operators should choose currently supported versions for production.
