# Validation Summary: How to Configure Hazelcast with IPv6

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Hazelcast IMDG (In-Memory Data Grid)
- IPv6 networking
- Java / JVM (system properties for networking)
- Hazelcast XML and YAML configuration formats
- Hazelcast Java Client
- Hazelcast REST Health Check API
- Linux `ss` command

## Sources Consulted
- Hazelcast Platform documentation — Network configuration: https://docs.hazelcast.com/hazelcast/latest/clusters/network-configuration
- Hazelcast Platform documentation — Discovery mechanisms / TCP-IP: https://docs.hazelcast.com/hazelcast/latest/clusters/discovery-mechanisms
- Hazelcast Platform documentation — Public address: https://docs.hazelcast.com/hazelcast/latest/clusters/network-configuration#public-address
- Hazelcast Platform documentation — Health Check: https://docs.hazelcast.com/hazelcast/latest/maintain-cluster/monitoring#health-check-api
- Hazelcast Java Client documentation — ClientConfig / ClientNetworkConfig
- Java SE Networking Properties (Oracle): `java.net.preferIPv4Stack`, `java.net.preferIPv6Addresses`
- RFC 3986 — URI Generic Syntax (bracket notation for IPv6 in `host:port` form)
- RFC 5952 — Recommendation for IPv6 Address Text Representation

## Issues Found

1. **Invalid JVM property `java.net.preferIPv6Stack`** — The post recommended `-Djava.net.preferIPv6Stack=true` for "IPv6-only environments". This is not a real Java system property. The standard JDK networking properties are `java.net.preferIPv4Stack` (default `false`) and `java.net.preferIPv6Addresses` (default `false`). Replaced with `-Djava.net.preferIPv4Stack=false` (with a note that this is the default) and updated the summary accordingly.

2. **Ambiguous `public-address` for IPv6 + port** — The XML and YAML examples used `2001:db8::10:5701` as `public-address`. Without brackets, this string parses as an IPv6 address itself (`5701` becomes a hex group of the address) rather than `2001:db8::10` plus port `5701`. Per Hazelcast and RFC 3986 conventions, IPv6 with a port must use bracket notation. Changed to `[2001:db8::10]:5701` in both XML and YAML.

3. **Misplaced `<member-address-provider>` element** — The XML put `<member-address-provider enabled="false"/>` inside `<tcp-ip>`. In the Hazelcast network XML schema, `member-address-provider` is a direct child of `<network>`, not of `<tcp-ip>`. Since it was disabled and adding nothing, it was removed entirely.

4. **REST health endpoint missing sub-path** — The verification step used `curl ... /hazelcast/health`. Hazelcast's REST health check exposes specific endpoints (`/hazelcast/health/node-state`, `/cluster-state`, `/cluster-safe`, `/migration-queue-size`, `/cluster-size`, `/ready`); a bare `/hazelcast/health` is not a documented endpoint. Changed to `/hazelcast/health/node-state` and updated the comment to mention the HEALTH_CHECK endpoint group rather than the management center.

## Review Notes

- The Hazelcast REST API is disabled by default in modern Hazelcast versions (5.x); enabling the `HEALTH_CHECK` endpoint group requires explicit configuration (`<rest-api enabled="true">` with the endpoint group enabled, or `hazelcast.properties`). The post's curl example assumes this is enabled, which is consistent with the inline comment.
- The XML namespace declaration omits the schema version (`http://www.hazelcast.com/schema/config/hazelcast-config-X.Y.xsd`). This is permitted but version-pinning the schema would aid validation in tooling. Not a correctness issue.
- The `interfaces` block binds to the literal address `2001:db8::10`. In real deployments using stateless address autoconfiguration or ULA prefixes, operators should adapt this to their actual prefix. The `2001:db8::/32` documentation prefix used throughout is the correct choice for examples (RFC 3849).
- `java -jar hazelcast.jar` is illustrative; modern Hazelcast distributions ship a `bin/hz-start` script (or the container image entrypoint) which handles classpath setup. The post's approach still works but is not the typical user-facing entry point.
