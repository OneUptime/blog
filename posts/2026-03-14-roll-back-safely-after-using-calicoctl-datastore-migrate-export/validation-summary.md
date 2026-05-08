# Validation Summary: Rolling Back Safely After Using calicoctl datastore migrate export

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Calico datastore migration
- Kubernetes
- kubectl
- Bash

## Sources Consulted
- Calico documentation: Migrate Calico data from an etcdv3 datastore to a Kubernetes datastore, https://docs.tigera.io/calico/latest/operations/datastore-migration
- Calico documentation: calicoctl datastore migrate, https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/overview
- Calico documentation: calicoctl user reference and supported resource aliases, https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico documentation: Configure calicoctl to connect to an etcd datastore, https://docs.tigera.io/calico/latest/operations/calicoctl/configure/etcd
- Kubernetes documentation: kubectl run, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes documentation: kubectl delete, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/

## Issues Found
- The rollback description implied that the original datastore could be Kubernetes and that no further action was needed before finalization. Calico's documented datastore migration is from etcdv3 to the Kubernetes datastore, and rollback before unlock requires deleting imported Calico CRDs and switching Calico back to etcd. Updated the command block to use `DATASTORE_TYPE=etcdv3`, note required etcd connection options, lock the Kubernetes datastore, delete imported Project Calico CRDs, then unlock etcd.
- The partial-restore example used `BACKUP_DIR="migration-backup-*"`, but the quoted glob would be treated literally in the later file checks. Replaced it with an explicit backup directory argument pattern.
- The verification cleanup used `kubectl delete pod rollback-test --grace-period=0`. Current Kubernetes documentation states `--grace-period=0` can only be used with `--force`; changed the command to `kubectl delete pod rollback-test --now`.

## Review Notes
The restoration examples cover common Calico resource types but are not exhaustive for every Calico installation. Operators should ensure their backup includes all resource kinds used in their cluster, including any additional Calico CRDs or IPAM-related data relevant to their deployment.
