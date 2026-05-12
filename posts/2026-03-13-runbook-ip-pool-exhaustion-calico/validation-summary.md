# Validation Summary: Runbook: IP Pool Exhaustion in Calico

## Status
validated

## Post Type
Runbook / Operations Guide

## Technologies Covered
- Calico (CNI plugin)
- calicoctl (Calico CLI)
- Kubernetes IPAM
- kubectl

## Sources Consulted
- Calico `calicoctl ipam` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/
- Calico `calicoctl ipam check`: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico `calicoctl ipam show`: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico `calicoctl ipam release`: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico IPPool resource (projectcalico.org/v3): https://docs.tigera.io/calico/latest/reference/resources/ippool
- Kubernetes `kubectl run` / `kubectl wait` documentation

## Issues Found
No technical issues found.

- `calicoctl ipam show` and `calicoctl ipam check` are correct subcommands for diagnosing pool usage and identifying leaks.
- `calicoctl ipam release --ip=<ip>` uses the correct flag syntax for releasing a single leaked address.
- The IPPool manifest uses the correct `apiVersion: projectcalico.org/v3`, `kind: IPPool`, and valid spec fields (`cidr`, `ipipMode: Always`, `natOutgoing`, `disabled`). `Always` is a valid value for `ipipMode` (alongside `CrossSubnet` and `Never`).
- `calicoctl apply -f -` from a heredoc is a valid invocation pattern.
- `kubectl run --image=busybox --restart=Never`, `kubectl wait --for=condition=Ready`, and `kubectl get pod -o wide` are all current and correct.

## Review Notes
- The example emergency pool uses CIDR `192.168.0.0/16`, which is also the default CIDR for Calico's initial `default-ipv4-ippool`. In practice the operator must pick a CIDR that does not overlap with any existing pool or the cluster service/pod CIDR — the post implicitly assumes this. Worth flagging in future revisions.
- Adding a pool with `ipipMode: Always` mixes IP-in-IP encapsulation into the cluster. If the existing pool uses VXLAN or `CrossSubnet`, operators should match the existing encapsulation rather than blindly using `Always` to avoid asymmetric routing behavior.
- The "post-incident: rename emergency pool" guidance is slightly aspirational — Calico IPPool names are immutable after creation; renaming requires creating a new pool, disabling the old one, and migrating workloads. Not technically incorrect (the post just says "plan migration"), but worth being explicit about in future revisions.
- The `calicoctl ipam check` output for leak release expects the operator to parse leaked IPs manually; recent `calicoctl` versions also support `--show-problem-ips` and `--show-all-ips` flags that can simplify this workflow.
