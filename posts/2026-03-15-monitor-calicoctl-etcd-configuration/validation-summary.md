# Validation Summary: How to Monitor Calicoctl etcd Configuration

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Calico and calicoctl
- etcd and etcdctl
- TLS certificates and OpenSSL
- Prometheus scrape configuration and alerting rules
- Shell scripting and cron

## Sources Consulted
- Calico documentation, "Configure calicoctl to connect to an etcd datastore": https://docs.tigera.io/calico/latest/operations/calicoctl/configure/etcd
- Calico documentation, "calicoctl get": https://docs.tigera.io/calico/latest/reference/calicoctl/get
- etcd documentation, "How to check Cluster status": https://etcd.io/docs/v3.5/tutorials/how-to-check-cluster-status/
- etcd documentation, "Monitoring etcd": https://etcd.io/docs/v3.6/op-guide/monitoring/
- etcd documentation, "Metrics": https://etcd.io/docs/v3.6/metrics/
- etcd documentation, "Transport security model": https://etcd.io/docs/v3.6/op-guide/security/
- Prometheus documentation, "Configuration": https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus documentation, "Histograms and summaries": https://prometheus.io/docs/practices/histograms/
- Prometheus documentation, "Query functions": https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The prerequisites omitted `jq`, but the `calicoctl-health-check.sh` script uses it to parse JSON output. Added `jq` to the prerequisite list.
- The cron example piped a single line directly to `crontab -`, which would replace any existing crontab entries. Changed it to append to the current crontab before installing the updated crontab.
- The Prometheus section stated that etcd exposes metrics on port 2379. etcd exposes `/metrics` on the client port, commonly 2379, and can also expose metrics on `--listen-metrics-urls`. Updated the wording to match the official etcd documentation.
- The `EtcdHighFsyncDuration` alert calculated a quantile directly from cumulative histogram bucket samples. Updated it to use `rate(...[5m])` and aggregate by `instance` and `le`, which is the supported Prometheus pattern for classic histogram quantiles.

## Review Notes
The examples assume `calicoctl` is already configured for an etcdv3 datastore, either through `/etc/calico/calicoctl.cfg` or the documented Calico environment variables. When environment variables are used for calicoctl, Calico requires `DATASTORE_TYPE=etcdv3`.
