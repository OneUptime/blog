# Validation Summary: Safely Updating the Calico WorkloadEndpoint Resource in Kubernetes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico WorkloadEndpoint resources
- Calico `calicoctl`
- Kubernetes `kubectl`
- Kubernetes custom resources and RBAC checks

## Sources Consulted
- Calico WorkloadEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico resource definitions: https://docs.tigera.io/calico/latest/reference/resources/overview
- Calico `calicoctl get` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico `calicoctl apply` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico `calicoctl validate` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico `calicoctl node status` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico `calicoctl ipam show` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Kubernetes `kubectl auth can-i` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- The introduction implied that a WorkloadEndpoint misconfiguration can break BGP peerings. WorkloadEndpoint resources represent workload interfaces and policy/profile attachment; BGP peering is handled through Calico node/BGP resources and components. Updated the wording to focus on workload networking and traffic disruption.
- The post presented manual WorkloadEndpoint updates as a routine workflow. Calico documentation states that WorkloadEndpoint lifecycle is normally managed by an orchestrator-specific plugin such as Calico CNI and generally recommends using `calicoctl` only to view this resource type. Added that caution while preserving the guide.
- The export, diff, verification, and rollback commands used `calicoctl get workloadendpoint -o yaml`, which defaults to a namespace rather than necessarily targeting the intended endpoint. Updated the commands to include `<workloadendpoint-name>` and `-n <namespace>`, and added the namespace/name prerequisite.
- The review checklist asked whether a change requires a Felix or BGP restart. WorkloadEndpoint changes are datastore resource changes consumed by Calico components; the more accurate concern is Felix recalculation for the affected endpoint. Updated the wording.
- The post did not mention that `calicoctl apply` replaces the complete specification for an existing resource. Added a note that the full resource spec must be supplied.
- The troubleshooting section said unknown fields are silently ignored by `kubectl`, but the post uses `calicoctl` and Calico provides `calicoctl validate` for manifest validation. Replaced that statement with a validation command.
- The CRD version command printed CRD names and creation timestamps, not served CRD versions. Replaced it with a `jsonpath` command that prints the versions for the WorkloadEndpoint CRD.
- The RBAC example combined `kubectl auth can-i <verb> <resource>` with `--list`, which is not the documented syntax. Split it into a direct permission check and a separate `--list` command filtered for Calico resources.
- The Calico namespace examples assumed `calico-system`. Added a note to use the actual installation namespace, such as `kube-system`, when different.

## Review Notes
The guide is technically relevant and valid after the corrections. Future improvements could include showing an example single-resource WorkloadEndpoint manifest and explicitly distinguishing Kubernetes API datastore usage with `kubectl` from `calicoctl` usage in clusters that have the Calico API server installed.
