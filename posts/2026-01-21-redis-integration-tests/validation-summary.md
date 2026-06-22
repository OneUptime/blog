# Validation Summary: How to Write Integration Tests with Redis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis
- Python
- pytest
- redis-py
- Testcontainers for Python
- Redis Cluster
- Redis Pub/Sub
- Redis Lua scripting
- Node.js
- Jest
- ioredis
- Testcontainers for Node.js
- fakeredis
- ioredis-mock
- GitHub Actions
- GitLab CI/CD

## Sources Consulted
- Redis Python client guide: https://redis.io/docs/latest/develop/clients/redis-py/
- redis-py clustering documentation: https://redis.readthedocs.io/en/stable/clustering.html
- Redis command documentation for EXPIRE, TTL, INCR, Pub/Sub, and Lua scripting: https://redis.io/docs/latest/commands/
- pytest fixtures documentation: https://docs.pytest.org/en/stable/how-to/fixtures.html
- Testcontainers for Python Redis module documentation: https://testcontainers-python.readthedocs.io/en/latest/modules/redis/README.html
- Testcontainers Redis module documentation: https://testcontainers.com/modules/redis/
- Testcontainers for Node.js container documentation: https://node.testcontainers.org/features/containers/
- Testcontainers for Node.js Redis module documentation: https://node.testcontainers.org/modules/redis/
- Jest configuration documentation: https://jestjs.io/docs/configuration
- Redis ioredis guide: https://redis.io/docs/latest/develop/clients/ioredis/
- fakeredis documentation: https://fakeredis.readthedocs.io/
- GitHub Actions Redis service container documentation: https://docs.github.com/en/actions/tutorials/use-containerized-services/create-redis-service-containers
- actions/setup-python documentation: https://github.com/actions/setup-python
- actions/checkout documentation: https://github.com/actions/checkout
- Codecov GitHub Action documentation: https://github.com/codecov/codecov-action
- GitLab CI Redis services documentation: https://docs.gitlab.com/ci/services/redis/

## Issues Found
- The Redis Pub/Sub tests used a fixed `time.sleep(0.1)` before publishing. Redis Pub/Sub does not queue messages for subscribers that are not yet subscribed, so this could race and fail intermittently. Changed both Pub/Sub tests to wait for the `subscribe` or `psubscribe` acknowledgement with a `threading.Event`.
- The Pub/Sub listener threads were non-daemon threads and could keep the test process alive if a message was missed. Changed them to daemon threads so a failed readiness or delivery assertion does not leave a blocked listener preventing process exit.
- The GitHub Actions example used outdated action versions: `actions/checkout@v3`, `actions/setup-python@v4`, and `codecov/codecov-action@v3`. Updated them to current documented versions and added the Codecov token input required by current Codecov Action guidance.
- The conclusion said database isolation or key prefixes should be used for parallel test execution. That was too broad because shared logical databases and run-level prefixes can still collide across parallel workers. Changed the wording to require per-worker database isolation or per-test key prefixes for parallel execution.

## Review Notes
- The Redis logical database examples are valid for standalone Redis, but Redis Cluster clients operate against database 0 and do not support selecting alternate logical databases. The cluster example correctly avoids a `db` parameter.
- The key-prefix cleanup example uses `KEYS`, which is acceptable for small test datasets but should be replaced with `SCAN` for large shared Redis instances.
