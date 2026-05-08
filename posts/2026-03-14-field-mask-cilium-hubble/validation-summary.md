# Validation Summary: How to Use Field Mask in Cilium Hubble

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Hubble
- Hubble Exporter
- Helm
- Kubernetes
- Python JSON processing

## Sources Consulted
- Cilium Hubble exporter configuration documentation: https://docs.cilium.io/en/stable/observability/hubble/configuration/export/
- Cilium Helm values documentation: https://docs.cilium.io/en/stable/helm-values/
- Cilium flow protocol documentation: https://docs.cilium.io/en/stable/_api/v1/flow/README/
- Cilium v1.15 Helm chart values: https://github.com/cilium/cilium/blob/v1.15.0/install/kubernetes/cilium/values.yaml
- Cilium v1.18 Helm chart values: https://github.com/cilium/cilium/blob/v1.18.0/install/kubernetes/cilium/values.yaml
- Cilium v1.18 flow proto: https://github.com/cilium/cilium/blob/v1.18.0/api/v1/flow/flow.proto

## Issues Found
- The prerequisites stated Cilium 1.15+, but the example places `fileMaxSizeMb` and `fileMaxBackups` under `hubble.export.static`, which matches the newer exporter-specific Helm layout available in Cilium 1.18+. Updated the prerequisite to Cilium 1.18+.
- The field masks used `drop_reason`, which is deprecated in the Cilium flow proto in favor of `drop_reason_desc`. Updated the examples and diagram to use `drop_reason_desc`.
- The field masks included `Summary`, which is deprecated in the Cilium flow proto. Removed it from the examples.
- The examples used `destination.port`, but `destination` is an endpoint object and does not contain a port field. Ports are represented under L4 protocol fields, so the examples now include `l4` or protocol-specific `l4.TCP`/`l4.UDP`/`l4.ICMPv4` fields.

## Review Notes
The remaining commands and Helm keys align with the current Cilium Hubble exporter documentation and Cilium 1.18+ chart layout. The storage reduction numbers are presented as typical estimates, not guarantees; actual event sizes depend on traffic mix, enabled L7 visibility, labels, and selected fields.
