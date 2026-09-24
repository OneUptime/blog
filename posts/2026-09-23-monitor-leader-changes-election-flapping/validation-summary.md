# Validation Summary: How to Monitor Leader Changes and Diagnose Election Flapping

## Status

validated

## Post Type

Technical monitoring and troubleshooting guide with PromQL examples and Patroni CLI commands.

## Technologies Covered

- Patroni and patronictl
- PostgreSQL high availability, replication, and timelines
- Prometheus and PromQL
- Distributed configuration stores (DCS), leader elections, and fencing
- Load-balancer health checks and client routing

## Sources Consulted

- [Patroni REST API](https://patroni.readthedocs.io/en/latest/rest_api.html): metric names, monitoring endpoints, role-specific health checks, and history.
- [patronictl reference](https://patroni.readthedocs.io/en/latest/patronictl.html): configuration-file option, history command, cluster argument, and list --extended.
- [Patroni dynamic configuration](https://patroni.readthedocs.io/en/latest/dynamic_configuration.html): timing constraints, retry behavior, election lag threshold, and history retention.
- [Patroni replication modes](https://patroni.readthedocs.io/en/latest/replication_modes.html): timeline checks, synchronization policy, and promotion eligibility.
- [Patroni standby clusters](https://patroni.readthedocs.io/en/latest/standby_cluster.html): standby-leader role and elections.
- [Patroni watchdog support](https://patroni.readthedocs.io/en/latest/watchdog.html): process stalls, leader-lock expiry, and split-brain protection.
- [Patroni DCS failsafe mode](https://patroni.readthedocs.io/en/latest/dcs_failsafe_mode.html): demotion after lock-update failure and the optional failsafe exception.
- [Prometheus query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/): absent_over_time and changes semantics.
- [Prometheus operators](https://prometheus.io/docs/prometheus/latest/querying/operators/): grouped sum and vector/scalar comparison syntax.
- [Prometheus querying basics](https://prometheus.io/docs/prometheus/latest/querying/basics/): range selectors, lookback, and stale or removed series.
- [Prometheus jobs and instances](https://prometheus.io/docs/concepts/jobs_instances/): individual targets, identifying labels, and the up metric.

## Issues Found

1. **Incorrect timeline metric name.** Replaced `patroni_timeline` with `patroni_postgres_timeline`, the name documented for Patroni's metrics endpoint. The original name would not select the documented metric.
2. **Timeout advice attributed transient DCS-failure tolerance to TTL alone.** Clarified that `retry_timeout` controls tolerance for transient DCS/network failures before demotion. Increasing `ttl` may be necessary to maintain the documented timing inequality and delays failover dependent on lock expiry. Increasing TTL alone does not extend the DCS retry timeout.

## Review Notes

- Reviewed against current official documentation; Patroni pages identify themselves as version 4.1.5. The post targets no specific version and correctly advises checking the deployed endpoint.
- All four PromQL blocks use documented syntax and functions. Grouped role counts and the non-Boolean comparison behave as described; missing input does not manufacture a zero-valued cluster series.
- The two-minute absence expression detects complete absence for its selector, not an individual missing member while another matching member remains. The post correctly calls for separate target availability and expected-member inventory. Its cluster label must uniquely identify the intended cluster; otherwise include environment and scope matchers.
- Observed gauge transitions cannot provide an exact election count. Sampling gaps and label changes limit visibility, so preserving history and logs is appropriate.
- Both patronictl commands match the documented CLI. The configuration-file path and cluster name are deployment-specific examples; the commands require an accessible configuration and DCS.
- Confirmed the timing inequality and documented minima: loop_wait 1 second, retry_timeout 3 seconds, and ttl 20 seconds. History retention is configurable through max_timelines_history.
- Standby-cluster expectations, candidate-selection checks, separate routing diagnosis, fencing concerns, and staging validation are technically sound. DCS failures need not demote the primary when configured failsafe conditions are satisfied; the post does not claim otherwise.
- All linked technical resources resolve to the intended documentation. The author URL redirects to the matching GitHub profile.
- This was a documentation-based review. No live Patroni cluster or Prometheus deployment was used to execute the examples or perform a failover drill.
