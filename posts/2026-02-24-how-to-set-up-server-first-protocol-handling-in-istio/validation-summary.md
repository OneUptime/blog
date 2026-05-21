# Validation Summary: How to Set Up Server First Protocol Handling in Istio

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Istio sidecar traffic management
- Envoy protocol detection
- Kubernetes Services and pod annotations
- Istio ServiceEntry and DestinationRule resources
- TCP server-first protocols such as MySQL, SMTP, and FTP

## Sources Consulted
- Istio Protocol Selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio Application Requirements, Server First Protocols: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio Resource Annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio DestinationRule reference: https://preliminary.istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio MeshConfig API source for protocolDetectionTimeout comments: https://raw.githubusercontent.com/istio/api/master/mesh/v1alpha1/config.proto
- PostgreSQL Frontend/Backend Protocol, Message Flow: https://www.postgresql.org/docs/current/protocol-flow.html
- MySQL Client/Server Protocol, Connection Phase: https://dev.mysql.com/doc/dev/mysql-server/latest/page_protocol_connection_phase.html
- RFC 5321, SMTP command/reply sequencing: https://www.rfc-editor.org/rfc/rfc5321
- RFC 959, FTP command/reply sequencing: https://www.rfc-editor.org/rfc/rfc959.html

## Issues Found
- The post listed PostgreSQL as a server-first protocol. PostgreSQL's official protocol documentation says the frontend opens a connection and sends a startup message first, so I removed PostgreSQL from the server-first examples and replaced the PostgreSQL configuration examples with MySQL/FTP examples.
- The post recommended `protocolDetectionTimeout: 0s` as a way to disable protocol sniffing. Istio's current API comments describe `0s` as disabling the timeout, not protocol detection. I corrected the timeout section to explain that this is not the recommended fix and that explicit `TCP` protocol selection is the correct approach for server-first traffic.
- The post described per-workload traffic-capture annotations as protocol detection configuration. Istio documents these annotations as traffic redirection controls, so I clarified that they control sidecar interception, not protocol detection.
- The post suggested using MySQL/MongoDB-specific protocol prefixes as the main server-first fix. Istio documents those protocol labels as experimental application protocol support, while its server-first guidance says to declare the application protocol as `TCP`. I changed the examples and conclusion to use `tcp-*` port names.
- Verification and test commands still referenced PostgreSQL port `5432`. I updated them to use MySQL port `3306` to match the corrected examples.

## Review Notes
The examples use the current stable Istio networking API version `networking.istio.io/v1`, valid Kubernetes Service port naming, and documented `istioctl proxy-config` / `istioctl experimental describe service` command forms. The YAML snippets were parsed successfully after edits.
