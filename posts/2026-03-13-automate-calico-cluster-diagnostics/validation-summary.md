# Validation Summary: How to Automate Calico Cluster Diagnostics

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes
- kubectl
- Tigera Operator
- Bash

## Sources Consulted
- Calico documentation: Troubleshooting commands, including `kubectl get tigerastatus`, `kubectl get installation -o yaml`, and `calico-system` namespace guidance: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico documentation: `calicoctl get` supported resource types, including `felixconfiguration`, `bgpconfiguration`, `bgppeer`, `globalnetworkpolicy`, `networkpolicy`, `ippool`, and `ipreservation`: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: `calicoctl ipam show --show-blocks`: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico documentation: `calicoctl ipam check`: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico documentation: `calicoctl cluster diags`: https://docs.tigera.io/calico/latest/reference/calicoctl/cluster/diags
- Calico documentation: TigeraStatus expected `AVAILABLE`, `PROGRESSING`, and `DEGRADED` states: https://docs.tigera.io/calico/latest/getting-started/kubernetes/quickstart
- Kubernetes documentation: `kubectl logs` flags, including `--tail`, `--prefix`, `-c`, and `-l`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The diagnostic bundle description referenced comprehensive `calicoctl cluster diags` bundles, but the script did not invoke `calicoctl cluster diags`. Added a documented `calicoctl cluster diags --since=2h` capture to align the implementation with the stated diagnostic bundle behavior.
- The component log collection ran under `set -e` and could abort the whole bundle if an optional Calico component such as Typha had no matching pods. Added guarded redirects with `|| true` so the bundle still completes and captures the available diagnostics.
- The TigeraStatus health check only checked whether the `AVAILABLE` column was `True`. Updated it to also flag components where `PROGRESSING` is not `False` or `DEGRADED` is not `False`, matching the documented healthy TigeraStatus state.
- The IPAM inconsistency counter used `grep -c ... || echo 0`, which can produce two zero lines when there are no matches because `grep -c` prints `0` but exits non-zero. Replaced it with `grep -ci ... || true` so the numeric comparison receives a single integer.
- The pod health counter used `grep -cv "Running" || echo 0`, which has the same duplicate-zero problem when all pods are running. Replaced it with an `awk` counter against the pod `STATUS` column.

## Review Notes
The examples assume an operator-based Calico installation using the `calico-system` and `tigera-operator` namespaces. Calico documentation notes that manifest-based installations use `kube-system` for some examples, so readers on manifest-based installs may need to adjust namespaces.
