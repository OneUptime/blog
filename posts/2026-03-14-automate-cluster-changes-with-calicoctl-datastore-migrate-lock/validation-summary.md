# Validation Summary: Automating Datastore Migration with calicoctl datastore migrate lock

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- calicoctl
- Calico datastore migration
- Kubernetes
- GitHub Actions
- Bash

## Sources Consulted
- Calico documentation: Migrate Calico data from an etcdv3 datastore to a Kubernetes datastore - https://docs.tigera.io/calico/latest/operations/datastore-migration
- Calico documentation: calicoctl datastore migrate overview - https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/overview
- Calico documentation: calicoctl datastore migrate lock - https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/lock
- Calico documentation: calicoctl datastore migrate export - https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/export
- Calico documentation: calicoctl get - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl version - https://docs.tigera.io/calico/latest/reference/calicoctl/version
- GitHub Actions runner images documentation - https://github.com/actions/runner-images

## Issues Found
- The post described automation of the Calico datastore migration process, but `calicoctl datastore migrate lock` is only the documented lock step before export, import, and unlock. Updated the title, description, introduction, prerequisites, and conclusion to describe the lock step accurately.
- The resource count and snapshot commands used `calicoctl get networkpolicies` without `--all-namespaces`, which only covers the default namespace for namespaced Calico NetworkPolicy resources. Added `--all-namespaces` for NetworkPolicy counts and snapshots.
- The script described the pre-lock YAML files as a backup, which could be confused with Calico's documented migration export. Renamed that part of the script and troubleshooting guidance to a resource snapshot.
- The GitHub Actions example created a default kind cluster on `ubuntu-latest` and applied an unspecified `calico-manifests/` directory, but the documented datastore migration flow applies to Calico clusters using the etcdv3 datastore and requires `calicoctl` to be configured for that datastore. Replaced the generic kind setup with a self-hosted runner verification step against a prepared non-production migration test cluster.

## Review Notes
The post now validates and automates only the lock step. It does not present a complete end-to-end datastore migration workflow; a full migration still needs the documented export, target datastore configuration, import, manifest update, and unlock steps.
