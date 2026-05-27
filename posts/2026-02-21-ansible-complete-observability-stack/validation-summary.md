# Validation Summary: How to Use Ansible to Set Up a Complete Observability Stack

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- community.docker Ansible collection
- Docker containers and bridge networking
- Prometheus
- Grafana Loki
- Grafana Tempo
- Grafana provisioning
- OpenTelemetry Protocol
- UFW
- Cron

## Sources Consulted
- Ansible `community.docker.docker_container` module documentation: https://docs.ansible.com/ansible/latest/collections/community/docker/docker_container_module.html
- Ansible `community.docker.docker_network` module documentation: https://docs.ansible.com/ansible/latest/collections/community/docker/docker_network_module.html
- Ansible `ansible.builtin.file` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible `community.general.timezone` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Docker bridge network driver documentation: https://docs.docker.com/engine/network/drivers/bridge/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana Docker image documentation: https://grafana.com/docs/grafana/latest/setup-grafana/installation/docker/
- Grafana Loki configuration documentation: https://grafana.com/docs/loki/latest/configuration/
- Grafana Tempo command-line flags documentation: https://grafana.com/docs/tempo/latest/setup/command-line-flags/
- OpenTelemetry Collector Docker installation documentation: https://opentelemetry.io/docs/collector/install/docker/
- OpenTelemetry Protocol specification: https://opentelemetry.io/docs/specs/otlp/

## Issues Found
- The Docker container examples used container hostnames such as `prometheus`, `loki`, and `tempo` from Grafana without attaching the containers to a user-defined Docker network. Docker's default bridge network does not provide automatic container-name DNS resolution. Added an `observability_network` default, a `community.docker.docker_network` task, and attached the Prometheus, Loki, Tempo, and Grafana containers to that network.
- The Grafana provisioning file was copied after the Grafana container was started. Grafana provisioning files are loaded during startup, so the data sources could be missed until a restart. Moved the provisioning directory and file tasks before the Grafana container task.
- The Grafana data source URLs used host-published port variables. Containers on the same Docker network should connect to the services on their container ports, so the URLs now use `prometheus:9090`, `loki:3100`, and `tempo:3200`.
- The configuration tasks wrote into `/etc/prometheus`, `/etc/loki`, `/etc/tempo`, and `/etc/grafana/provisioning/datasources` without ensuring those directories existed. Added `ansible.builtin.file` directory tasks.
- The Tempo OTLP gRPC port mapping hard-coded `4317` instead of using the role default variable. Updated it to `{{ otel_grpc_port }}:4317`.
- The summary stated that the OpenTelemetry Collector was deployed as the unified ingestion point, but the post does not include a Collector deployment. Revised the text to say that Tempo exposes an OTLP tracing endpoint and that a Collector can be added in front for unified ingestion.
- The infrastructure example used `ansible.builtin.timezone`, but the current module is `community.general.timezone`. Updated the module name.

## Review Notes
The snippets still use `latest` container image tags, which is technically valid but not ideal for reproducible production deployments. The post also references template files for Prometheus, Loki, and Tempo configuration without showing their contents, so the review verified the Ansible task structure and command-line flags rather than those omitted template bodies.
