# Validation Summary: How to Roll Back Safely After Using calicoctl convert

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Kubernetes NetworkPolicy
- Calico NetworkPolicy
- Bash scripting
- kubectl

## Sources Consulted
- Calico `calicoctl convert` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/convert
- Calico `calicoctl validate` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico `calicoctl apply` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico `calicoctl delete` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/delete
- Calico `calicoctl` configuration overview: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes object names and IDs documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/
- Kubernetes API concepts documentation: https://kubernetes.io/docs/reference/using-api/api-concepts/

## Issues Found
- The migration script said users could press Ctrl+C to roll back, but it did not trap `SIGINT` or `SIGTERM`; pressing Ctrl+C would terminate the script without deleting the newly applied Calico policy. Added a rollback function and signal trap before the confirmation prompt.
- The original backup command used `kubectl get networkpolicy -o yaml` and the troubleshooting text said extra metadata is harmless. Kubernetes output can include server-managed metadata such as `uid`, `resourceVersion`, and `managedFields`, which should not be relied on as a clean restore manifest. Changed the example to back up the original source YAML and updated the troubleshooting note.
- The rollback examples parsed the converted manifest to reconstruct the Calico policy name and namespace before deletion. Since `calicoctl delete -f` is officially supported, changed the rollback commands to delete using the converted manifest directly and added `--skip-not-exists` for idempotent rollback.

## Review Notes
The shell snippets pass `bash -n` syntax checks. I also tested `calicoctl convert` locally with Calico v3.31.5 on a sample Kubernetes NetworkPolicy to confirm it emits a Calico `projectcalico.org/v3` `NetworkPolicy` without contacting a cluster.
