# Validation Summary: How to Choose a Virtual IP Address for Talos Linux

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Talos Linux (Virtual IP / VIP feature)
- Kubernetes (API server endpoint, kubeconfig)
- Networking: ARP / gratuitous ARP, Layer 2 / broadcast domains, VLANs, subnets
- DHCP (ISC DHCP server)
- DNS
- IPAM tools (NetBox, phpIPAM)
- CLI tooling: `talosctl`, `kubectl`, `ping`, `arp`, `nmap`

## Sources Consulted
- Talos Linux VIP guide: https://www.talos.dev/v1.7/talos-guides/network/vip/ (redirects to https://docs.siderolabs.com/talos/v1.7/networking/vip/)
- Talos v1alpha1 configuration reference: https://www.talos.dev/v1.7/reference/configuration/v1alpha1/config/ (redirects to https://docs.siderolabs.com/talos/v1.7/reference/configuration/v1alpha1/config/)

## Issues Found
- **VLAN configuration example was structurally incorrect.** The post originally used a top-level interface named `eth0.100` with a singular `vlan:` block (with `vlanId` nested inside), and placed `addresses` and `vip` at the interface level. The Talos v1alpha1 schema does not have a `vlan` (singular) field on an interface — VLAN sub-interfaces are configured via a `vlans:` array on the parent physical interface, where each entry holds its own `vlanId`, `addresses`, and `vip`. I rewrote the VLAN example to use the correct nested structure:

  ```yaml
  machine:
    network:
      interfaces:
        - interface: eth0
          vlans:
            - vlanId: 100
              addresses:
                - 10.100.0.10/24
              vip:
                ip: 10.100.0.50
  ```

  This matches the official `v1alpha1` schema and the example shown in the Talos networking reference.

## Review Notes
- The post states "VIP failover in Talos Linux uses gratuitous ARP to announce the IP to the network." This is accurate for the network-announcement step (GARP is sent so neighbors update their ARP caches), but the actual leader election among control plane nodes is performed via etcd, not ARP. The post's statement is still technically correct as written (it describes the announcement mechanism, not the election), and the resulting Layer 2 requirement it derives is right, so no edit was made.
- The ISC DHCP "dummy MAC" reservation example (using `00:00:00:00:00:00`) is a workable but non-ideal pattern for excluding an IP from a pool; a `range` exclusion would be cleaner. Left as-is since it is a common illustrative approach and not technically wrong.
- The Talos `vip` block also supports cloud-provider sub-fields (`equinixMetal`, `hcloud`) not covered here — fine to omit for a guide focused on the on-prem use case.
- VIP and Talos config field names verified against the v1.7 docs; the basic `machine.network.interfaces[].vip.ip` structure used throughout the post is correct.
- `talosctl apply-config --file` and `kubectl config set-cluster --server=` syntax verified as current.
