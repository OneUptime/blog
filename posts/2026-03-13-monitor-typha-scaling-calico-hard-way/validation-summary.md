# Validation Summary: Monitoring Typha Scaling in Calico the Hard Way

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (Typha component)
- Kubernetes
- Prometheus
- Prometheus Operator (ServiceMonitor, PrometheusRule CRDs)
- Felix (Calico's per-node agent, referenced as Typha client)

## Sources Consulted
- Calico Typha source: `projectcalico/calico/typha/pkg/syncserver/sync_server.go` (metric definitions)
- Calico Typha source: `projectcalico/calico/typha/pkg/syncserver/snap_precalc.go` (snapshot metrics)
- Calico Typha source: `projectcalico/calico/typha/pkg/snapcache/cache.go` (updates metrics)
- Calico Typha source: `projectcalico/calico/typha/pkg/config/config_params.go` (default metrics port 9093, env vars)
- Tigera/Calico Typha configuration reference: https://docs.tigera.io/calico/latest/reference/typha/configuration
- Prometheus Operator CRD docs (ServiceMonitor / PrometheusRule API: `monitoring.coreos.com/v1`)

## Issues Found
1. **Incorrect metric names with spurious `_total` suffix.** Typha's Prometheus counters do not have a `_total` suffix in the exposed names. The post used `typha_connections_accepted_total`, `typha_snapshots_generated_total`, and `typha_connections_dropped_total`, which do not exist. Corrected to the real names: `typha_connections_accepted`, `typha_snapshots_generated`, and `typha_connections_dropped`. Updated both the "Key metric families" list and the `TyphaSendTimeout` alert PromQL.

2. **Non-existent metric `typha_updates_sent_total`.** Typha does not expose a metric by that name. The actual counter is `typha_updates_total` (defined in `typha/pkg/snapcache/cache.go`), which counts updates received from the Syncer and fanned out via the snap cache to clients. Replaced the reference in both the metric list and the `TyphaSyncStalled` alert expression, and adjusted the description to reflect the real semantics ("received from the Syncer and fanned out to Felix clients").

3. **Reference to non-existent `TYPHA_CLIENTTIMEOUT` env var.** No such configuration parameter exists in Typha. The closest real setting that controls when a slow client is forcibly disconnected is `TYPHA_SERVERMAXFALLBEHINDSECS` (default 300s; how long a client may fall behind before being dropped). Updated the alert annotation accordingly and softened the description, since `typha_connections_dropped` covers drops due to rebalancing as well as fall-behind events.

## Review Notes
- The Typha default Prometheus metrics port (9093) is correct per the source code, though some older Tigera doc pages incorrectly list 9091. Source is authoritative.
- The Felix-Typha port (5473) is correct.
- `TYPHA_PROMETHEUSMETRICSENABLED` is the correct env var to enable metrics.
- The `ServiceMonitor` and `PrometheusRule` API versions (`monitoring.coreos.com/v1`) are current.
- The `up{job="calico-typha"} == 1` expression assumes the job label resolves to `calico-typha`; with the Prometheus Operator the job label normally defaults to the Service name, which matches here.
- The `typha_connections_dropped` counter's primary semantic in Typha source is "dropped due to rebalancing" — it's still a useful signal that something is forcibly disconnecting clients, but readers should not assume it strictly indicates slowness. The post's alert wording was softened to reflect this.
- The `wget` command in Step 4 assumes the Typha container image ships with `wget`. The official `calico/typha` image is based on a minimal distroless-style base and may not include `wget`; users could need to swap in `curl` or use `kubectl exec ... -- /typha -version`-style introspection on some image variants. Not changed because the post explicitly emphasizes a manifest-based "the hard way" baseline check and the command is benign when the binary is missing.
