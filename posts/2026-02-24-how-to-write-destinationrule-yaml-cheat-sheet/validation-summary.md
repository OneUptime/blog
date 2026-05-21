# Validation Summary: How to Write DestinationRule YAML (Cheat Sheet)

## Status
validated

## Post Type
Reference / Cheat Sheet

## Technologies Covered
- Istio DestinationRule
- Istio traffic management
- Kubernetes YAML custom resources
- Envoy load balancing, connection pools, outlier detection, and TLS settings

## Sources Consulted
- Istio Destination Rule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Traffic Management concepts: https://istio.io/latest/docs/concepts/traffic-management/

## Issues Found
- Corrected the short-name `host` explanation to clarify that Istio resolves short names based on the DestinationRule namespace, not the target service namespace.
- Corrected the "Round Robin (default)" heading and added that Istio's current default load balancer is least requests when no load balancer is specified.
- Renamed "Least Connections" to "Least Requests" because `LEAST_REQUEST` is the current Istio simple load-balancer value; `LEAST_CONN` is deprecated.
- Corrected the `PASSTHROUGH` description from "let the OS decide" to original-destination passthrough, matching Istio's documented behavior.
- Updated the final production-example description from "least-connection" to "least-request" load balancing.

## Review Notes
The YAML examples parse successfully. The post uses short service names for readability; Istio recommends fully qualified domain names in production to avoid namespace-related misconfiguration.
