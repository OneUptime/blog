# Validation Summary: How to Debug Kubernetes Pod Failures in Portainer

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Portainer (Kubernetes interface)
- Kubernetes
- kubectl CLI

## Sources Consulted
- Kubernetes Pod lifecycle and phases: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- kubectl logs reference (including `--previous`/`-p`): https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#logs
- kubectl describe / get / events references: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Field selectors (e.g. `reason=FailedScheduling`): https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Node conditions (Ready, MemoryPressure, DiskPressure, PIDPressure, NetworkUnavailable): https://kubernetes.io/docs/reference/node/node-status/#condition
- Image pull errors / ImagePullBackOff: https://kubernetes.io/docs/concepts/containers/images/
- OOMKilled / Pod eviction: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Portainer Kubernetes documentation (namespaces, pods, events, console): https://docs.portainer.io/user/kubernetes

## Issues Found
No technical issues found.

- The pod failure category table accurately maps each state to common root causes.
- All kubectl commands use correct, current flags (`-n`, `--previous`, `--field-selector`, `-A` for grep context).
- Node conditions (`NotReady`, `MemoryPressure`, `DiskPressure`) are valid Kubernetes node condition signals.
- Portainer UI navigation (Kubernetes > Namespaces > Pods, Events section, Logs tab with Previous toggle, Console for exec) matches Portainer's documented Kubernetes feature set.

## Review Notes
- The connectivity check `curl http://postgres-service:5432` works as a basic "is the port reachable" probe but PostgreSQL does not speak HTTP, so curl will typically return an empty/garbled reply rather than a clean response. This is a common debugging shortcut and not technically incorrect, but tools like `nc -zv postgres-service 5432` or `pg_isready` would give cleaner output for a Postgres-specific connectivity test. Left as-is since the intent (verify reachability) is preserved.
- `NotReady` is shorthand for the `Ready` condition having status `False`; this is conventional usage and matches how `kubectl get nodes` displays it.
- `kubectl logs --previous` can also be invoked with the shorter `-p` flag, but the long form used here is clearer for a tutorial audience.
