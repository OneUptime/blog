# Validation Summary: How to Roll Back Safely After Using calicoctl get

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Kubernetes
- calicoctl
- Calico resource manifests
- Bash

## Sources Consulted
- Calico `calicoctl get` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico `calicoctl apply` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico `calicoctl validate` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico `calicoctl` user reference and resource aliases: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico resource definitions: https://docs.tigera.io/calico/latest/reference/resources/overview
- Calico calicoctl install/version guidance: https://docs.tigera.io/calico/latest/operations/calicoctl/install

## Issues Found
- The prerequisites said `calicoctl v3.27 or later`. Official Calico guidance says `calicoctl` should match the Calico version running on the cluster, so the prerequisite was updated accordingly.
- Named backup examples did not use `--export`. Official Calico guidance recommends `calicoctl get <resource> <name> -o yaml --export` when saving a resource for modification or restore, so named-resource examples were updated.
- The validation example used Python with PyYAML, which is not guaranteed to be installed and only checks generic YAML syntax. It was changed to `calicoctl validate -f`, which validates Calico resource structure and rules.
- The restore workflow omitted some resource types captured by the snapshot script. `tiers`, `profiles`, and `hostendpoints` were added to the restore order so the restore script better matches the snapshot.
- The verification script computed a YAML count incorrectly for Calico's YAML-list output and did not display the count. It was changed to validate each snapshot file with `calicoctl validate`.
- The troubleshooting note said Kubernetes `resourceVersion` is ignored on apply. That was too broad; it was changed to recommend `--export` for named backups and to avoid exact metadata comparisons for bulk snapshots.

## Review Notes
- `calicoctl` was not installed in the local environment, so CLI behavior was checked against official Calico command reference documentation rather than local `--help` output.
- Calico documentation notes that YAML and JSON output from `calicoctl get` can be used as input to resource management commands, including `apply`; the post's JSON restore note is accurate.
