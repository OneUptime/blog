# Validation Summary: Troubleshooting Access Logging in Cilium Network Security

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Cilium proxylib Go extensions
- Cilium L7 policy and Envoy proxying
- Hubble and Hubble CLI
- Kubernetes CLI workflows
- Go

## Sources Consulted
- Cilium Go Extensions and access logging guide: https://docs.cilium.io/en/stable/security/network/proxy/envoy/
- Cilium Layer 7 Protocol Visibility documentation: https://docs.cilium.io/en/stable/observability/visibility/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium command reference for `cilium-dbg monitor`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- Cilium command reference index for `cilium-dbg envoy admin` and related in-agent commands: https://docs.cilium.io/en/stable/cmdref/
- Cilium/Hubble flow API documentation: https://docs.cilium.io/en/stable/_api/v1/flow/README/
- Cilium proxy `proxylib.Connection.Log` Go package reference: https://pkg.go.dev/github.com/cilium-team/cilium/proxylib/proxylib
- Cilium proxy access-log protobuf source: https://raw.githubusercontent.com/cilium/proxy/main/go/cilium/api/accesslog.pb.go
- Cilium proxy r2d2 parser example: https://raw.githubusercontent.com/cilium/proxy/main/proxylib/r2d2/r2d2parser.go

## Issues Found
1. **Incorrect in-agent Cilium CLI commands.** The post used `cilium bpf proxy list`, `cilium endpoint list`, `cilium monitor`, and `cilium status` inside the Cilium DaemonSet. Current Cilium in-agent troubleshooting commands are exposed through `cilium-dbg`; `cilium bpf proxy list` is not a documented current command. Updated the examples to use `cilium-dbg status`, `cilium-dbg envoy admin listeners`, `cilium-dbg endpoint list`, `cilium-dbg monitor --type l7`, and `cilium-dbg status`.

2. **Incorrect proxylib parser API.** The Go snippets used `OnData(reply bool, reader *proxylib.Reader)`, `accesslog.LogRecord`, `accesslog.FlowVerdict`, `accesslog.VerdictForwarded`, and `accesslog.VerdictDenied`. Current Cilium proxylib parser examples use `OnData(reply, endStream bool, dataArray [][]byte)` and emit parser access logs with `p.connection.Log(entryType, &cilium.LogEntry_GenericL7{...})`. Updated the code snippets to use `cilium.EntryType_Request`, `cilium.EntryType_Response`, `cilium.EntryType_Denied`, and `cilium.L7LogEntry`.

3. **Incorrect advice to call `accesslog.Log()` from custom parsers.** The parser-side API is `p.connection.Log`; the access-log client is framework-side plumbing. Updated the troubleshooting guidance and performance example to avoid bypassing proxylib's access-log path.

4. **Questionable custom protocol filtering in Hubble examples.** The post used `hubble observe --protocol myprotocol`. Official examples document protocol filters for known L7 protocols such as HTTP, and Hubble's flow API primarily models DNS, HTTP, and Kafka L7 fields. Removed the custom `--protocol myprotocol` filter from generic troubleshooting commands and kept `--type l7` plus JSON inspection.

5. **Envoy admin metrics access path was too specific.** The post curled `localhost:9901/stats` from the Cilium agent container, which is not the current documented Cilium troubleshooting path for Envoy admin access. Updated it to `cilium-dbg envoy admin metrics`.

## Review Notes
- The post remains a generic custom-protocol troubleshooting guide. Exact JSON field names for custom L7 log rendering can vary by Cilium/Hubble version, so future improvements should test examples against the specific Cilium version targeted by the article.
