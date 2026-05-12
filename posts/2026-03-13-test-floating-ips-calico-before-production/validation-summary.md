# Validation Summary: How to Test Floating IPs with Calico Before Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.20+)
- Kubernetes
- calicoctl CLI
- kubectl CLI
- Calico IPAM (IP Pools, blocks)

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- calicoctl ipam command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/
- calicoctl ipam check: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- calicoctl ipam show: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico floating IPs feature: https://docs.tigera.io/calico/latest/networking/ipam/use-specific-ip

## Issues Found
No technical issues found. All commands, flags, and YAML schema fields verified against the official Calico documentation:
- `calicoctl get ippools -o yaml` — valid
- `calicoctl ipam show --show-blocks` — valid; `--show-blocks` is a documented option
- `calicoctl ipam check -o ipam-report.json` — valid; `-o` writes the JSON report to the specified file
- IPPool manifest uses correct `apiVersion: projectcalico.org/v3`, `kind: IPPool`, and the `cidr`, `blockSize`, and `natOutgoing` fields
- `kubectl get pods -A -o wide` — standard kubectl syntax

## Review Notes
- The post's title and description promise coverage of floating IP failover behavior, but the body demonstrates generic IPAM/IP Pool inspection rather than the floating-IPs feature itself (which in Calico is enabled via `FelixConfiguration.floatingIPs: Enabled` and the `cni.projectcalico.org/floatingIPs` pod annotation). The technical content shown is accurate; the scope mismatch is a content/structural concern outside the scope of technical-correctness fixes, so no changes were made per the review instructions ("Do not add new sections, restructure the post, or make stylistic changes").
- `blockSize: 26` matches the IPv4 default and is valid.
- Calico v3.20+ supports all features and fields referenced.
