# Validation Summary: How to Validate Istio Configurations Using Kiali

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kiali
- Kubernetes
- Istio networking APIs: VirtualService, DestinationRule, Gateway
- Istio security APIs: AuthorizationPolicy, PeerAuthentication
- Kiali API
- istioctl analyze

## Sources Consulted
- Kiali validation documentation: https://kiali.io/docs/features/validations/
- Kiali Istio configuration documentation: https://kiali.io/docs/features/configuration/
- Kiali API and model definitions from the official kiali/kiali repository: https://github.com/kiali/kiali
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio istioctl analyze documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Istio command reference for istioctl analyze: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The route-weight example said Kiali warns when multiple route weights do not add up to 100. Istio treats destination weights as relative proportions, and Kiali's documented warning is for a single destination with a weight less than 100. Updated the section and YAML example accordingly.
- The Kiali API automation example did not request validation data and parsed a stale response shape. Updated the URL to include `validate=true` and changed the parser to read `data.validations`.
- The `istioctl analyze` example used `-f`, which is not a valid file-input flag for `istioctl analyze`. Updated the command to pass the directory as a positional argument and added `--use-kube=false` for CI-style file-only analysis.

## Review Notes
- Kiali validation messages and API response details can vary by Kiali version. The corrected API example matches the current Kiali internal API shape in the official repository.
