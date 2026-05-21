# Validation Summary: How to Set Up API Versioning Strategy with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Istio traffic routing and weighted routing
- Kubernetes Deployments and Services
- HTTP request and response headers
- HTTP Deprecation, Sunset, and Link headers
- curl

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- RFC 9745, The Deprecation HTTP Response Header Field: https://www.rfc-editor.org/rfc/rfc9745.html
- RFC 8594, The Sunset HTTP Header Field: https://www.rfc-editor.org/rfc/rfc8594.html
- RFC 9110, HTTP Semantics date/time format: https://www.rfc-editor.org/rfc/rfc9110.html
- IANA Link Relation Types registry: https://www.iana.org/assignments/link-relations/link-relations.xhtml

## Issues Found
- The query parameter section incorrectly stated that Istio does not natively support query parameter matching in VirtualService and required an EnvoyFilter workaround. Istio VirtualService supports `queryParams` on `HTTPMatchRequest`, so the example was replaced with native query parameter matching.
- The `Deprecation` response header example used `"true"`, but RFC 9745 defines the header as a Structured Field date value. It was changed to an RFC-compliant date value, `@1780272000`.
- The `Sunset` response header example used `Sat, 01 Jun 2026 00:00:00 GMT`, but June 1, 2026 is a Monday. It was corrected to `Mon, 01 Jun 2026 00:00:00 GMT`.

## Review Notes
The remaining Istio examples use current `networking.istio.io/v1` resources and match documented VirtualService and DestinationRule fields. The `successor-version` link relation is registered with IANA and is appropriate for pointing clients at the next API version.
