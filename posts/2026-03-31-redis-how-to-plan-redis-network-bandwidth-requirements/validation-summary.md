# Validation Summary: How to Plan Redis Network Bandwidth Requirements

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (INFO stats, RESP/RESP3 protocol, Cluster, Pub/Sub, replication)
- Python (redis-py client library, zlib compression)
- Prometheus (PromQL queries, alerting rules via redis_exporter metrics)
- AWS ElastiCache (instance type network bandwidth)
- CLI tools (redis-cli, watch, nload)

## Sources Consulted
- Redis RESP protocol specification: https://redis.io/docs/latest/develop/reference/protocol-spec/
- Redis HELLO command documentation (RESP3 version history): https://redis.io/docs/latest/commands/hello/
- Redis INFO command documentation (stats section): https://redis.io/docs/latest/commands/info/
- Redis Cluster specification (cluster bus port): https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- RESP3 specification: https://github.com/redis/redis-specifications/blob/master/protocol/RESP3.md
- AWS ElastiCache supported node types and network bandwidth specifications
- redis-py documentation for protocol parameter and pipeline API
- Prometheus redis_exporter metric naming conventions

## Issues Found

1. **RESP3 minimum Redis version (line 225)**: The post stated "Redis 7+ with RESP3 protocol reduces some metadata overhead." RESP3 was introduced in Redis 6.0.0 (via the HELLO command), not Redis 7. Changed to "Redis 6+". Redis 7 brought full maturity but 6.0 introduced the protocol.

2. **AWS ElastiCache network bandwidth (lines 174-176)**: Two instance types had incorrect bandwidth figures:
   - `cache.r6g.large` was listed as "Up to 12.5 Gbps" — corrected to "Up to 10 Gbps" per AWS documentation.
   - `cache.r6g.4xlarge` was listed as "Up to 25 Gbps" — the 25 Gbps figure applies to r6g.16xlarge, not r6g.4xlarge (which is Up to 10 Gbps). Changed instance type to `cache.r6g.16xlarge` to maintain the intended progression of low/medium/high bandwidth tiers with accurate numbers.

3. **Rate limiting bandwidth estimate (line 155)**: The table listed ~80 Mbps for rate limiting at 200,000 ops/sec with 50B values at 50/50 read/write. Using the post's own formula, those parameters yield ~216 Mbps — a significant underestimate. Additionally, rate limiting counters are typically small integers (~8 bytes), not 50 bytes. Changed to 8B average value and ~150 Mbps, which is consistent with the formula and realistic for the workload.

4. **NIC headroom multiplier inconsistency (line 108)**: The Python code used a 2x headroom multiplier (`total_mbps / 1000 * 2`) while the text in "Network Interface Sizing Recommendations" recommends 3-4x headroom. Changed the code to use 3x to be consistent with the text's recommendation.

## Review Notes
- The `write_response_bytes = 10` in the Python code has a comment `# +OK\r\n` but `+OK\r\n` is actually 5 bytes. The value of 10 provides a small buffer which is reasonable for capacity planning estimates, so this was left as-is.
- The Pub/Sub row in the bandwidth table uses "0/100" read/write ratio which doesn't map cleanly to the GET/SET-based formula (Pub/Sub uses PUBLISH/SUBSCRIBE, not SET/GET). The asterisk note about subscriber fan-out is correct and important. The ~800 Mbps estimate is reasonable for the publish-side bandwidth.
- The Prometheus metric names (`redis_net_input_bytes_total`, `redis_net_output_bytes_total`) follow the standard redis_exporter naming convention. The PromQL queries and alerting YAML are syntactically correct.
- The redis-py `protocol=3` parameter requires redis-py 5.0+. The post does not mention this version requirement, which could be noted in a future update.
