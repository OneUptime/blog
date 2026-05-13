# Validation Summary: How to Diagnose BGP Peer Not Established in Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- BGP
- BIRD
- calicoctl
- kubectl
- iptables

## Sources Consulted
- Calico `calicoctl node status` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico `calicoctl get` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico `calicoctl` resource aliases reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico BGP peering configuration: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico troubleshooting and diagnostics: https://docs.tigera.io/calico/latest/operations/troubleshoot/troubleshooting
- Calico troubleshooting commands namespace note: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico component logs: https://docs.tigera.io/calico/latest/operations/troubleshoot/component-logs
- RFC 4271, Border Gateway Protocol 4: https://www.rfc-editor.org/rfc/rfc4271

## Issues Found
- The BGP timer root-cause bullet described "timer mismatches" as causing session timeout. BGP hold timers are negotiated, so the more accurate issue is timers configured too aggressively. Updated the bullet accordingly.
- The log command assumed the `kube-system` namespace. Current Calico operator-based documentation uses `calico-system`, while manifest-based installs may use `kube-system`. Updated the command to use a `CALICO_NAMESPACE` variable with a note for manifest-based installs.

## Review Notes
The `calicoctl node status`, `calicoctl get bgppeer -o yaml`, `calicoctl get bgpconfig -o yaml`, TCP port 179 checks, and BIRD-based troubleshooting guidance match current Calico documentation for BGP-based Calico deployments. The post implicitly assumes Calico is running with BGP networking rather than VXLAN-only or eBPF-only routing, which is appropriate for the topic.
