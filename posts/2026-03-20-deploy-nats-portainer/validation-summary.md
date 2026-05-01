# Validation Summary: How to Deploy NATS via Portainer

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Portainer
- NATS Server
- NATS JetStream
- NATS CLI
- Docker Compose / Portainer Stacks
- Python
- `nats-py`

## Sources Consulted
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add?fallback=true
- NATS server command-line flags: https://docs.nats.io/running-a-nats-service/introduction/flags
- NATS monitoring endpoints (`/healthz`, `/varz`, `/jsz`): https://docs.nats.io/running-a-nats-service/nats_admin/monitoring
- NATS JetStream consumer administration examples: https://docs.nats.io/running-a-nats-service/nats_admin/jetstream_admin/consumers
- NATS JetStream consumer concepts: https://docs.nats.io/nats-concepts/jetstream/consumers
- NATS token authentication: https://docs.nats.io/running-a-nats-service/configuration/securing_nats/auth_intro/tokens
- NATS CLI docs: https://docs.nats.io/using-nats/nats-tools/nats_cli
- Official NATS CLI repository and installation guidance: https://github.com/nats-io/natscli
- Official NATS CLI releases: https://github.com/nats-io/natscli/releases
- `nats-py` documentation: https://nats-io.github.io/nats.py/index.html
- Official `nats-py` repository examples: https://github.com/nats-io/nats.py
- Official NATS server releases: https://github.com/nats-io/nats-server/releases
- Official NATS Docker image source: https://github.com/nats-io/nats-docker

## Issues Found
- The Docker image tag was pinned to `nats:2.10-alpine`, which is outdated relative to the current official NATS server release line. I updated both image references to `nats:2.14-alpine`.
- The NATS CLI install command used `releases/latest/download/nats-linux-amd64.zip`, which no longer matches the official release asset naming. Current assets are versioned (for example `nats-0.4.0-linux-amd64.zip`), and the archive extracts into a versioned directory. I replaced the command with a working download URL and install path.
- The pub/sub smoke test published before subscribing. Core NATS subscribers only receive messages while actively subscribed, so the original sequence would not demonstrate message delivery as written. I reversed the example so the subscriber starts first and the publish happens from another terminal.
- The JetStream consumer example created a consumer and then used `nats consumer next`, but `consumer next` requires a pull consumer. Without `--pull`, the CLI prompts for a push delivery target instead. I added `--pull --defaults` so the command sequence works as shown.
- The Python example used `nc.publish()` before creating a JetStream context. Publishing to a stream subject can work that way, but the example is specifically demonstrating JetStream behavior and acknowledgment. I changed it to create the JetStream context first and publish via `js.publish()`, matching current official examples and behavior.

## Review Notes
- The NATS CLI install example is Linux AMD64-specific because the release asset itself is architecture-specific. Other platforms need the matching asset from the official release page.
- The Python example assumes the `ORDERS` stream from Step 4 already exists.
- Token authentication is valid and documented, but for stronger production security, NATS also supports credentials files, NKEY/JWT, and TLS-based approaches.
- I additionally verified the corrected CLI and Python snippets locally using official `nats-server` `v2.14.0`, `nats` CLI `v0.4.0`, and current `nats-py`.
