# Validation Summary: How to Configure Whereabouts CNI for IPv6 IPAM in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Whereabouts CNI IPAM plugin
- Multus CNI (NetworkAttachmentDefinition via `k8s.cni.cncf.io/v1`)
- Kubernetes (CRDs, CronJob, Pods)
- IPv6 addressing
- macvlan / ipvlan CNI plugins
- Kubernetes IPPool and OverlappingRangeIPReservation CRDs

## Sources Consulted
- Whereabouts repository: https://github.com/k8snetworkplumbingwg/whereabouts
- IPPool CRD: https://raw.githubusercontent.com/k8snetworkplumbingwg/whereabouts/master/doc/crds/whereabouts.cni.cncf.io_ippools.yaml
- OverlappingRangeIPReservation CRD: https://raw.githubusercontent.com/k8snetworkplumbingwg/whereabouts/master/doc/crds/whereabouts.cni.cncf.io_overlappingrangeipreservations.yaml
- Installer manifest: https://raw.githubusercontent.com/k8snetworkplumbingwg/whereabouts/master/doc/crds/daemonset-install.yaml
- Go source: `pkg/api/whereabouts.cni.cncf.io/v1alpha1/overlappingrangeipreservation_types.go`, `pkg/types/types.go`, `pkg/storage/kubernetes/ipam.go`, `cmd/controlloop/controlloop.go`
- Dockerfile (confirms installed binaries): `/whereabouts`, `/ip-control-loop`, `/node-slice-controller`

## Issues Found

1. **Step 5 — OverlappingRangeIPReservation spec was wrong.** The post used `spec.ip` and `spec.podRef`. The real CRD has no `ip` field — whereabouts encodes the reserved IP in `metadata.name` by replacing `:` with `-` (see `pkg/storage/kubernetes/ipam.go`, `strings.ReplaceAll(ipStr, ":", "-")`). The pod reference field is JSON-tagged `podref` (lowercase), not `podRef` (`overlappingrangeipreservation_types.go`). Fixed the example to set `metadata.name: 2001-db8-secondary--200`, dropped `spec.ip`, and renamed `podRef` to `podref`. Added a short comment explaining the naming convention.

2. **Step 6 — Garbage Collection binary name was outdated.** The post invoked `/ip-reconciler`, which no longer exists in the upstream image. The current image ships `/whereabouts`, `/ip-control-loop`, and `/node-slice-controller` (per the repo Dockerfile), and the upstream DaemonSet uses `/ip-control-loop -log-level debug` for the reconcile loop. Replaced `/ip-reconciler` with `/ip-control-loop` in the CronJob command.

## Review Notes
- The `-log-level=verbose` flag value remains valid — `pkg/logging/logging.go` accepts `debug`, `verbose`, `error`, and `panic`.
- In modern deployments, `ip-control-loop` is typically run as a long-lived DaemonSet with its own internal cron scheduler (via the `reconciler_cron_expression` config) rather than a Kubernetes CronJob. The CronJob pattern shown in Step 6 still works — `ip-control-loop` performs a single reconciliation pass and exits when invoked without the cron expression — but operators should be aware that the upstream `daemonset-install.yaml` uses the long-running pattern.
- `cniVersion: 0.3.1` is still supported but older than what current CNI tooling defaults to (0.4.0 / 1.0.0). Not incorrect, just conservative.
- The IPPool `allocations: {}` empty map is a valid seed — the CRD requires the key to exist but accepts an empty map. In practice, whereabouts creates the IPPool automatically on first allocation, so hand-authoring it is optional.
