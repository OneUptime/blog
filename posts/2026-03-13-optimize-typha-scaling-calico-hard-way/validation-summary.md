# Validation Summary: Optimizing Typha Scaling in Calico the Hard Way

## Status
validated

## Post Type
Tutorial / Performance optimization guide

## Technologies Covered
- Calico (CNI)
- Typha (Calico's datastore fan-out daemon)
- Felix (Calico per-node agent)
- Kubernetes Deployments, Services, FelixConfiguration CRD
- Prometheus metrics
- calicoctl / kubectl CLIs

## Sources Consulted
- Calico Typha configuration reference: https://docs.tigera.io/calico/latest/reference/typha/configuration
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Typha config parameters source: https://github.com/projectcalico/calico/blob/master/typha/pkg/config/config_params.go
- Typha sync server source (Prometheus metric names): https://github.com/projectcalico/calico/blob/master/typha/pkg/syncserver/sync_server.go

## Issues Found
1. **Non-existent env var `TYPHA_CLIENTTIMEOUT`** — The post used `TYPHA_CLIENTTIMEOUT: 90s` to disconnect slow clients. There is no such variable in `typha/pkg/config/config_params.go`. The equivalent that disconnects clients that fall behind is `ServerMaxFallBehindSecs` (default 300 seconds). Replaced with `TYPHA_SERVERMAXFALLBEHINDSECS: "90"` (changed value to a plain seconds integer since the config type is `seconds`, and updated the explanatory comment).
2. **Non-existent env var `TYPHA_SNAPSHOTCACHESIZES`** — The post used `TYPHA_SNAPSHOTCACHESIZES: 100`. The actual parameter is `SnapshotCacheMaxBatchSize` (default 100), so the env var is `TYPHA_SNAPSHOTCACHEMAXBATCHSIZE`. Replaced the env var name and corrected the comment: this controls the max KV pairs sent per batch during initial snapshot streaming, not "internal snapshot buffer depth per connected client".
3. **Incorrect description of `TYPHA_MAXCONNECTIONSLOWERLIMIT` behavior** — The post claimed Felix clients "receive a redirect response and connect to a different Typha pod". Typha does not send redirect responses. Above the lower limit, Typha gracefully drops connections at `ConnectionDropIntervalSecs` (default 1 s) and clients reconnect (typically to another pod via service DNS); above the upper limit (default 10000), new connections are rejected. Rewrote both the prose explanation and the inline YAML comment to reflect this.
4. **Misleading description of `typhaWriteTimeout`** — The post described it as "How often Felix sends keepalives to Typha". `typhaWriteTimeout` is the write-side socket timeout (default 10s), not a keepalive interval. Keepalives are driven by Typha's `ServerPingIntervalSecs` (10s) / `ServerPongTimeoutSecs` (60s). Adjusted the comment to accurately describe it as a write timeout and tightened the `typhaReadTimeout` description to match the documented "Felix will exit and restart" semantics.

## Review Notes
- `TYPHA_PROMETHEUSMETRICSPORT: "9093"` matches the default in the current Typha source (`config_params.go` declares default `9093`). Older Calico documentation pages list `9091`, which appears to be stale; using `9093` is consistent with the running default and was left as-is.
- Felix `typhaReadTimeout` (30s) and `typhaWriteTimeout` (10s) match documented defaults; including them is benign and useful as a teaching aid.
- Health endpoints `/liveness` and `/readiness` on port 9098 are correct (`HealthPort` default 9098).
- Typha server port 5473 is correct (`ServerPort` for the sync API).
- Prometheus metric names `typha_connections_accepted` and `typha_connections_active` are correct (confirmed in `sync_server.go`).
- The `Description` frontmatter mentions "garbage collection" tuning, but the body does not actually cover GC; cosmetic and not factually wrong, left untouched per the "do not restructure" guideline.
- `image: calico/typha:v3.27.0` is a real released tag, though newer Calico releases exist; readers should use the version matching their cluster.
