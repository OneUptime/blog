# Validation Summary: Using calicoctl datastore migrate export with Practical Examples

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- calicoctl
- Calico datastore migration
- etcdv3 datastore
- Kubernetes API datastore

## Sources Consulted
- Calico documentation: calicoctl datastore migrate export, https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/export
- Calico documentation: Migrate Calico data from an etcdv3 datastore to a Kubernetes datastore, https://docs.tigera.io/calico/latest/operations/datastore-migration
- Calico documentation: calicoctl get, https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: Install calicoctl, https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico documentation: calicoctl user reference, https://docs.tigera.io/calico/latest/reference/calicoctl/overview

## Issues Found
- The post described datastore migration as transitioning between etcd and Kubernetes API datastores generally. The official migration workflow and `datastore migrate export` command are specifically for exporting from an etcdv3 datastore for migration to the Kubernetes datastore, so the introduction was narrowed to that direction.
- The prerequisites recommended `calicoctl` v3.25+. Official installation guidance says to use a `calicoctl` version that matches the Calico version running on the cluster, so the prerequisite was corrected.
- The basic usage section claimed the export includes all Calico resources. Official command documentation lists supported exported resources and says WorkloadEndpoints and Profiles are not exported, so the text was corrected.
- The "Export with Specific Resource Filtering" heading implied the command supports filtering. The snippet only counts resources in the generated export file, so the heading and comment were corrected to verification wording.
- The troubleshooting section suggested using `--allow-version-mismatch` for resource conflicts. Official docs describe that flag as bypassing client/cluster version checks, not resolving conflicts, so the troubleshooting note was corrected.

## Review Notes
The shell snippets are syntactically valid, and the `calicoctl get` resource aliases used in the backup example are supported as pluralized resource names. The migration procedure would benefit from mentioning `calicoctl datastore migrate lock` and `unlock` in a future expanded guide, but the requested review was limited to correcting technical inaccuracies without restructuring the post.
