# Validation Summary: How to Store Database Passwords as Podman Secrets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman secrets
- Podman CLI
- PostgreSQL official container image
- MySQL official container image
- MongoDB official container image
- Redis official container image
- Python, Node.js, and Go file-reading examples

## Sources Consulted
- Podman `podman run --secret` documentation: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html
- Podman secret inspect documentation: https://docs.podman.io/en/stable/markdown/podman-secret-inspect.1.html
- PostgreSQL Docker Official Image documentation: https://hub.docker.com/_/postgres/
- MySQL Docker Official Image documentation: https://hub.docker.com/_/mysql
- MongoDB Docker Official Image documentation: https://hub.docker.com/_/mongo
- Redis Docker Official Image documentation: https://hub.docker.com/_/redis

## Issues Found
- The Redis example passed the password into `redis-server --requirepass` through shell command substitution. That can expose the resolved password in the Redis process command line, which conflicts with the post's claim about keeping passwords out of process tables. I changed the example to store a Redis config directive as a Podman secret and run `redis-server` with the mounted secret config file.
- The summary said "Most official database images" support `_FILE`. The official PostgreSQL, MySQL, and MongoDB images documented in the post do support `_FILE` for the shown variables, but Redis does not use that convention in the example. I changed the wording to "Many official database images" and clarified that the process-table benefit applies when the image reads the mounted secret file directly.

## Review Notes
Podman was not installed in the local environment, so CLI behavior was validated against the official Podman documentation instead of local `--help` output. The PostgreSQL, MySQL, and MongoDB `_FILE` variables shown in the post match their official image documentation.
