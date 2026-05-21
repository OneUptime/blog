# Validation Summary: How to Set Up Header-Based Versioning API with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Kubernetes Deployments
- Kubernetes Services
- Kubernetes labels and selectors
- Kubernetes kubectl logs
- HTTP request and response headers
- HTTP Deprecation and Sunset headers

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio protocol selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio v1 APIs announcement: https://istio.io/latest/blog/2024/v1-apis/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- RFC 9745, The Deprecation HTTP Response Header Field: https://www.ietf.org/rfc/rfc9745.html
- RFC 8594, The Sunset HTTP Header Field: https://www.rfc-editor.org/rfc/rfc8594

## Issues Found
- The Istio examples used `networking.istio.io/v1beta1`. Istio promoted VirtualService and DestinationRule to `networking.istio.io/v1` in Istio 1.22 and encourages users to transition to the v1 APIs, so the examples were updated to `networking.istio.io/v1`.
- The Kubernetes Service port did not explicitly identify the protocol. Istio can auto-detect HTTP, but the official protocol selection guidance supports explicit selection with `name: <protocol>[-<suffix>]`, so the Service port was updated to `name: http`.
- The deprecation warning example used `deprecation: "true"`, which is not compliant with RFC 9745. The Deprecation header value must be a Structured Field Date, so it was changed to `@1780272000`.
- The Sunset header used the wrong weekday for June 1, 2026. `Sat, 01 Jun 2026 00:00:00 GMT` was corrected to `Mon, 01 Jun 2026 00:00:00 GMT`.
- The curl testing instructions did not state that the service DNS name and Istio routing rules apply from inside the mesh. The text was clarified to run the curl commands from a pod in the mesh in the same namespace.

## Review Notes
All YAML snippets were parsed locally after the edits. The local environment did not have `kubectl` installed, so the `kubectl logs -l app=user-api,version=v2 --tail=5` command was verified against the official Kubernetes kubectl logs reference instead.
