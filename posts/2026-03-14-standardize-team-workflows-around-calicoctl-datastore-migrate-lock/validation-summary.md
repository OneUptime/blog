# Validation Summary: Standardizing Team Workflows Around calicoctl datastore migrate lock

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- calicoctl
- Calico datastore migration
- Kubernetes datastore
- etcdv3 datastore
- Bash

## Sources Consulted
- Calico documentation: calicoctl datastore migrate lock: https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/lock
- Calico documentation: Migrate Calico data from an etcdv3 datastore to a Kubernetes datastore: https://docs.tigera.io/calico/latest/operations/datastore-migration
- Calico documentation: calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: The Calico datastore: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/the-calico-datastore
- Calico documentation: Install calicoctl: https://docs.tigera.io/calico/latest/operations/calicoctl/install

## Issues Found
- The post treated `calicoctl datastore migrate lock` as if it completed the datastore migration. Official Calico documentation describes it as the preparation step that locks the datastore; the documented migration flow also exports the etcd datastore, reconfigures `calicoctl` for the Kubernetes datastore, imports the data, switches Calico, waits for the `calico-node` rollout, and unlocks the datastore. I updated the runbook and script to include those required steps.
- The communication template described the expected impact as a brief networking disruption. Calico documentation says existing networking continues, but cluster configuration changes and new pod networking are blocked while migration is locked. I corrected the impact statement.
- The prerequisites did not specify the documented scope of this migration path or the recommended `calicoctl` installation approach. I updated them to state that the runbook is for etcdv3-to-Kubernetes datastore migration and that `calicoctl` should be installed as a binary on a host with access to etcd and the Kubernetes API.

## Review Notes
The post is now technically aligned with the current Calico Open Source 3.32 documentation. The script still requires operator-specific steps for configuring `calicoctl` and applying the correct Calico manifest, which is appropriate because those details vary by cluster and Calico installation method.
