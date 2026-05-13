# Validation Summary: Document Calico VPP Technical Details for Operators

## Status
validated

## Post Type
Reference / operations guide

## Technologies Covered
- Calico VPP dataplane
- Kubernetes ConfigMaps and kubectl JSONPath output
- FD.io VPP
- DPDK
- Mermaid diagrams
- Bash scripting

## Sources Consulted
- Calico VPP primary interface configuration: https://docs.tigera.io/calico/latest/reference/vpp/uplink-configuration
- Calico VPP technical details: https://docs.tigera.io/calico/latest/reference/vpp/technical-details
- Calico VPP v3.27.0 generated manifest: https://raw.githubusercontent.com/projectcalico/vpp-dataplane/v3.27.0/yaml/generated/calico-vpp.yaml
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- FD.io VPP packet processing graph documentation: https://fd.io/docs/vpp/v2101/whatisvpp/extensible.html
- FD.io VPP 23.06 release notes: https://docs.fd.io/vpp/23.06/aboutvpp/releasenotes/v23.06.html
- FD.io VPP configuration reference: https://docs.fd.io/vpp/25.06/configuration/reference.html

## Issues Found
- The startup configuration export script used a single-quoted heredoc, so `$(date)` and `$(kubectl ...)` would be written literally instead of executed. I changed it to a command group that uses `printf` for headers and runs `kubectl` normally.
- The script referenced `.data.VPP_STARTUP_CONF`, but the Calico VPP v3.27.0 manifest uses `CALICOVPP_CONFIG_TEMPLATE` for the startup configuration template. I changed the JSONPath expression to `.data.CALICOVPP_CONFIG_TEMPLATE`.
- The script wrote into `docs/vpp/` without ensuring the directory exists. I added `mkdir -p docs/vpp`.

## Review Notes
- The performance thresholds and capacity-planning numbers are presented as example operator baselines, not universal Calico VPP defaults. Future revisions should label them as environment-specific and tie them to measured hardware, traffic mix, VPP worker count, and driver mode.
