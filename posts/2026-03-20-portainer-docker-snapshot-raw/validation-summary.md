# Validation Summary: How to Fix Large DockerSnapshotRaw Payloads Slowing Portainer (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- BoltDB / bbolt
- Shell scripting
- Portainer HTTP API

## Sources Consulted
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer CLI configuration options: https://docs.portainer.io/sts/advanced/cli
- Portainer architecture: https://docs.portainer.io/start/architecture
- Install Portainer Agent on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/agent
- Connect to the Docker API: https://docs.portainer.io/admin/environments/add/docker/api
- Docker image prune reference: https://docs.docker.com/reference/cli/docker/image/prune/
- Docker object pruning overview: https://docs.docker.com/engine/manage-resources/pruning/
- bbolt project documentation: https://github.com/etcd-io/bbolt
- bbolt command documentation: https://pkg.go.dev/go.etcd.io/bbolt/cmd/bbolt
- Portainer source: snapshot types and CLI validation in `api/portainer.go`, `pkg/snapshot/docker.go`, `api/cli/cli.go`, `api/http/handler/endpoints/handler.go`, `api/http/handler/docker/dashboard.go`, and `api/swagger.yaml` in https://github.com/portainer/portainer

## Issues Found
- The post described `DockerSnapshotRaw` as the entire Docker state with inspect data for all resources. Portainer's current source stores a specific snapshot payload containing container, image, volume, network, engine info, and version data. I corrected the description to match the current implementation.
- The API examples used legacy-style HTTP calls to `http://localhost:9000/api/auth` with `Username` and `Password` keys, then queried a non-existent `.../endpoints/1/docker/snapshot` endpoint. I updated the examples to use current HTTPS API calls on port `9443`, lowercase `username` / `password`, and the supported `/api/docker/{id}/dashboard` route for snapshot-growth metadata.
- The post claimed Portainer's public API could be used to measure raw snapshot byte size directly. Current Portainer code strips `DockerSnapshotRaw` from normal environment responses and does not expose that raw payload through the public endpoint-inspect API. I changed the guidance to monitor resource counts that act as practical growth indicators instead.
- The `--snapshot-interval=600` example was invalid for current Portainer. Portainer validates this flag with Go duration parsing, so a unit is required. I changed it to `--snapshot-interval=10m`.
- The text in Step 3 said reducing the snapshot interval stores fewer payloads over time. Current Portainer stores snapshots keyed by environment ID rather than keeping a time-series history in BoltDB. I corrected the explanation to say the change reduces refresh frequency and write churn instead.
- The compaction workflow was incorrect. `--compact-db` enables compaction on startup; it is not a one-shot command that exits immediately. I rewrote the database compaction examples so Portainer is restarted with `--compact-db` instead of launching a temporary container and then attempting a separate restart.
- The maintenance script would have recreated Portainer without preserving the earlier snapshot interval change. I added `--snapshot-interval=10m` to the recreated container command so the guide remains internally consistent.
- The dangling-image cleanup example used `docker rmi $(docker images -q -f "dangling=true")`, which fails when no dangling images exist. I replaced it with the supported `docker image prune -f` command.
- The environments section claimed it listed "last activity" while the command actually returned `.Status`. I corrected the description to "current status".
- The Agent section incorrectly stated that the classic Portainer Agent reduces stored snapshot payloads by sending only a summary, and it instructed users to configure the Agent URL as `tcp://host:9001`. Current Portainer documentation treats the classic Agent as a connectivity option, recommends the Edge Agent for internet-facing remote deployments, and says the environment URL should be entered without a protocol. I corrected the explanation and the configuration example.
- The monitoring script claimed to track raw snapshot size but again queried a non-existent snapshot endpoint. I replaced it with a script that monitors supported dashboard metadata and renamed the script comment to match what it actually measures.
- The conclusion overstated the impact of Agent mode on snapshot-size problems. I rewrote it so the primary fixes remain interval tuning, Docker cleanup, and database compaction, while Agent or Edge Agent usage is framed as a connectivity choice rather than a direct database-size fix.

## Review Notes
- The post still uses `portainer/portainer-ce:latest` and `portainer/agent:latest`. These tags are technically valid, but pinning a specific Portainer release or LTS tag would make the guide more reproducible over time.
- The API examples now use `curl -sk` against `https://localhost:9443` because Portainer commonly starts with a self-signed certificate on the HTTPS port.
