# Validation Summary: How to Troubleshoot Field Mask in Cilium Hubble

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Hubble exporter
- Hubble CLI
- Kubernetes
- Helm
- JSON
- Python

## Sources Consulted
- Cilium Hubble exporter configuration documentation: https://docs.cilium.io/en/stable/observability/hubble/configuration/export/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium flow protocol documentation: https://docs.cilium.io/en/stable/_api/v1/flow/README/
- Cilium v1.19.3 `flow.proto`: https://github.com/cilium/cilium/blob/v1.19.3/api/v1/flow/flow.proto
- Cilium v1.19.3 Hubble field mask implementation and tests: https://github.com/cilium/cilium/tree/v1.19.3/pkg/hubble/parser/fieldmask
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The post said `l4.TCP.flags.SYN` was an invalid field mask path and recommended masking the entire TCP object instead. Cilium validates nested protobuf field paths, and its field mask tests cover nested oneof paths such as `l4.TCP.destination_port`; the TCP flags are fields in the `TCPFlags` protobuf message. I changed the example to show `l4.TCP.flags.SYN` as valid and clarified that `l4.TCP` is appropriate when ports and flags are both needed.
- The parser-required field mask example used `destination.port`, but `destination` is an `Endpoint` message and has no `port` field. I replaced it with `l4.TCP.destination_port` and `l4.UDP.destination_port`.
- The examples used `drop_reason`, which is deprecated in the flow protobuf in favor of `drop_reason_desc`. I updated the field list and YAML example to use `drop_reason_desc`.

## Review Notes
The remaining commands and configuration patterns match current Cilium documentation for the static Hubble exporter. Static exporter changes are tied to the Cilium agent lifecycle, while Cilium also has dynamic exporter configuration for cases where restarts should be avoided.
