# Validation Summary: Avoiding Common Mistakes with Calicoctl etcd Configuration

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Calico Open Source / calicoctl
- etcd / etcdctl
- TLS client certificates
- YAML configuration
- Bash shell commands

## Sources Consulted
- Calico documentation: Configure calicoctl to connect to an etcd datastore - https://docs.tigera.io/calico/latest/operations/calicoctl/configure/etcd
- Calico documentation: calicoctl apply command reference - https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico documentation: IPPool resource reference - https://docs.tigera.io/calico/latest/reference/resources/ippool
- etcd documentation: How to get keys by prefix - https://etcd.io/docs/v3.5/tutorials/how-to-get-key-by-prefix/
- etcd documentation: Set up a local cluster / member list example - https://etcd.io/docs/v3.5/dev-guide/local_cluster/
- etcd documentation: Upgrade from 3.3 to 3.4 / ETCDCTL_API=3 default and v2 API default changes - https://etcd.io/docs/v3.6/upgrades/upgrade_3_4/
- etcd documentation: Writing to etcd - https://etcd.io/docs/v3.5/tutorials/writing-to-etcd/

## Issues Found
- The missing `DATASTORE_TYPE` example said calicoctl may try the Kubernetes API or the wrong etcd version. Calico documents that `datastoreType` defaults to `kubernetes` when unspecified, so the comment was narrowed to the Kubernetes API datastore.
- The configuration file example wrote to `/etc/calicoctl/calicoctl.cfg`, but the documented default calicoctl config path is `/etc/calico/calicoctl.cfg`. The example was updated to the default path.
- The troubleshooting note for `"invalid header field value"` attributed the error specifically to endpoint URL whitespace. This was too specific for the error, so the wording was broadened to copied configuration values containing trailing whitespace or invisible characters.

## Review Notes
The remaining Calico environment variables, CalicoAPIConfig field names, etcdctl v3 commands, `calicoctl apply -f -` usage, and IPPool fields were consistent with the referenced official documentation. etcd v3.4 and later default `etcdctl` to API v3, but explicitly setting `ETCDCTL_API=3` remains a valid and clear verification practice.
