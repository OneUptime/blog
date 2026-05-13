# Validation Summary: How to Optimize Floating IPs with Calico for Large Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.20+)
- Kubernetes
- calicoctl CLI
- kubectl CLI
- Calico IPAM / IPPool resource

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- calicoctl ipam command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/
- calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- kubectl get reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#get

## Issues Found
No technical issues found.

- `calicoctl get ippools -o yaml` is a valid command and flag.
- `calicoctl ipam show --show-blocks` is a valid command and flag.
- `calicoctl ipam check -o ipam-report.json` is a valid command; `-o` is the report output file path.
- `kubectl get pods -A -o wide` is valid kubectl syntax.
- The IPPool YAML uses the correct `apiVersion: projectcalico.org/v3`, `kind: IPPool`, and valid spec fields (`cidr`, `blockSize`, `natOutgoing`). A `/26` blockSize is valid for an IPv4 pool.
- The mermaid `graph LR` diagram is syntactically valid.

## Review Notes
- The post is shallow relative to its title and description. The title promises "Floating IPs" optimization and the description mentions "BGP advertisement and fast failover", but the body only demonstrates generic IPAM/IPPool inspection rather than Calico's floating IP feature (which involves `cni.projectcalico.org/floatingIPs` pod annotations and per-namespace/per-pod IP allocation). The technical content present is accurate, but the scope does not match the title — a future revision could add an actual floating IP example and BGP advertisement configuration.
- Calico v3.20 is quite old (released 2021). The commands and IPPool schema shown are still valid in current Calico versions, but readers on newer clusters may want to consider also configuring `allowedUses`, `assignmentMode`, or VXLAN/IPIP encapsulation fields that are commonly used in modern deployments.
