# Validation Summary: How to Set Node Taints in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, `machine.nodeTaints`, `talosctl patch machineconfig`)
- Kubernetes (taints, tolerations, scheduling)
- kubelet (`register-with-taints` flag)
- kubectl (describe, taint, get/json with jq)
- JSON Patch (RFC 6902)
- GKE Spot node taint convention (`cloud.google.com/gke-spot`)
- NVIDIA GPU device plugin conventions

## Sources Consulted
- Talos v1.14 machine config reference: `machine.nodeTaints` documented as `map[string]string` with example `exampleTaint: exampleTaintValue:NoSchedule` (https://docs.siderolabs.com/talos/v1.7/reference/configuration/v1alpha1/config/ and the v1.14 schema in the siderolabs/talos repo)
- `talosctl patch machineconfig` CLI reference (Talos v1.14 cli.md) confirming `--patch` accepts both strategic merge and JSON patch payloads
- Kubernetes "Taints and Tolerations" docs (https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/) for taint effects, toleration operators (`Equal`, `Exists`), and `tolerationSeconds` semantics
- GKE Spot VMs documentation for the `cloud.google.com/gke-spot=true:NoSchedule` convention

## Issues Found
No technical issues found.

## Review Notes
- The Talos `machine.nodeTaints` value format `"<value>:<effect>"` matches the official example in the Talos config reference. Effect is documented as optional.
- The strategic-merge patch (`'{"machine": {"nodeTaints": {...}}}'`) and the JSON Patch removal (`'[{"op": "remove", "path": "/machine/nodeTaints/dedicated"}]'`) are both valid forms accepted by `talosctl patch machineconfig --patch`.
- `tolerationSeconds` is correctly shown only with the `NoExecute` effect.
- The `register-with-taints` kubelet flag format `key=value:effect` is correct.
- The `nvidia.com/gpu: "present:NoSchedule"` example is illustrative; the NVIDIA GPU Operator commonly uses the key with `operator: Exists` rather than a specific value, but the value-based form here still works as long as pod tolerations match. Not an error, just a convention note.
- Worth mentioning in the future: Talos docs note that under the default Kubernetes `NodeRestriction` admission plugin, worker nodes are not permitted to modify their own taints post-registration. The `machine.nodeTaints` field is applied via the controller path, so this is fine in practice, but the caveat is helpful context for readers troubleshooting.
