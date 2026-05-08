# Validation Summary: Securing Access Logging in Cilium Network Security

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Cilium
- Cilium proxylib L7 parsers
- Cilium access logging
- Hubble CLI and Hubble metrics
- Kubernetes
- Go

## Sources Consulted
- Cilium documentation: Envoy and proxylib access logging, including `p.connection.Log()` examples: https://docs.cilium.io/en/stable/security/network/proxy/envoy/
- Cilium documentation: Layer 7 Protocol Visibility and Hubble redaction notes: https://docs.cilium.io/en/stable/observability/visibility/
- Cilium documentation: Hubble CLI examples and verdict filtering: https://docs.cilium.io/en/stable/observability/hubble/hubble-cli/
- Cilium documentation: Hubble metrics Helm configuration and `httpV2` metric guidance: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium command reference: `cilium-dbg monitor` and supported `--type l7` filter: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- Cilium command reference: `cilium-dbg config`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg/
- Cilium source: R2D2 proxylib parser access logging example: https://github.com/cilium/cilium/blob/v1.6.12/proxylib/r2d2/r2d2parser.go
- Cilium source: proxylib connection logger implementation: https://github.com/cilium/cilium/blob/v1.6.12/proxylib/proxylib/connection.go
- Cilium source: access log protobuf entry types: https://github.com/cilium/cilium/blob/v1.6.12/vendor/github.com/cilium/proxy/go/cilium/api/accesslog.pb.go
- Cilium source: Hubble observe protocol, verdict, and output flags: https://github.com/cilium/cilium/blob/main/hubble/cmd/observe/flows.go

## Issues Found
- The original Go examples used `github.com/cilium/cilium/proxylib/accesslog`, `accesslog.LogRecord`, and `accesslog.Log()`, which do not match the proxylib parser API documented by Cilium. Updated the examples to use `p.connection.Log()` with `cilium.LogEntry_GenericL7` and `cilium.EntryType_*`.
- The original examples referenced non-existent proxylib connection fields such as `SrcIdentity`, `DstIdentity`, `SrcEndpoint`, and `DstEndpoint`. Removed manual connection metadata population because proxylib's `Connection.Log()` adds timestamp, direction, policy, security IDs, and addresses.
- The original examples used `accesslog.FlowVerdict` to represent allow/deny decisions. Replaced this with `allowed bool` mapped to `EntryType_Request`, `EntryType_Response`, or `EntryType_Denied`, matching the Cilium access log protobuf.
- Hubble commands filtered with `--protocol myprotocol` and `--verdict DENIED`. Current Hubble examples and source use flow verdict values such as `DROPPED`, and the CLI protocol completions are built around supported L4/L7 protocol names. Updated the commands to use `--type l7`, `-o jsonpb`, and `--verdict DROPPED`.
- The Hubble configuration snippet used ConfigMap-style keys including `hubble-metrics-enabled` and the deprecated `http` metric. Replaced it with Helm values using `hubble.enabled`, `hubble.metrics.enabled`, and `httpV2`.
- Cilium CLI commands used `cilium config` and `cilium monitor`; current Cilium command reference documents these as `cilium-dbg config` and `cilium-dbg monitor`. Updated both commands.
- The sensitive-field filtering example did not apply log-injection sanitization to retained values. Updated it to call `sanitizeLogField()` before logging non-redacted client-controlled values.
- The description claimed the post covered log rotation and tamper detection, but the content did not implement those topics. Narrowed the description to structured formatting and careful field selection.

## Review Notes
The post remains a high-level guide for Cilium proxylib-style L7 parser access logging. Hubble's exact rendering of custom generic L7 fields can vary by Cilium/Hubble version and parser integration, so future revisions should test the custom protocol against the specific Cilium release being targeted.
