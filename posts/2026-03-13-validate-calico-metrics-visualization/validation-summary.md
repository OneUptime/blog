# Validation Summary: How to Validate Calico Metrics Visualization

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes
- Grafana
- Prometheus
- calicoctl
- kubectl
- Bash
- jq

## Sources Consulted
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl ipam show reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Calico IPAM documentation: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Grafana Dashboard HTTP API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/dashboard/
- Prometheus HTTP API: https://prometheus.io/docs/prometheus/3.2/querying/api/

## Issues Found
- The script used `sum(felix_active_local_policies)` as the expected active policy count. Calico documents this as the number of active policies on each host, so summing it counts per-node active policy instances rather than cluster policy objects. Changed the dashboard policy count query to `max(felix_cluster_num_policies)`, the documented cluster-wide policy metric.
- The script checked `felix_ipsets_total`, which is not listed in the current Calico Felix metrics reference. Replaced it with the documented `felix_active_local_endpoints` metric.
- The manual validation command `calicoctl get gnp --no-headers` used `--no-headers`, which is a `kubectl get` flag and is not documented for `calicoctl get`. Replaced it with JSON-output `calicoctl` commands that can be counted with `jq`.
- The IP pool usage row described usage as a percentage based on pod count. Calico IPAM tracks IP pools and allocation blocks, so the check now points to `calicoctl ipam show --show-blocks`.
- The policy latency row gave a fixed typical threshold without a documented basis. Reworded it to refer to the documented Felix calculation graph update duration metric.

## Review Notes
The Grafana dashboard UID endpoint and Prometheus instant query API usage are valid. The example dashboard UIDs are deployment-specific, so operators still need to adjust them if their provisioned Calico dashboards use different UIDs.
