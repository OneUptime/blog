# How to Tune etcd Heartbeat and Election Timeouts for Network Latency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: etcd, Networking, Performance, High Availability, Monitoring

Description: Select consistent etcd heartbeat and election settings from measured peer latency while checking disk stalls and failover behavior.

---

etcd's heartbeat interval and election timeout control how members detect a missing leader. Increasing them can make a cluster tolerate a slower network, but it also delays detecting a real leader failure. The settings should follow measured conditions and recovery objectives.

This tutorial applies to the `--heartbeat-interval` and `--election-timeout` settings in etcd 3.6 and 3.7. Both use milliseconds. Their documented defaults are 100 milliseconds and 1,000 milliseconds respectively. A cluster on a healthy local network often needs no adjustment. The official [tuning guide](https://etcd.io/docs/v3.7/tuning/) recommends relating the heartbeat to peer RTT and leaving substantially more time for an election timeout.

## Measure before selecting values

Collect peer round-trip latency during normal traffic and peak load, with a view for every source/destination pair. Include packet loss and route variability. Averages help establish the normal path; tail latency shows how much variation the cluster must tolerate.

```promql
histogram_quantile(0.99,
  sum by (instance, To, le) (
    rate(etcd_network_peer_round_trip_time_seconds_bucket[5m])
  )
)
```

The [peer prober records samples of smoothed RTT](https://github.com/etcd-io/etcd/blob/v3.7.1/server/etcdserver/api/rafthttp/probing_status.go). This percentile describes that sampled signal; use additional network measurements when investigating individual delay spikes. Do not calculate one aggregate percentile across all members. A single high-latency link can disappear in the cluster-wide distribution. Preserve any cluster label your monitoring system uses. Also measure the path during backups, compaction, deployments, and periods of CPU contention.

A peer RTT increase is not automatically a network-only problem. A busy receiver can be slow to respond. Compare it with WAL fsync duration, backend commit duration, CPU throttling, disk queues, and logs reporting delayed heartbeats. Moving storage work or fixing a saturated device may restore stable elections without any timing change.

## Build a candidate timing budget

The documented guidance places the heartbeat around the maximum of the average RTTs between members, commonly roughly 0.5 to 1.5 times that RTT. It recommends an election timeout at least ten times RTT to allow for variability. Treat those as starting constraints and evaluate the resulting failure-detection delay.

For an illustrative cluster whose slowest normal peer RTT averages around 80 milliseconds, a 100-millisecond heartbeat may already be appropriate. A 2,000-millisecond election timeout might provide useful headroom if measured transient delays justify it and the service can tolerate longer failover. These values are an example, not a universal recommendation.

A rough planning table makes the decision explicit:

| Measurement or objective | Example observation | Implication |
| --- | --- | --- |
| Slowest normal average RTT | 80 ms | Keep heartbeat near this scale |
| Brief healthy-load stalls | Several hundred milliseconds | Investigate their source and allow justified variance |
| Acceptable leader-loss detection | A few seconds | Bound the proposed election setting |
| WAL fsync spikes | 1.5 seconds during backups | Fix storage interference before approving the timing change |

Do not derive exact failover duration from the configured election timeout. Elections are randomized, multiple rounds may occur, clients must reconnect or retry, and the new leader must make progress. Test the user-visible recovery interval.

## Check the effective configuration

Identify how the service receives configuration before editing it. It might use a YAML config file, environment variables, process flags, or an operator-managed manifest. In etcd, a supplied configuration file takes precedence by making the other configuration flags and environment variables inapplicable to the normal option loading path. Check the service's actual invocation and the documented [configuration rules](https://etcd.io/docs/v3.6/op-guide/configuration/).

For a config-file deployment, update these keys within the existing file:

```yaml
heartbeat-interval: 100
election-timeout: 2000
```

For a deployment that uses process flags, the equivalent options are:

```text
--heartbeat-interval=100
--election-timeout=2000
```

Retain all other member settings, including identity, peer URLs, TLS, and data paths. The example fragment is not a complete server configuration. In etcd 3.6 and 3.7, [configuration validation](https://github.com/etcd-io/etcd/blob/v3.7.1/server/embed/config.go) requires positive values, an election timeout at least five times the heartbeat interval, and an election timeout no greater than 50,000 milliseconds. The five-times rule is a startup constraint; the separate ten-times-RTT guidance helps choose practical values. Check the deployed release's supported options before rollout. Very large timeouts do not make unsuitable cluster placement a good design.

## Roll out consistently without stopping quorum

All members should use the same final timing values. First verify a stable leader, healthy voting endpoints, and a recoverable backup. Record the original values and a rollback procedure in the change record.

Apply the change to one member at a time. Restart a follower, wait for it to rejoin and catch up, and verify cluster health before continuing. For three voters, never take a second member offline while the first remains unavailable. A rolling change creates a temporary mixed configuration, so keep that interval controlled and avoid unrelated maintenance during it.

Update the leader last, transferring leadership to a healthy, caught-up voter beforehand where your operational procedure supports it. If a restarted member becomes unhealthy, pause the rollout. Correct that member or restore its previous setting before touching another one. Do not push ahead just to make the configuration numerically uniform.

## Validate both stability and failure detection

Observe the cluster under the load that previously caused elections. Compare leader-change frequency, request latency, WAL fsync, and peer RTT. Fewer elections with unchanged multi-second application stalls can mean the new timeout merely concealed the symptom.

In a representative staging cluster, stop the leader deliberately and measure the interval until a new leader serves successful application operations. Also test a transient pause or network interruption appropriate to your deployment. Keep these tests isolated from production availability commitments.

If the new setting delays recovery beyond the service objective, restore the prior configuration using the same one-member-at-a-time process. A successful result balances fewer unnecessary elections with acceptable failover; it does not optimize either measure in isolation.

## Conclusion

Choose heartbeat and election settings from measured peer latency and an explicit failure-recovery budget. Rule out disk and CPU stalls first, deploy consistent values while preserving quorum, and validate genuine leader loss as well as steady-state stability.

## Official Documentation

- [etcd timing guidance](https://etcd.io/docs/v3.7/tuning/)
- [etcd configuration options](https://etcd.io/docs/v3.6/op-guide/configuration/)
- [etcd configuration validation source](https://github.com/etcd-io/etcd/blob/v3.6.0/server/embed/config.go)
- [etcd metrics](https://etcd.io/docs/v3.7/metrics/)
