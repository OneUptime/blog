# Validation Summary: Runbook: Calico Pods Cannot Reach External Services

## Status
validated

## Post Type
On-call Runbook / Operational Guide

## Technologies Covered
- Calico (IPPool, GlobalNetworkPolicy, calicoctl, Felix)
- Kubernetes (kubectl, DaemonSet, Deployment, NetworkPolicy)
- CoreDNS
- iptables (cali-nat-outgoing chain)
- BusyBox (wget, nslookup)
- Mermaid (flowchart diagram)

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- calicoctl patch command: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico natOutgoing and IP pool configuration docs
- Kubernetes kubectl run / kubectl rollout reference: https://kubernetes.io/docs/reference/kubectl/
- CoreDNS in Kubernetes (label `k8s-app=kube-dns` is retained for backward compatibility): https://kubernetes.io/docs/tasks/administer-cluster/coredns/
- BusyBox wget options (supports `-T SEC` and `--timeout` long form in current busybox versions)
- Mermaid flowchart syntax (multi-node convergence with `&` operator)

## Issues Found
No technical issues found.

Verification details:
- `calicoctl patch ippool default-ipv4-ippool --patch='{"spec":{"natOutgoing":true}}'` — correct calicoctl syntax; `--patch` is a valid long flag.
- `apiVersion: projectcalico.org/v3` and `kind: GlobalNetworkPolicy` — correct API group and kind.
- `selector: all()`, `order: 10`, and `destination.notNets` — all valid GlobalNetworkPolicy fields; lower `order` value gives higher precedence, which matches the runbook's intent.
- `kubectl get pods -n kube-system -l k8s-app=kube-dns` — correct; CoreDNS deployments retain the `k8s-app=kube-dns` label for backward compatibility with kube-dns.
- `kubectl run ... --restart=Never` — still valid in current kubectl (Pod creation with restartPolicy=Never).
- BusyBox `wget -qO- --timeout=5` — valid; busybox wget exposes `--timeout` as a long option for `-T SEC`.
- `cali-nat-outgoing` iptables chain — correct name programmed by Calico Felix when natOutgoing is enabled.
- Mermaid `D & G & J & K --> L` — valid converging-edges syntax.

## Review Notes
- After `kubectl run --restart=Never`, the pod may not be Ready immediately, so the subsequent `kubectl exec` could transiently fail in real incidents. A `kubectl wait --for=condition=Ready pod/triage-test --timeout=30s` would make the runbook more robust, but the current commands are not technically incorrect.
- Similarly, `kubectl logs verify-test` immediately after `kubectl run` may race the pod's container start; in practice an on-call engineer would retry, so it's acceptable.
- `http://1.1.1.1` does respond on port 80 (it redirects to `one.one.one.one`), so `wget -qO- http://1.1.1.1` is a reasonable external reachability probe.
- The emergency policy uses `notNets` to exclude RFC1918 ranges, which correctly scopes "external" egress and avoids overriding intra-cluster deny rules; this is the standard pattern.
