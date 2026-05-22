# Validation Summary: How to Communicate Istio Changes to Development Teams

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio service mesh
- Kubernetes Services and Deployments
- Istio sidecar injection
- Istio ServiceEntry resources
- istioctl
- jq and shell scripting

## Sources Consulted
- Istio protocol selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio health check probe rewrite documentation: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio egress traffic documentation: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-control/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The port naming section stated that Istio needs service port names to follow a convention. Updated this to reflect current Istio behavior: Istio can automatically detect HTTP and HTTP/2, and explicit protocol selection can be done through Kubernetes `appProtocol` or Istio-compatible port names.
- The port naming examples omitted `http2`, which is a supported Istio protocol prefix. Added an HTTP/2 example.
- The CI linting example matched valid protocol strings anywhere in the output, so names like `badhttp` could pass accidentally. Replaced the grep pipeline with a jq filter that checks the port name itself against anchored Istio protocol prefixes and skips `istio-system`.

## Review Notes
The examples are intentionally operational and environment-specific. Claims about rollback times, sidecar memory overhead, and latency impact are framed as example communication content rather than universal Istio guarantees, so they were left unchanged.
