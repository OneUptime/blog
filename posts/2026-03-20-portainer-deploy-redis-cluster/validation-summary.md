# Validation Summary: How to Deploy Redis Cluster via Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis Open Source / Redis Cluster
- Docker Compose / Portainer stacks
- Redis CLI (`redis-cli`)
- Node.js with `ioredis`
- Python with `redis-py`

## Sources Consulted
- Redis Docs: Scale with Redis Cluster — https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/
- Redis Docs: Redis cluster specification — https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/
- Redis Docs: CLUSTER INFO — https://redis.io/docs/latest/commands/cluster-info/
- Docker Docs: Control startup and shutdown order in Compose — https://docs.docker.com/compose/how-tos/startup-order/
- Docker Docs: Interpolation in Compose files — https://docs.docker.com/reference/compose-file/interpolation/
- `ioredis` README — https://github.com/redis/ioredis
- redis-py Clustering documentation — https://redis.readthedocs.io/en/v4.6.0/clustering.html

## Issues Found
1. The introduction stated that a production Redis Cluster requires at least six nodes. Redis officially recommends six nodes for deployment, but the hard minimum cluster topology is three primary nodes. I changed the wording to match the official guidance.

2. The `cluster-init` service used `depends_on` plus a fixed `sleep 10`, which is not a reliable readiness check. Docker Compose starts dependencies in order but does not wait for them to become ready. I replaced the fixed sleep with a loop that waits for each Redis node to respond to `PING` before running `redis-cli --cluster create`.

3. The application examples mixed Docker service names such as `redis-2` with host-published ports such as `6380`, which is incorrect for containers communicating on the same Docker network. I updated the examples to use the service names with port `6379`.

4. The Python example used a `startup_nodes` list of dictionaries, which is not the current documented `redis-py` cluster initialization style. I updated it to the documented `RedisCluster(host=..., port=..., password=...)` form.

5. The conclusion implied that the loss of any single node always triggers replica promotion. That is only relevant when a primary fails. I corrected the text to say the cluster remains available after a single-node loss and that a replica can be promoted if a primary fails.

## Review Notes
- The guide is now accurate for applications that run on the same Docker network as the Redis containers. For cluster-aware clients outside that network, Redis Cluster redirections require reachable advertised node addresses and ports, so additional announce-address/port configuration or host networking would be needed.
