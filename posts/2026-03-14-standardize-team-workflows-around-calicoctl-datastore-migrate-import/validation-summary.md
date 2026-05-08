# Validation Summary: Standardizing Team Workflows Around calicoctl datastore migrate import

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
- Calico documentation: calicoctl datastore migrate import, https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/import
- Calico documentation: calicoctl datastore migrate export, https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/export
- Calico documentation: calicoctl datastore migrate overview, https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/overview
- Calico documentation: Migrate Calico data from an etcdv3 datastore to a Kubernetes datastore, https://docs.tigera.io/calico/latest/operations/datastore-migration
- Calico documentation: calicoctl get, https://docs.tigera.io/calico/latest/reference/calicoctl/get

## Issues Found
- The `calicoctl datastore migrate import` command was shown without the required `-f/--filename` option. Updated the runbook and script to use `calicoctl datastore migrate import -f etcd-data`, matching the official command syntax.
- The script did not identify the exported migration file to import. Added a `MIGRATION_FILE` variable with a default of `etcd-data` and support for passing a different file as the first script argument.
- The impact template described an expected brief networking disruption. Calico's documented migration lock behavior is more specific: new Calico resource changes do not affect the cluster during migration, and new pods are not started until after migration. Updated the wording to reflect this.

## Review Notes
The post remains a high-level team workflow guide rather than a complete end-to-end Calico datastore migration procedure. Future improvements could include explicitly referencing the full lock, export, configure calicoctl, import, switch Calico configuration, rollout, and unlock sequence from the official migration guide.
