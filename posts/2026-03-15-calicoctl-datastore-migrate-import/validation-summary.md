# Validation Summary: How to Use calicoctl datastore migrate import with Practical Examples

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Calico datastore migration
- Kubernetes API datastore
- etcdv3 datastore
- Bash

## Sources Consulted
- Calico Open Source documentation: calicoctl datastore migrate import, https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/import
- Calico Open Source documentation: calicoctl datastore migrate overview, https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/overview
- Calico Open Source documentation: Migrate Calico data from an etcdv3 datastore to a Kubernetes datastore, https://docs.tigera.io/calico/latest/operations/datastore-migration
- Calico Open Source documentation: Configure calicoctl to connect to the Kubernetes API datastore, https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd
- Calico Open Source documentation: Configure calicoctl to connect to an etcd datastore, https://docs.tigera.io/calico/latest/operations/calicoctl/configure/etcd
- Calico Open Source documentation: calicoctl get, https://docs.tigera.io/calico/latest/reference/calicoctl/get

## Issues Found
- The post described `calicoctl datastore migrate import` as a general import/restore command and implied migration in either direction between etcd and Kubernetes. Updated the text to match Calico documentation: the migrate import subcommand stores and converts exported etcdv3 data into the Kubernetes datastore.
- The "Importing into etcd" example incorrectly showed importing into an etcdv3 datastore. Reworked it as an etcd export followed by Kubernetes datastore import.
- The migration workflow stopped before configuring Calico to read from the Kubernetes datastore and unlocking the migration. Added the documented `kubectl apply`, rollout status check, and `calicoctl datastore migrate unlock` steps.
- Several examples used undocumented `calicoctl get --no-headers` and short resource aliases such as `gnp` and `np`. Replaced them with documented resource names and output handling.
- Count commands used `grep -c`, which can return a non-zero status when no resources match. Replaced these counts with `awk` so empty results print `0` without breaking `set -e` scripts.
- The backup/restore section overstated the command as a general restore workflow. Revised it to describe importing from a saved export as part of the documented etcdv3-to-Kubernetes migration flow.

## Review Notes
The official migration guide notes that once the Kubernetes datastore is unlocked, the datastore migration cannot be rolled back. Future revisions could add a rollback section, but none was added here to avoid restructuring the post beyond technical corrections.
