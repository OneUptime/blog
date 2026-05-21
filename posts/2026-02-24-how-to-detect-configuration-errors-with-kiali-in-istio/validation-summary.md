# Validation Summary: How to Detect Configuration Errors with Kiali in Istio

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Istio
- Kiali
- Kubernetes Services
- Istio VirtualService, DestinationRule, Gateway, ServiceEntry, Sidecar, AuthorizationPolicy, PeerAuthentication, RequestAuthentication, WorkloadEntry, WorkloadGroup, and EnvoyFilter resources
- Kiali API
- `istioctl analyze`

## Sources Consulted
- Kiali validation documentation: https://kiali.io/docs/features/validations/
- Kiali Istio environment documentation: https://kiali.io/docs/configuration/istio/
- Kiali source routes and API handlers: https://github.com/kiali/kiali/blob/master/routing/routes.go and https://github.com/kiali/kiali/blob/master/handlers/istio_config.go
- Kiali validation model source: https://github.com/kiali/kiali/blob/master/models/istio_validation.go
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio protocol selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio `istioctl analyze` documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Istio command reference for `istioctl analyze`: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio configuration validation problems documentation: https://istio.io/latest/docs/ops/common-problems/validation/

## Issues Found
- The introduction said `kubectl apply` accepts broken Istio configs without complaint. Istio uses validating admission webhooks for many configuration checks, so this was narrowed to semantic issues that can still pass admission.
- The missing DestinationRule subset example said Kiali reports "Subset not found" as an error. Kiali's validation descriptor marks this check as a warning, so the text was corrected.
- The unused DestinationRule section claimed Kiali warns when no VirtualService references a DestinationRule. DestinationRules can apply host-level policy without a VirtualService, so this was replaced with Kiali's actual checks for missing hosts and invalid subset labels.
- The port-name section described the issue as a generic warning and gave an incomplete convention. It now states the documented `<protocol>[-suffix]` form.
- The Kiali API examples assumed validation data is embedded directly inside each resource item. Current Kiali returns resources under `resources` and validation results under `validations`, and validation must be requested with `validate=true`; both scripts were corrected.

## Review Notes
The article intentionally uses short service names such as `reviews` and `frontend`. Istio supports short names, but the official documentation recommends fully qualified domain names to avoid namespace ambiguity in production examples.
