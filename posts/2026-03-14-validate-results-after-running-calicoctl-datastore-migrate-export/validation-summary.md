# Validation Summary: Validating Results After Running calicoctl datastore migrate export

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- calicoctl
- Calico datastore migration
- Kubernetes
- Bash

## Sources Consulted
- Calico documentation: `calicoctl datastore migrate export` - https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/export
- Calico documentation: datastore migration from etcdv3 to Kubernetes datastore - https://docs.tigera.io/calico/latest/operations/datastore-migration
- Calico documentation: `calicoctl get` command and supported resource aliases - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl overview and resource aliases - https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Project Calico source: datastore migrate export implementation - https://github.com/projectcalico/calico/blob/master/calicoctl/calicoctl/commands/datastore/migrate/export.go
- Kubernetes documentation: `kubectl get` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get
- Kubernetes documentation: `kubectl run` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes documentation: `kubectl delete` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/

## Issues Found
- The prerequisites implied the validation could use the source and/or target datastore after `calicoctl datastore migrate export`. The official Calico migration flow exports from a locked etcdv3 source datastore to a file before import, so the prerequisite was changed to require `calicoctl datastore migrate export > etcd-data` and access to the source etcdv3 datastore.
- The resource counting command listed namespaced Calico network policies without `--all-namespaces`. Since the export implementation includes all namespaces for `networkpolicies`, the validation script now uses `calicoctl get networkpolicies --all-namespaces` for that resource.
- The validation script created a new BusyBox pod after the export step. Calico's migration documentation says new pods will not be started while the datastore is locked, so this could report a false failure during a valid migration. The script now checks existing pods with `kubectl get pods --all-namespaces -o wide`.
- The comparison script assumed a backup directory containing one YAML file per resource type, but `calicoctl datastore migrate export` writes a single export file. The script now accepts the export file and counts expected Calico `kind:` entries in that file.
- The troubleshooting notes referred to target datastore connectivity after export. This was corrected to checking that `DATASTORE_TYPE` is set to `etcdv3` for the source datastore.

## Review Notes
The post is technically relevant and the remaining commands use documented calicoctl resource aliases and Kubernetes CLI options. The count-based comparison is still a coarse validation method; a future improvement could compare full exported resources with a structured YAML parser rather than using `grep`.
