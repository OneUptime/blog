# Validation Summary: How to Use Portainer for Logistics and Supply Chain

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Portainer Edge Agent and Edge Stacks
- Portainer HTTP API
- Docker and Docker Compose
- Bash and Python 3 CLI usage
- PostgreSQL
- InfluxDB 2
- Grafana
- Apache Kafka and ZooKeeper

## Sources Consulted
- Portainer Documentation, "Install Portainer BE with Docker on Linux" - https://docs.portainer.io/start/install/server/docker/linux
- Portainer Documentation, "Install Edge Agent Standard on Docker Standalone" - https://docs.portainer.io/admin/environments/add/docker/edge
- Portainer Documentation, "Updating the Edge Agent" - https://docs.portainer.io/start/upgrade/edge
- Portainer Documentation, "Edge Stacks" - https://docs.portainer.io/user/edge/stacks
- Portainer Documentation, "Add a new Edge Stack" - https://docs.portainer.io/user/edge/stacks/add
- Portainer Documentation, "How Relative Path Support works in Portainer" - https://docs.portainer.io/advanced/relative-paths
- Portainer agent repository README (official), Edge mode environment variables - https://github.com/portainer/agent/blob/develop/README.md
- Portainer server source (official), `edgestack_update.go` - https://github.com/portainer/portainer/blob/develop/api/http/handler/edgestacks/edgestack_update.go
- Portainer server source (official), `edgestack_update_test.go` - https://github.com/portainer/portainer/blob/develop/api/http/handler/edgestacks/edgestack_update_test.go
- Portainer server source (official), `portainer.go` constants for deployment and endpoint types - https://github.com/portainer/portainer/blob/develop/api/portainer.go
- Docker Docs, "Compose Deploy Specification" - https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs, "Interpolation" - https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/
- Docker Docs, "Secrets in Compose" - https://docs.docker.com/compose/how-tos/use-secrets/
- Docker Docs, "Services" - https://docs.docker.com/reference/compose-file/services/
- Docker Docs, "Volumes" - https://docs.docker.com/reference/compose-file/volumes/
- InfluxDB OSS v2 Documentation, "Install InfluxDB using Docker Compose" - https://docs.influxdata.com/influxdb/v2/install/use-docker-compose/
- InfluxDB OSS v2 Documentation, "Upgrade from InfluxDB 1.x to 2.8 with Docker" - https://docs.influxdata.com/influxdb/v2/install/upgrade/v1-to-v2/docker/
- Grafana Documentation, "Configure a Grafana Docker image" - https://grafana.com/docs/grafana/latest/setup-grafana/configure-docker/
- Confluent Documentation, "Configure a Multi-Node Environment with Docker" - https://docs.confluent.io/platform/7.4/kafka/multi-node.html
- Confluent Documentation, "Docker Configuration Parameters for Confluent Platform" - https://docs.confluent.io/platform/7.5/installation/docker/config-reference.html

## Issues Found
- The Portainer server and agent examples used floating `latest` tags. Portainer documents matching server and agent versions, so I changed both examples to the `lts` tag to keep them aligned.
- The facility provisioning script mixed privileged and unprivileged Docker installation steps. I changed the Docker installer to run with `sudo`, enabled Docker with `--now`, and used `sudo docker run` so the script works immediately instead of relying on a future shell re-login.
- The Edge Agent example used `EDGE_SERVER_HOST` as though it pointed to the central Portainer server. In Portainer's official agent documentation, that variable controls the local Edge UI bind address, not the Portainer server URL, so I removed it and added the documented Docker volume mounts used by the standard Edge Agent deployment.
- The WMS stack mixed Compose file-based secrets with environment-variable interpolation in a way that would not work as written for an uploaded Edge Stack. I simplified the example to use a single `DB_PASSWORD` environment variable consistently for both the application and PostgreSQL.
- The cold-chain example configured InfluxDB 2 without the required setup variables and did not pass authentication details to the services talking to InfluxDB. I added the documented InfluxDB initialization settings plus org, bucket, and token environment variables for the dependent services, and added the missing named volume declarations.
- The route optimization example used `resources` as a top-level service key. In the Compose spec, resource limits belong under `deploy.resources`, so I moved the CPU and memory limits there.
- The rollout script used the Portainer base URL without the `9443` port even though the install example exposes Portainer on `9443`. I corrected the URL to match the documented deployment.
- The rollout script collapsed multiline Compose content by echoing an unquoted shell variable into Python, which would break the uploaded stack definition. I changed it to serialize the `sed` output directly from stdin so newlines are preserved.
- The rollout script sent `UpdateVersion: 2` to the Edge Stack update API. Portainer's current handler expects a boolean, and the request also needs the Compose deployment type, so I changed the payload to `UpdateVersion: true` and added `DeploymentType: 0`.
- The Kafka example omitted the single-broker settings Confluent documents for ZooKeeper mode. I added `KAFKA_BROKER_ID`, `KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1`, and an explicit dependency on ZooKeeper.

## Review Notes
- The Kafka section is still valid for the pinned `7.4.0` image, but ZooKeeper mode is deprecated in Confluent Platform 7.5 and removed in 8.x. A future refresh should migrate this example to KRaft.
- The Compose files still include `version: '3.8'`. Docker treats that as backward-compatible but obsolete; I left it in place because it still parses and removing it was not required to correct the post.
- The post uses `portainer/portainer-ee`, so readers still need a Portainer Business Edition license or eligible free entitlement for the deployment example.
