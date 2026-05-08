# Validation Summary: Validating Access Logging in Cilium Network Security

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Cilium proxylib L7 parsers
- Cilium access logging
- Hubble
- Kubernetes
- Go
- jq

## Sources Consulted
- Cilium Envoy/proxylib parser documentation: https://docs.cilium.io/en/stable/security/network/proxy/envoy/
- Cilium Layer 7 Protocol Visibility documentation: https://docs.cilium.io/en/stable/observability/visibility/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium proxy `Connection.Log` and `Connection` implementation: https://github.com/cilium/proxy/blob/main/proxylib/proxylib/connection.go
- Cilium proxy `ReaderParser` and `OnData` interface: https://github.com/cilium/proxy/blob/main/proxylib/proxylib/parserfactory.go
- Cilium proxy `Reader` implementation: https://github.com/cilium/proxy/blob/main/proxylib/proxylib/reader.go
- Cilium proxy R2D2 parser and tests: https://github.com/cilium/proxy/tree/main/proxylib/r2d2
- Cilium access log record model: https://github.com/cilium/cilium/blob/main/pkg/proxy/accesslog/record.go

## Issues Found
1. **Incorrect parser-side access log data type**: The examples used `accesslog.LogRecord` and fields such as `Verdict`, `Protocol`, `SourceIdentity`, and `DestinationIdentity`. Cilium proxylib parsers emit `cilium.LogEntry` values through `Connection.Log`, with fields such as `EntryType`, `SourceSecurityId`, `DestinationSecurityId`, `SourceAddress`, and `DestinationAddress`. Updated the test snippets accordingly.

2. **Incorrect verdict expectations in parser unit tests**: The examples treated parser log entries as Hubble/access-log verdict records (`VerdictForwarded`, `VerdictDenied`, `VerdictError`). Parser-side logging uses `cilium.EntryType_Request` and `cilium.EntryType_Denied`; Hubble later renders flow verdicts. Updated the checks to validate `EntryType`.

3. **Nonexistent test reader helper**: The snippets used `proxylib.NewTestReader`, which is not part of the current proxylib API. Replaced it with `proxylib.NewReader([][]byte{...}, false)` and passed the reader by pointer to `OnData`.

4. **Incorrect generic L7 field access**: The metadata example treated L7 fields as a direct map on the log entry. Current generic L7 data is retrieved from `entry.GetGenericL7()` and then checked via `generic.Proto` and `generic.Fields`. Updated the snippet.

5. **Incorrect timestamp validation**: The example parsed `entry.Timestamp` as an RFC3339 string, but proxylib sets a Unix-nanosecond timestamp on `cilium.LogEntry`. Changed the validation to check that the timestamp is nonzero and adjusted the UTC troubleshooting note to apply only to custom protocol-specific timestamp fields.

6. **Unsupported Hubble protocol filtering assumption**: The end-to-end command used `hubble observe --protocol myprotocol`. Hubble documents protocol filtering for known L4/L7 protocols, while a custom generic L7 protocol should be filtered from the JSON output. Removed the `--protocol myprotocol` flag and added a `jq` check against `flow.l7.generic_l7.proto`.

## Review Notes
- The overall guidance remains valid: Cilium L7 parser tests should cover allowed, denied, malformed, partial, and redaction-sensitive paths.
- Hubble L7 visibility requires traffic to be redirected through Cilium's L7 proxy, typically by L7 policy or visibility configuration.
- The snippets remain illustrative and assume local test helpers such as `newTestParser`, `newTestParserWithConnection`, and `makeMessage`.
