# Validation Summary: Validating Results After Running calicoctl datastore migrate import

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes
- Bash

## Sources Consulted
- Calico documentation: `calicoctl datastore migrate import` - https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/import
- Calico documentation: datastore migration procedure - https://docs.tigera.io/calico/latest/operations/datastore-migration
- Calico documentation: `calicoctl get` command and resource types - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl resource aliases - https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico documentation: Kubernetes API datastore configuration - https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd
- Calico documentation: `calicoctl version` command - https://docs.tigera.io/calico/latest/reference/calicoctl/version
- Kubernetes documentation: `kubectl run` command - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The validation script labeled creating a short-lived BusyBox pod and reading `.status.podIP` as a connectivity test. That command verifies pod creation and IP assignment, not end-to-end connectivity. I changed the label and troubleshooting text to "Pod IP Assignment" to match what the command actually validates.
- The comparison script counted `name:` fields in YAML backup files, which can overcount resources because `name` can appear in nested fields and because Calico's datastore migration export is not documented as producing one `<resource>.yaml` file per resource. I changed the prerequisite and script to compare against explicit pre-migration `<resource>.count` files.

## Review Notes
The Calico resource aliases used in the scripts, including plural forms such as `ippools`, `globalnetworkpolicies`, `bgpconfigurations`, `bgppeers`, and `felixconfigurations`, are documented as valid. The `calicoctl datastore migrate import -f` command, `calicoctl version`, `calicoctl get ... -o yaml`, and `kubectl run ... --restart=Never -- sleep 30` usage are consistent with current official documentation.
