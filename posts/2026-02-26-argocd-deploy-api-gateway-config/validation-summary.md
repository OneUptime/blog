# Validation Summary: How to Deploy API Gateway Configurations with ArgoCD

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Argo CD Application resources, sync waves, sync hooks, and custom health checks
- Kubernetes Ingress, Jobs, ConfigMaps, CRDs, and Services
- Kong Gateway and Kong Ingress Controller
- Emissary-Ingress
- Apache APISIX and APISIX Ingress Controller
- Helm chart deployment through Argo CD
- GitOps repository layout with Kustomize overlays

## Sources Consulted
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD resource hooks: https://argo-cd.readthedocs.io/en/stable/user-guide/resource_hooks/
- Argo CD resource health customizations: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Kong Helm chart 2.38.0 values: https://github.com/Kong/charts/blob/kong-2.38.0/charts/kong/values.yaml
- Kong Ingress Controller configuration options: https://developer.konghq.com/kubernetes-ingress-controller/reference/configuration-options/
- Kong Ingress Controller annotations and custom resources: https://developer.konghq.com/kubernetes-ingress-controller/reference/annotations/ and https://developer.konghq.com/kubernetes-ingress-controller/reference/custom-resources/
- Kong plugin documentation for rate limiting, JWT, and CORS: https://docs.konghq.com/kubernetes-ingress-controller/latest/plugins/rate-limiting/, https://docs.konghq.com/hub/kong-inc/jwt/, and https://developer.konghq.com/plugins/cors/
- Emissary-Ingress Helm and CRD documentation: https://emissary-ingress.dev/docs/3.9/tutorials/getting-started and https://app.getambassador.io/yaml/emissary/3.9.1/emissary-crds.yaml
- Emissary-Ingress rate limiting and AuthService documentation: https://emissary-ingress.dev/docs/3.9/topics/using/basic-rate-limiting/ and https://emissary-ingress.dev/docs/3.9/howtos/basic-auth/
- APISIX Helm chart documentation and values: https://apisix.apache.org/docs/helm-chart/apisix/ and https://github.com/apache/apisix-helm-chart/blob/apisix-2.6.0/charts/apisix/values.yaml
- APISIX ApisixRoute v2 and proxy-rewrite documentation: https://apisix.apache.org/docs/ingress-controller/references/apisix_route_v2/ and https://apisix.apache.org/docs/apisix/plugins/proxy-rewrite/

## Issues Found
- The Kong Helm values used `ingressController.installCRDs`, which is not a valid value in the Kong chart 2.38.0 values file. Removed it.
- The Kong installation set `env.declarative_config` while also using the Kubernetes ingress controller to push configuration through the Admin API. Removed the static declarative config path to avoid requiring an undeclared mounted file.
- The Kong controller Admin API setting used `kong_admin_api_uri`, but the current KIC flag is `--kong-admin-url`, which maps to `ingressController.env.kong_admin_url` in the chart. Updated the field.
- The Emissary rate limiting example used a `RateLimit` custom resource with inline limits. That resource is for Ambassador Edge Stack, not Emissary-Ingress. Replaced it with a valid `RateLimitService` and added Mapping labels so Emissary sends descriptors to the rate limit service.
- The Emissary authentication example used `FilterPolicy`, which is not part of the Emissary-Ingress CRDs. Replaced it with a valid `AuthService` example.
- The APISIX Helm values used `gateway.type`, but APISIX chart 2.6.0 exposes the gateway service type under `service.type`. Updated the values snippet.

## Review Notes
- The Emissary `RateLimitService` example assumes a compatible external gRPC rate limit service exists at `rate-limit-service.production:5000`; Emissary delegates the actual rate limit policy decision to that service.
- The Kong JWT and APISIX JWT examples still require corresponding consumers or credentials for a complete authentication setup; the plugin attachment syntax itself is valid.
