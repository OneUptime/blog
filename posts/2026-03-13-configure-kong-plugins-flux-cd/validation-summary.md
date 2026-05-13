# Validation Summary: How to Configure Kong Plugins with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kong Gateway
- Kong Ingress Controller
- KongPlugin, KongClusterPlugin, and KongConsumer CRDs
- Kubernetes Ingress and Secrets
- Flux CD Kustomization
- Kong rate-limiting, key-auth, request-transformer, and CORS plugins

## Sources Consulted
- Kong Ingress Controller Ingress documentation: https://developer.konghq.com/kubernetes-ingress-controller/ingress/
- Kong Ingress Controller class annotation documentation: https://developer.konghq.com/kubernetes-ingress-controller/class-annotations/
- Kong Ingress Controller annotation reference: https://developer.konghq.com/kubernetes-ingress-controller/reference/annotations/
- Kong Ingress Controller key-auth guide: https://developer.konghq.com/kubernetes-ingress-controller/get-started/key-authentication/
- Kong Ingress Controller gateway configuration debugging documentation: https://developer.konghq.com/kubernetes-ingress-controller/troubleshooting/kong-gateway-configuration/
- Kong CRD reference: https://developer.konghq.com/operator/reference/custom-resources/
- Kong rate-limiting plugin documentation and schema: https://developer.konghq.com/plugins/rate-limiting/ and https://raw.githubusercontent.com/Kong/kong/master/kong/plugins/rate-limiting/schema.lua
- Kong key-auth plugin schema: https://raw.githubusercontent.com/Kong/kong/master/kong/plugins/key-auth/schema.lua
- Kong request-transformer plugin documentation and schema: https://developer.konghq.com/plugins/request-transformer/ and https://raw.githubusercontent.com/Kong/kong/master/kong/plugins/request-transformer/schema.lua
- Kong CORS plugin schema: https://raw.githubusercontent.com/Kong/kong/master/kong/plugins/cors/schema.lua
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The CRD installation statement was too absolute. Updated it to say Kong Ingress Controller installation manifests and Helm charts include the CRDs, which is more accurate than saying the controller itself always installs them automatically.
- The expected CRD list included `kongingresses.configuration.konghq.com`, which is deprecated in current Kong Ingress Controller releases and is not used by this tutorial. Removed it from the expected output.
- The rate-limiting example set `header_name` while using `limit_by: ip` and described it as a response header setting. `header_name` is for header-based rate-limit keys, not naming the response rate-limit headers. Removed the misleading field and comment.
- The Ingress example used the legacy `kubernetes.io/ingress.class` annotation. Updated it to use `spec.ingressClassName: kong`, which is the current Kubernetes `networking.k8s.io/v1` Ingress field and is supported by Kong Ingress Controller.
- The best-practice note referred to Kong's `/debug/config` admin endpoint. Updated it to clarify that `/debug/config` is exposed by the Kong Ingress Controller diagnostic server after enabling `CONTROLLER_DUMP_CONFIG`.

## Review Notes
- Kong's current documentation recommends Gateway API as the preferred Kubernetes routing API, but Kong still supports Kubernetes Ingress. The post remains valid because it explicitly demonstrates Ingress-based configuration.
- `KongClusterPlugin` resources and `KongConsumer` resources still require `kubernetes.io/ingress.class` annotations for Kong Ingress Controller class selection, so those annotations were left in place.
