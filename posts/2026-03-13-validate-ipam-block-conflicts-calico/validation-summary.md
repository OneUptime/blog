# Validation Summary: How to Validate Resolution of IPAM Block Conflicts in Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico Enterprise IPAM
- calicoctl
- Kubernetes
- kubectl
- Bash

## Sources Consulted
- Calico Enterprise documentation: calicoctl ipam check, https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/check
- Calico Enterprise documentation: BlockAffinity resource, https://docs.tigera.io/calico-enterprise/latest/reference/resources/blockaffinity
- Calico Open Source documentation: calicoctl get output formats, https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Open Source documentation: calicoctl installation and API group guidance, https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Kubernetes documentation: Labels and selectors, https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes documentation: kubectl reference, https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes documentation: kubectl quick reference and JSONPath examples, https://kubernetes.io/docs/reference/kubectl/quick-reference

## Issues Found
- The duplicate pod IP check parsed the `kubectl get pods -o wide` table with `awk '{print $7}'`. This is fragile, so it was changed to use `kubectl` custom columns for `.status.podIP`.
- The new-pod validation said it tested all nodes but used `head -3`, so it only tested up to three nodes. The command now iterates over all returned nodes.
- The `kubectl run` test pod names were derived from node names, which can produce awkward or invalid pod names. The example now uses a simple numeric suffix.
- The `kubectl run --overrides` JSON did not include `apiVersion`, which the kubectl reference expects for an override object. The override now includes `"apiVersion":"v1"`.
- The BusyBox test pod command passed `sleep 10` as arguments without `--command`, which may not run as intended. The example now uses `--command -- sleep 60`.
- The cleanup command used `kubectl delete pods -l run`, which could delete unrelated pods created by `kubectl run`. The test pods now receive a dedicated `ipam-validation=block-conflict-test` label and cleanup targets only that selector.
- The block-affinity validation used `calicoctl get ... -o jsonpath`, but documented `calicoctl get` output formats do not include `jsonpath`. The example now uses `go-template`, which is documented for `calicoctl get`.
- The block-affinity loop originally would have lost the `ORPHANED` flag if implemented with a pipeline. It now uses process substitution and exact node-name matching.

## Review Notes
The `calicoctl ipam check` and `BlockAffinity` references are documented in Calico Enterprise documentation. Operators using Calico Open Source should confirm that their installed `calicoctl` version supports the same IPAM check workflow.
