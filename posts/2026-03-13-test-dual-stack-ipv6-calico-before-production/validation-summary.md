# Validation Summary: How to Test Dual-Stack IPv6 with Calico Before Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.20+)
- Kubernetes
- IPv6 / Dual-Stack networking
- calicoctl CLI
- kubectl CLI

## Sources Consulted
- Calico official documentation: https://docs.tigera.io/calico/latest/
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico calicoctl reference: https://docs.tigera.io/calico/latest/reference/calicoctl/
- Calico dual-stack documentation: https://docs.tigera.io/calico/latest/networking/ipam/ipv6
- Kubernetes Dual-Stack documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/

## Issues Found
No technical issues found. The technical content present in the post is accurate:
- `calicoctl get ippools -o yaml` is a valid command.
- `calicoctl get bgpconfiguration -o yaml` is a valid command.
- `calicoctl ipam check` is a valid command (available in Calico v3.x).
- `kubectl get svc -A` is a valid command.
- The IPPool resource uses the correct `apiVersion: projectcalico.org/v3` and `kind: IPPool`.
- The IPPool spec fields (`cidr`, `natOutgoing`) are valid.

## Review Notes
- The post's example IPPool uses an IPv4 CIDR (`10.48.0.0/16`) rather than demonstrating an IPv6 or dual-stack pool. A future revision could include an IPv6 IPPool example (e.g., `cidr: fd00:10:48::/64`) and reference enabling dual-stack on the cluster (kube-apiserver/kube-controller-manager `--service-cluster-ip-range` and `--cluster-cidr` accepting comma-separated IPv4 and IPv6 ranges, plus `FELIX_IPV6SUPPORT=true` on the Calico node). However, what is present is not technically incorrect — only thin relative to the post title.
- The content is minimal/sparse. The post would benefit in a future revision from concrete steps that actually exercise dual-stack: enabling IPv6 in `kubeadm` or kube-apiserver flags, creating both IPv4 and IPv6 IPPools, deploying a test workload with `ipFamilyPolicy: PreferDualStack`, and verifying that pods receive both address families.
- Calico v3.20+ as a prerequisite is reasonable; dual-stack support has been available in Calico since v3.18 (announced GA in later releases), so the version constraint is conservatively safe.
