# Validation Summary: How to Use Redis in GitHub Actions Workflows

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (7.2)
- GitHub Actions (service containers, workflow YAML)
- Docker (container networking, health checks, cluster setup)
- Node.js (npm test runner)
- Python (pytest, redis-py client library)
- Bitnami Redis Docker image

## Sources Consulted
- Official Redis Docker image documentation — https://hub.docker.com/_/redis
- Bitnami Redis Docker image documentation — https://hub.docker.com/r/bitnami/redis
- Bitnami Redis container README — https://github.com/bitnami/containers/blob/main/bitnami/redis/README.md
- GitHub Actions service containers documentation — https://docs.github.com/en/actions/using-containerized-services/about-service-containers
- GitHub Actions creating Redis service containers guide — https://docs.github.com/en/actions/guides/creating-redis-service-containers
- GitHub Actions runner images (installed software) — https://github.com/actions/runner-images
- Redis SET command documentation — https://redis.io/commands/set
- Redis Cluster tutorial — https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/
- redis-cli cluster create documentation — https://redis.io/learn/operate/redis-at-scale/scalability/redis-cli-with-redis-cluster

## Issues Found

### Issue 1: `REDIS_PASSWORD` env var not supported by official Redis image
- **What was wrong:** The "Redis with Password Authentication" section used `env: REDIS_PASSWORD: testpassword` with the `redis:7.2-alpine` image. The official Redis Docker image does not read the `REDIS_PASSWORD` environment variable, so the server would start without password protection. This would cause tests connecting with `redis://:testpassword@localhost:6379` to fail because the client sends AUTH to a server that doesn't require it.
- **What was changed:** Replaced the image with `bitnami/redis:7.2`, which natively supports the `REDIS_PASSWORD` environment variable. Added a note in the text explaining that `bitnami/redis` is used because it supports password configuration through environment variables.
- **Why:** The Bitnami Redis image is a widely-used alternative that reads `REDIS_PASSWORD` and configures `requirepass` automatically, making the service container approach work correctly for password-protected Redis.

### Issue 2: Incorrect mention of Docker Compose
- **What was wrong:** The "Redis Cluster Simulation" section text said "use Docker Compose via a setup step" but the example code uses `docker run` and `docker exec` commands directly, not Docker Compose.
- **What was changed:** Changed "use Docker Compose via a setup step" to "use Docker commands in a setup step."
- **Why:** The description should accurately reflect the approach used in the example code.

### Issue 3: `redis-cli` not pre-installed on GitHub Actions runners
- **What was wrong:** The "Caching Build Artifacts with Redis" section used `redis-cli -h localhost` directly, but `redis-cli` (from the `redis-tools` package) is not pre-installed on `ubuntu-latest` GitHub Actions runners. The step would fail with "command not found."
- **What was changed:** Added a preceding step to install `redis-tools` via apt: `sudo apt-get update && sudo apt-get install -y redis-tools`.
- **Why:** The runner needs `redis-tools` installed before `redis-cli` commands can be used on the host.

## Review Notes
- The Redis Cluster Simulation example creates a minimal 3-node cluster with `--cluster-replicas 0`. This works for basic cluster behavior testing, but clients connecting from the host (via mapped ports 7001-7003) may encounter issues with cluster redirects, since the cluster internally knows nodes by their Docker network hostnames (redis-7001, redis-7002, redis-7003) which are not resolvable from the host. This is a known limitation of running Redis Cluster in Docker and is acceptable for a basic simulation example.
- The `sleep 3` before `redis-cli --cluster create` is a reasonable but fragile wait for nodes to be ready. A more robust approach would poll each node, but this is acceptable for a tutorial.
- All Python code examples (redis-py usage, pytest fixtures) are syntactically correct and use current APIs.
- The basic GitHub Actions workflow YAML structure, health check options, and action versions (actions/checkout@v4, actions/setup-node@v4, actions/setup-python@v5) are all current.
