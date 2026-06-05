# Validation Summary: How to Monitor Redis Cluster Node Status, Slot Coverage, and Replication

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Redis Cluster
- Redis `CLUSTER INFO` and `CLUSTER NODES`
- OpenTelemetry Collector Contrib Redis receiver
- redis-py
- Docker Compose

## Sources Consulted
- Redis `CLUSTER INFO` command documentation: https://redis.io/docs/latest/commands/cluster-info/
- Redis `CLUSTER NODES` command documentation: https://redis.io/docs/latest/commands/cluster-nodes/
- Redis Cluster scaling and cluster creation documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/
- Redis Cluster specification: https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- OpenTelemetry Collector Redis receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/redisreceiver/README.md
- OpenTelemetry Collector Redis receiver metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/redisreceiver/metadata.yaml
- OpenTelemetry Collector configuration environment variable documentation: https://opentelemetry.io/docs/collector/configuration/#environment-variables
- redis-py cluster command documentation: https://redis.readthedocs.io/en/v7.1.0/_modules/redis/commands/cluster.html

## Issues Found
- The Collector configuration used older environment variable syntax (`${REDIS_PASSWORD}`). Updated it to `${env:REDIS_PASSWORD}`, which matches current OpenTelemetry Collector documentation.
- The post stated that cluster-specific metrics require a custom script. Updated the Collector configuration and surrounding text to show that the Redis receiver can collect Redis Cluster metrics such as slot counts and cluster state when those metrics are explicitly enabled.
- The node-down alert referenced `redis_up`, which is a Prometheus Redis exporter-style metric and is not emitted by the OpenTelemetry Redis receiver. Changed the condition to alert on missing `redis.uptime` for the Redis node resource.
- The Docker Compose example started Redis servers in cluster mode but did not create a cluster or assign slots. Updated it to define six Redis nodes and a `redis-cli --cluster create ... --cluster-replicas 1 --cluster-yes` initialization service.
- The Docker Compose Redis node ports did not match the receiver endpoints for nodes 2 and 3. Updated the Compose mappings so each service listens on port 6379 inside the Docker network while exposing distinct host ports.
- The summary still implied slot coverage and cluster state always require a custom script. Updated it to distinguish Redis receiver cluster metrics from script-based checks that are not exposed by the backend, such as node role counts.

## Review Notes
The alert conditions remain pseudo-configuration rather than a complete rules file for a specific alerting engine. Metric names may need backend-specific normalization if exported to Prometheus or another system that rewrites OpenTelemetry metric names and resource attributes.
