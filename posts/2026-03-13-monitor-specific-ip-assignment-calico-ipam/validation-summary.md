# Validation Summary: How to Monitor Specific IP Assignment with Calico IPAM

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.20+)
- Calico IPAM
- Kubernetes
- calicoctl CLI
- kubectl CLI

## Sources Consulted
- Calico documentation — calicoctl ipam check reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico documentation — IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation — calicoctl ipam show reference (general calicoctl reference)

## Issues Found
No technical issues found.

- `calicoctl get ippools -o yaml` — valid calicoctl command and output format flag.
- `calicoctl ipam show --show-blocks` — valid command and flag for showing IPAM allocations including block information.
- IPPool YAML with `apiVersion: projectcalico.org/v3`, `kind: IPPool`, and spec fields `cidr`, `blockSize`, `natOutgoing` — all valid per the IPPool resource reference. `blockSize: 26` is the IPv4 default and within the documented 20–32 range.
- `calicoctl ipam check -o ipam-report.json` — the `-o, --output=<FILE>` flag is valid for `calicoctl ipam check` and writes the report to the given file.
- `kubectl get pods -A -o wide` — standard kubectl command/flags.

## Review Notes
- The post is fairly high-level and could be expanded in the future with concrete examples of static/specific IP assignment (e.g., using the `cni.projectcalico.org/ipAddrs` pod annotation or IP reservations via the `IPReservation` CRD) to better match the title's "Specific IP Assignment" framing.
- Calico v3.20+ as a prerequisite is conservative and reasonable; the commands and resources shown remain valid on current Calico releases.
