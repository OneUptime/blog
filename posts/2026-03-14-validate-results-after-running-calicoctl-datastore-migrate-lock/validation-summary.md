# Validation Summary: Validating Results After Running calicoctl datastore migrate lock

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- calicoctl
- Calico datastore migration
- Kubernetes
- kubectl
- Bash

## Sources Consulted
- Calico calicoctl datastore migration guide: https://docs.tigera.io/calico/latest/operations/datastore-migration
- Calico calicoctl migrate lock reference: https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/lock
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl version reference: https://docs.tigera.io/calico/latest/reference/calicoctl/version
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The post described the validation as proving full data integrity and cluster connectivity after `calicoctl datastore migrate lock`. Official Calico migration documentation describes `lock` as the preparation step before export, import, and unlock, and notes that new pods will not be started until migration is complete. Updated the description, introduction, troubleshooting, and conclusion to describe datastore access, resource counts, and pod IP allocation more precisely.
- The `kubectl run` command passed `sleep 30` without `--command`. Kubernetes treats arguments after `--` as container args unless `--command` is set, so the BusyBox container might not run `sleep` as intended. Added `--command`.
- The resource count loop used `calicoctl get networkpolicies` without `--all-namespaces`, which only checks the default namespace for namespaced resources. Added `--all-namespaces` for NetworkPolicy counts.
- The comparison script counted every YAML `name:` field in backup files, which can overcount if a resource contains additional name fields. Changed the backup count to count YAML `kind:` entries instead.

## Review Notes
The validation scripts are still lightweight checks and do not prove full end-to-end workload connectivity. The post now labels the pod check as scheduling and IP allocation to match what the command actually verifies.
