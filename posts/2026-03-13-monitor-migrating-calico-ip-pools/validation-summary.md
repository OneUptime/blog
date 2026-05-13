# Validation Summary: Monitor Migrating Calico IP Pools

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.27+)
- Calico IPAM
- `calicoctl` CLI
- Kubernetes
- `kubectl` CLI
- Bash scripting

## Sources Consulted
- Calico documentation - Migrate from one IP pool to another: https://docs.tigera.io/calico/latest/networking/ipam/migrate-pools
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- calicoctl command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/
- `calicoctl ipam show` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- kubectl reference (rollout restart, rollout status, get pods -o wide): https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
No technical issues found.

The migration workflow (add new pool, disable old pool, recreate workloads, remove old pool) matches the official Calico documentation exactly. The IPPool YAML manifest uses correct `projectcalico.org/v3` apiVersion with valid fields (`cidr`, `blockSize`, `encapsulation`, `natOutgoing`, `disabled`, `nodeSelector`). `nodeSelector: all()` is the correct Calico selector syntax. `encapsulation: VXLAN` is a valid value. `blockSize: 26` is the default for IPv4 and within the valid range.

All `calicoctl` commands (`create -f`, `apply -f`, `get ippools -o wide`, `get ippool ... -o yaml`, `ipam show --show-blocks`, `delete ippool`) are accurate. The `kubectl` commands (`run`, `get pod ... -o jsonpath`, `delete pod`, `get pods -A -o wide --no-headers`, `rollout restart deployment`, `rollout status deployment --timeout=5m`) are syntactically correct and use current flags. The awk `$7` extraction correctly targets the IP column in `kubectl get pods -A -o wide` output (columns: NAMESPACE, NAME, READY, STATUS, RESTARTS, AGE, IP, NODE, ...).

## Review Notes
- `kubectl rollout restart deployment -n $ns` only restarts Deployments; StatefulSets, DaemonSets, and standalone Pods would also need to be restarted to fully migrate a cluster. The post focuses on Deployments which is the common case, but readers with mixed workload types should adapt the script.
- The substring grep on `192.168` could in rare cases produce false positives if other fields contain that substring, though for IP-column-anchored grep (`^192.168`) in Step 3 it is fine. The Step 5 `grep "192.168"` is unanchored — acceptable for verification but slightly looser than ideal.
- `kubectl get pod migration-test -o jsonpath='{.status.podIP}'` immediately after `kubectl run` may return an empty value if the pod hasn't been scheduled yet; in practice users may need a short wait or `--wait` semantics, but this isn't strictly a technical error.
- The post correctly states that disabling a pool only prevents new allocations and does not evict existing pods, which matches Calico's documented behavior.
