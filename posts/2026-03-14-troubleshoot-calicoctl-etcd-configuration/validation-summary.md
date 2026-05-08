# Validation Summary: Troubleshooting Calicoctl etcd Configuration

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- calicoctl
- etcd and etcdctl
- Kubernetes
- TLS certificates
- OpenSSL

## Sources Consulted
- Calico documentation: Configure calicoctl to connect to an etcd datastore, https://docs.tigera.io/calico/latest/operations/calicoctl/configure/etcd
- Calico documentation: Configure calicoctl, https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview
- Calico documentation: Install calicoctl, https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico documentation: calicoctl get command reference, https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: Calico etcdv3 key and path prefixes, https://docs.tigera.io/calico/latest/reference/etcd-rbac/calico-etcdv3-paths
- Calico documentation: GlobalNetworkSet resource, https://docs.tigera.io/calico/latest/reference/resources/globalnetworkset
- etcd documentation: How to check cluster status, https://etcd.io/docs/v3.5/tutorials/how-to-check-cluster-status/
- etcd documentation: How to get keys by prefix, https://etcd.io/docs/v3.5/tutorials/how-to-get-key-by-prefix/
- etcd documentation: Maintenance, https://etcd.io/docs/v3.4/op-guide/maintenance/
- OpenSSL local command availability checked with `/usr/bin/openssl`.

## Issues Found
- The post used `/etc/calicoctl/calicoctl.cfg` as the calicoctl configuration path. Calico documentation states that the default path is `/etc/calico/calicoctl.cfg`, and `--config` can be used to override it. Updated both occurrences to `/etc/calico/calicoctl.cfg`.
- The prerequisites did not mention the Calico recommendation to use a `calicoctl` version matching the Calico version running in the cluster. Added that prerequisite because version skew can affect troubleshooting results.

## Review Notes
- The etcdctl commands for `endpoint health`, `member list -w table`, `get --prefix --keys-only`, and `defrag` are consistent with current etcd v3 documentation.
- The Calico resource examples use valid `projectcalico.org/v3` resource kinds and fields, including `ClusterInformation`, `IPPool`, and `GlobalNetworkSet`.
- Calico's documented etcdv3 key prefixes may change in future releases, so direct etcd key inspection should remain a diagnostic technique rather than an application integration contract.
