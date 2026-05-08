# Validation Summary: How to Roll Back Safely After Using calicoctl validate

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes
- YAML
- Bash
- Python 3 / PyYAML

## Sources Consulted
- Calico documentation: calicoctl validate, https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico documentation: calicoctl user reference, https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico documentation: calicoctl get, https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: GlobalNetworkPolicy resource, https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Project Calico source: v3.31.0 calicoctl validate implementation, https://raw.githubusercontent.com/projectcalico/calico/v3.31.0/calicoctl/calicoctl/commands/validate.go
- Project Calico source: v3.27.0 calicoctl top-level command list, https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/calicoctl/calicoctl/calicoctl.go

## Issues Found
- The post listed `calicoctl v3.27 or later` as a prerequisite, but `calicoctl validate` is present in the documented/current command set and in the v3.31 source, while the v3.27 top-level command list does not include it. Updated the prerequisite and troubleshooting guidance to `v3.31 or later`.
- The backup workflow script used Python's `yaml` module without listing PyYAML as a requirement. Added `Python 3 with PyYAML` to the prerequisites for that script.
- The backup workflow script removed the backup file for new resources but still printed the generated backup path. Updated the script to print `none (new resource)` when no existing resource was backed up.
- The troubleshooting section said validate checks syntax only. Official docs state it validates syntax, structure, schema, Calico-specific validation rules, and cross-field constraints offline. Updated the wording and clarified that `apply` can still fail because it requires datastore access and depends on cluster state.

## Review Notes
The main claim is correct: `calicoctl validate` validates resource files offline without datastore access and does not apply changes to the cluster. The example GlobalNetworkPolicy syntax and the `calicoctl validate -f` usage match the official command reference.
