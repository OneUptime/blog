# Validation Summary: Automating Datastore Migration with calicoctl datastore migrate export

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Calico datastore migration
- etcdv3 datastore
- Kubernetes API datastore
- Kubernetes kind
- GitHub Actions
- Bash

## Sources Consulted
- Calico documentation: Migrate Calico data from an etcdv3 datastore to a Kubernetes datastore, https://docs.tigera.io/calico/latest/operations/datastore-migration
- Calico documentation: calicoctl datastore migrate export, https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/export
- Calico documentation: calicoctl datastore migrate overview, https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/overview
- Calico documentation: calicoctl get, https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: Installing on Kind, https://docs.tigera.io/calico/latest/getting-started/kubernetes/kind
- helm/kind-action documentation, https://github.com/helm/kind-action

## Issues Found
- The post described datastore migration generically. Official Calico documentation describes this `calicoctl datastore migrate` workflow as migrating Calico data from an etcdv3 datastore to a Kubernetes datastore, so the introduction and prerequisites now state that direction explicitly.
- The automated script ran `calicoctl datastore migrate export` without redirecting stdout to a file. The official export reference says to save the command output for later use with `calicoctl datastore migrate import`, so the script now writes the export to `$BACKUP_DIR/etcd-data` and verifies the file is non-empty.
- The resource inventory and backup loop only covered a subset of documented exported resource types. The script now includes the current documented export resource types such as GlobalNetworkSets, HostEndpoints, KubeControllersConfigurations, NetworkSets, IPReservations, and BGPFilters.
- The script used `calicoctl get networkpolicies` without `--all-namespaces`, which only lists the default namespace for namespaced Calico resources. The script now uses `--all-namespaces` for NetworkPolicies and NetworkSets.
- The CI example called `kind create cluster` directly on `ubuntu-latest` and did not disable kind's default CNI before installing Calico. The workflow now uses `helm/kind-action@v1` and creates a kind config with `networking.disableDefaultCNI: true`, matching Calico's kind installation guidance.

## Review Notes
The CI example still assumes the repository provides `calico-manifests/` and that the test environment represents an etcdv3-backed Calico installation suitable for exercising the migration export command. A production migration should still run the full documented sequence: lock the etcd datastore, export, reconfigure `calicoctl` for the Kubernetes datastore, import, verify, update Calico to use the Kubernetes datastore, then unlock.
