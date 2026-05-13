# Validation Summary: Monitor Calico etcdv3 Paths

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes
- etcd v3
- etcdctl
- Prometheus
- Grafana
- Kubernetes CronJob

## Sources Consulted
- Calico key and path prefixes documentation: https://docs.tigera.io/calico/latest/reference/etcd-rbac/calico-etcdv3-paths
- Calico `calicoctl ipam show` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico datastore documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/the-calico-datastore
- etcd system limits documentation: https://etcd.io/docs/v3.6/dev-guide/limit/
- etcd cluster status documentation: https://etcd.io/docs/v3.6/tasks/operator/how-to-check-cluster-status/
- etcd monitoring documentation: https://etcd.io/docs/v3.6/op-guide/monitoring/
- etcd maintenance documentation: https://etcd.io/docs/v3.6/op-guide/maintenance/
- etcd configuration options documentation: https://etcd.io/docs/v3.6/op-guide/configuration/

## Issues Found
- The post stated that etcd's default storage quota is 8 GB. Current etcd documentation lists the default storage limit as 2 GiB, with 8 GiB as a suggested normal maximum. I corrected the text and adjusted the sample warning threshold and units.
- The Prometheus metrics example used port `2381` without context. Official etcd monitoring documentation exposes monitoring information on the client port by default, so I changed the example to `2379`.
- The CronJob used `calicoctl ipam show --show-blocks --output=json`, but the official `calicoctl ipam show` reference does not list `--output=json` for that command. I changed the example to capture the documented table output.
- The policy count example used the obsolete `/calico/v1/policy/` prefix. I replaced it with current Calico etcdv3 resource prefixes for namespaced and global network policies.
- The key count example used obsolete `/calico/v1/ipam/` and `/calico/v1/host/` prefixes. I replaced them with the documented `/calico/ipam/v2/` and `/calico/resources/v3/projectcalico.org/hostendpoints/` prefixes.
- The IPAM key growth alert used `rate()` on a key-count gauge. I changed it to compare the current gauge value with its value one hour earlier.
- The compaction section said compaction reclaims space from deleted keys and labeled the endpoint status revision as the compaction revision. I clarified that compaction removes old revisions, defragmentation returns backend space to the filesystem, and the command shows the current etcd revision.

## Review Notes
- The post is specific to Calico deployments using the etcd datastore. Calico also supports the Kubernetes API datastore, where these etcd paths do not apply.
- The example thresholds are operational starting points. Production thresholds should account for the configured `--quota-backend-bytes`, cluster size, and normal write volume.
