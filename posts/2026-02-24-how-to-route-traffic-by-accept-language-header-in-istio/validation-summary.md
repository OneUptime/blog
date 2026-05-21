# Validation Summary: How to Route Traffic by Accept-Language Header in Istio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Istio traffic routing
- Kubernetes
- kubectl
- istioctl
- HTTP Accept-Language header

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio istioctl analyze documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- RFC 9110 HTTP Semantics, Accept-Language and quality values: https://www.rfc-editor.org/rfc/rfc9110.html

## Issues Found
- The post said `regex: "^fr.*"` was a better approach for "handling quality values." Istio header regex matching does not parse or compare Accept-Language `q` weights; that regex only requires French to appear at the start of the header value. Updated the sentence to say it avoids low-priority matches by matching only when French is listed first.

## Review Notes
- The Istio `VirtualService` examples use valid `networking.istio.io/v1` fields. Header keys are correctly lowercase, and `exact`, `prefix`, and `regex` are valid `StringMatch` options.
- The `DestinationRule` subset examples use valid subset names and label selectors.
- The `kubectl exec`, `kubectl logs`, `istioctl analyze`, and `istioctl proxy-config routes` commands use valid command forms.
- Istio `exact` and `prefix` string matches are case-sensitive, so production configurations should account for unusual Accept-Language casing if clients might send it.
