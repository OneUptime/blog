# Validation Summary: Standardizing Team Workflows Around calicoctl datastore migrate export

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- calicoctl
- Calico datastore migration
- Bash

## Sources Consulted
- Calico Open Source documentation: calicoctl datastore migrate overview: https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/overview
- Calico Open Source documentation: calicoctl datastore migrate export: https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/export
- Calico Open Source documentation: migrate Calico data from an etcdv3 datastore to a Kubernetes datastore: https://docs.tigera.io/calico/latest/operations/datastore-migration
- Calico Open Source documentation: calicoctl datastore migrate lock: https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/lock
- Calico Open Source documentation: calicoctl get: https://docs.tigera.io/calico/latest/reference/calicoctl/get

## Issues Found
- The post showed `calicoctl datastore migrate export` without redirecting stdout to a file. The official Calico migration workflow uses `calicoctl datastore migrate export > etcd-data`, and the export command documentation says to save the output for later use with the import command. I changed the runbook and script to write to `etcd-migration` and validate that the file is non-empty.
- The communication template described the expected impact as a brief networking disruption. Calico's datastore migration documentation specifically notes that after locking the datastore, new pods will not be started until after migration. I changed the expected impact to reflect the documented behavior.
- The runbook omitted the datastore lock before export. The official migration workflow locks the etcd datastore before exporting so changes do not affect the cluster during migration. I added a lock checklist item.

## Review Notes
The post focuses on standardizing the export step rather than documenting the complete datastore migration. In a future revision, the runbook could explicitly include the subsequent import and unlock steps from the official Calico migration workflow.
