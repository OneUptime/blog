# Validation Summary: How to Set Up ServiceEntry for External Database Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio ServiceEntry
- Istio DestinationRule
- Kubernetes
- Envoy sidecar proxying
- PostgreSQL
- MySQL / Google Cloud SQL
- TCP and TLS database connectivity

## Sources Consulted
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio protocol selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio egress TLS origination task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-tls-origination/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- PostgreSQL frontend/backend protocol, SSL session encryption: https://www.postgresql.org/docs/current/protocol-flow.html
- MySQL client/server connection phase: https://dev.mysql.com/doc/dev/mysql-server/latest/page_protocol_connection_phase.html
- Google Cloud SQL instance DNS / connection information: https://cloud.google.com/sql/docs/mysql/instance-info

## Issues Found
- The TLS section incorrectly advised setting PostgreSQL-style TLS-encrypted database traffic to `protocol: TLS`. PostgreSQL and MySQL normally negotiate TLS inside their database handshakes, so Envoy should generally treat this traffic as opaque `TCP`. Updated the example and explanation to keep `protocol: TCP` for native database TLS.
- The TLS origination example implied Envoy could generally originate TLS for plaintext database clients. That only works when the upstream endpoint expects an immediate TLS handshake. Added that constraint to avoid implying native PostgreSQL/MySQL TLS negotiation is handled by a simple DestinationRule.
- The debugging section claimed that running `curl telnet://...` from the application container bypassed the sidecar. Traffic from an injected pod still goes through the sidecar, so the command was changed to run a temporary pod with sidecar injection disabled.
- The port naming section overstated Istio's requirement. Istio uses port names for protocol selection when protocol is not otherwise specified, while ServiceEntry examples also set `protocol: TCP`. Updated the wording to describe the `tcp-` prefix as explicit protocol selection in the port name.

## Review Notes
- All YAML snippets parse successfully.
- `istioctl` was not installed in the local workspace, so CLI command validation was performed against the official Istio command reference.
- The DestinationRule connection pool and outlier detection fields are current in Istio's `networking.istio.io/v1` API.
