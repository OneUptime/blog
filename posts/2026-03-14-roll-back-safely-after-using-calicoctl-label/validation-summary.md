# Validation Summary: Rolling Back Safely After Using calicoctl label

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes
- Bash
- Python

## Sources Consulted
- Calico Open Source documentation: calicoctl label command, https://docs.tigera.io/calico/latest/reference/calicoctl/label
- Calico Open Source documentation: calicoctl get command, https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Open Source documentation: calicoctl apply command, https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico Open Source documentation: Node resource, https://docs.tigera.io/calico/latest/reference/resources/node
- Calico Open Source documentation: WorkloadEndpoint resource, https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico Open Source documentation: HostEndpoint resource, https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico Open Source documentation: Calico automatic labels, https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels

## Issues Found
- The post used Kubernetes-style label removal syntax, such as `env-` and `"${LABEL_KEY}-"`. `calicoctl label` documents label removal as `<key> --remove`, so the examples and bulk rollback script were updated to use `calicoctl label nodes <node> <key> --remove`.
- The bulk rollback script used `-o jsonpath=...`, but the documented `calicoctl get` output formats include `json`, `yaml`, `ps`, `wide`, `custom-columns`, `go-template`, and `go-template-file`, not `jsonpath`. The script now uses the documented `go-template` output format to list node names.
- The restore script only re-applied labels present in the snapshot, which would not remove labels added after the snapshot even though the section describes restoring previous label state. The script now compares current labels with snapshot labels, removes non-snapshot labels, and then restores snapshot values.
- The restore script assumed only Kubernetes-style JSON list output. It now handles single resources, list objects with `items`, and list output defensively.

## Review Notes
The post is technically relevant and the corrected commands match current Calico Open Source documentation. The scripts still intentionally skip `projectcalico.org/` labels, which is appropriate for Calico-managed labels.
