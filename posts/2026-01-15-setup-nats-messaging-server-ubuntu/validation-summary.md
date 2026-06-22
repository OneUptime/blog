# Validation Summary: How to Set Up NATS Messaging Server on Ubuntu

## Status
validated

## Post Type
Tutorial / installation and configuration guide

## Technologies Covered
- Ubuntu
- NATS Server
- NATS CLI
- JetStream
- systemd
- Docker
- NATS client libraries for Python, Go, and Node.js
- NATS authentication with tokens, users/passwords, NKeys, and JWT/accounts
- NATS clustering
- HTTP monitoring endpoints
- Prometheus NATS Exporter
- Grafana

## Sources Consulted
- NATS Server configuration documentation: https://docs.nats.io/running-a-nats-service/configuration
- NATS Server installation documentation: https://docs.nats.io/running-a-nats-service/introduction/installation
- NATS CLI documentation: https://docs.nats.io/using-nats/nats-tools/nats_cli
- NATS administration CLI documentation: https://docs.nats.io/running-a-nats-service/configuration/resource_management/configuration_mgmt/nats-admin-cli
- JetStream concepts and delivery semantics: https://docs.nats.io/nats-concepts/jetstream
- JetStream streams documentation: https://docs.nats.io/nats-concepts/jetstream/streams
- JetStream consumers documentation: https://docs.nats.io/nats-concepts/jetstream/consumers
- JetStream model deep dive: https://docs.nats.io/using-nats/developer/develop_jetstream/model_deep_dive
- NATS GitHub releases for nats-server, natscli, nsc, and prometheus-nats-exporter
- Local verification with `nats-server v2.14.2` and `nats v0.4.0` CLI help/config validation

## Issues Found
- The NATS server version was pinned to `2.10.22` while the post described the method as installing the latest stable release. Updated the example to `2.14.2` and verified the release asset exists.
- The NATS CLI install example used `0.1.5` and a `.tar.gz` asset path that is not the release artifact format. Updated it to `0.4.0`, changed the download to the `.zip` artifact, and used `unzip`.
- The prerequisite package list omitted tools used later in the tutorial. Added `jq`, `unzip`, and `netcat-openbsd`.
- The configuration validation command used `nats-server --dry-run`, which is not a valid current option. Replaced it with `nats-server -c /etc/nats/nats-server.conf -t`.
- The stream configuration command used `nats stream config`, which is not a current subcommand. Replaced it with `nats stream info ORDERS --json | jq .config`.
- Token authentication showed an empty username/password workaround and mislabeled it as `--creds`. Replaced it with the current `--token` flag.
- Password hash generation used `nats-server --gen-password`, which is not a current server option. Replaced it with `nats server passwd`.
- The NSC install example used an older release URL. Updated it to `v2.15.0` and verified the asset exists.
- The Prometheus NATS Exporter example used an older version and an invalid `linux-amd64` artifact name. Updated it to `v0.20.1` and the current `linux-x86_64` asset.
- The monitoring script compared process memory to the JetStream memory limit. Changed the alert to compare JetStream memory usage from `/jsz` to the JetStream configured memory limit.
- The health check script tested a non-existent `/jsz.disabled` field. Changed it to use `/jsz.total` to determine whether JetStream data is present.
- Several statements described JetStream as providing plain "exactly-once delivery." Adjusted the wording to match NATS documentation: JetStream provides at-least-once delivery and exactly-once semantics when using message deduplication and confirmed acknowledgments.

## Review Notes
The main NATS server configuration block was validated successfully with `nats-server v2.14.2`. The JavaScript example uses the `nats` npm package API; npm now marks that package as moved to the newer `@nats-io/*` package family, so a future modernization pass could update the Node.js section to the NATS.js v3 split-package API.
