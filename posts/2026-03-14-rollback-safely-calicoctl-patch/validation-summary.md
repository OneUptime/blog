# Validation Summary: How to Roll Back Safely After Using calicoctl patch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes
- Bash
- Python
- YAML and JSON
- Network policy rollback workflows

## Sources Consulted
- Calico documentation: calicoctl patch: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico documentation: calicoctl apply: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico documentation: calicoctl get: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: Configure calicoctl: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview
- Kubernetes documentation: kubectl patch behavior and patch strategies: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch/
- RFC 7386: JSON Merge Patch: https://www.rfc-editor.org/rfc/rfc7386

## Issues Found
- The introduction said `calicoctl apply` replaces the entire resource. Calico documentation says an apply update replaces the resource specification, so the wording was corrected to "resource spec."
- The prerequisites only listed `python3`, but the reverse-patch script imports `yaml`, which requires PyYAML. The prerequisite now states "python3 with PyYAML."
- Backup commands used plain `calicoctl get -o yaml`, which can include cluster-specific metadata. The examples now use `--export`, matching Calico's documented option for stripping cluster-specific information from named resources.
- The reverse-patch script assumed `calicoctl get -o yaml/json` returned a single object. Calico documentation states YAML/JSON output is list-shaped, so the script now unwraps a single-resource list and errors if the backup/current data is not exactly one resource.
- The reverse-patch script skipped changes where the original value was falsy, such as `false`, `0`, `""`, or `[]`. The diff check now distinguishes "no difference" from falsy replacement values.
- The reverse-patch script did not account for fields added by the forward patch. It now emits `null` for keys that exist only in the current spec so the generated reverse patch can remove them where supported by the patch semantics.
- The generated rollback command embedded raw JSON in single quotes. It now uses shell quoting via Python's `shlex.quote`.
- The troubleshooting note described JSON merge patch array behavior, but current Calico documentation says `calicoctl patch` defaults to strategic merge patch and lists JSON Patch / JSON Merge Patch as not yet implemented. The note now describes strategic merge patch list behavior and recommends full restore for array changes.

## Review Notes
The examples still assume cluster-scoped resources unless the caller supplies the appropriate namespace handling for namespaced Calico resources such as NetworkPolicy, NetworkSet, and WorkloadEndpoint. This is consistent with the original scope but should be expanded in a future revision if the post is meant to cover namespaced resources comprehensively.
