# Validation Summary: How to Validate Calico VPP Troubleshooting Configurations

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Calico VPP dataplane
- Kubernetes
- kubectl
- FD.io VPP debug CLI
- VPP FIB, CNAT, interfaces, and error counters

## Sources Consulted
- Calico VPP troubleshooting documentation: https://docs.tigera.io/calico/latest/operations/troubleshoot/vpp
- Calico VPP implementation details: https://docs.tigera.io/calico/latest/reference/vpp/technical-details
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#get
- FD.io VPP CNAT CLI reference: https://docs.fd.io/vpp/22.06.1/cli-reference/clis/clicmd_src_plugins_cnat.html
- FD.io VPP NAT44 CLI reference: https://wiki.fd.io/view/VPP/NAT
- FD.io VPP VLIB CLI reference for error counters: https://docs.fd.io/vpp/23.10/cli-reference/clis/clicmd_src_vlib.html

## Issues Found
- The post described pod workload interfaces as `tap` interfaces and counted interfaces with `grep -c "^tap"`. Calico VPP troubleshooting output and implementation examples use workload `tun` interfaces, so the post now refers to `tun` interfaces and counts `^tun`.
- The FIB validation text said routes should point to a tap interface and that `calico-vpp-manager` programs routes. Updated this to a tun interface and `calico-vpp-agent`, which is the Calico-specific runtime configuration component.
- The service routing validation used `show nat44 static mappings`. VPP CNAT is the relevant command family for Calico VPP service translations, so the command now uses `show cnat translation "${SERVICE_IP}"`.
- The description, introduction, diagram, and conclusion referred to NAT service mappings. Updated these to CNAT service mappings to match the corrected VPP command.
- The error-counter grep filtered output unreliably and the text equated all non-zero counters with packet drops. Updated the command to select non-zero numeric counters with `awk`, and softened the explanation because VPP error counters can include counters that need interpretation rather than always proving drops.

## Review Notes
The `kubectl exec`, `kubectl get`, JSONPath output, namespace, container selection, and field-selector usage are consistent with Kubernetes CLI documentation. The VPP pod discovery command assumes the deployment has an `app=calico-vpp-node` label; Calico documentation commonly identifies these pods by the `calico-vpp-node-` name prefix, so future improvements could make pod discovery more tolerant across manifest versions.
