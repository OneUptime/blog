# Validation Summary: How to Run Grafana in a Podman Container

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Grafana
- Grafana Docker/OCI container images
- Grafana provisioning
- Grafana HTTP API
- Prometheus data source configuration
- Elasticsearch data source configuration
- SELinux volume relabeling

## Sources Consulted
- Grafana Docker image installation documentation: https://grafana.com/docs/grafana/latest/setup-grafana/installation/docker/
- Grafana Docker image configuration documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-docker/
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana Elasticsearch data source configuration documentation: https://grafana.com/docs/grafana/latest/datasources/elasticsearch/configure/
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/reference/dashboard/
- Grafana HTTP API documentation: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/
- Podman run documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman volume create documentation: https://docs.podman.io/en/stable/markdown/podman-volume-create.1.html

## Issues Found
- The container examples used the short image name `grafana/grafana:latest` after pulling `docker.io/grafana/grafana:latest`. Updated the examples to use the fully qualified `docker.io/grafana/grafana:latest` image reference consistently, which avoids short-name resolution ambiguity in Podman.
- The custom configuration example used `GF_INSTALL_PLUGINS` as a runtime environment variable. Grafana's current Docker documentation uses `GF_PLUGINS_PREINSTALL` for runtime plugin installation; `GF_INSTALL_PLUGINS` is documented as a build argument for custom images. Updated the command and summary wording accordingly.
- The custom and provisioned examples reused the same `grafana-data` volume as the earlier persistent example. Because Grafana initializes admin credentials in its database and stores SQLite data under `/var/lib/grafana`, reusing the same data volume across separate example containers can make later credential examples fail and risks multiple containers sharing the same database. Updated those examples to use `grafana-custom-data` and `grafana-provisioned-data`.
- The Elasticsearch provisioning example included `jsonData.esVersion`, which is not part of the current official Elasticsearch provisioning examples or the current common provisioning settings. Removed it and kept the current `index` and `timeField` fields.

## Review Notes
Podman was not installed in the local review environment, so CLI behavior was checked against official Podman documentation rather than local `podman --help` output. The examples use the mutable `latest` tag, which is acceptable for a getting-started tutorial but a future production-focused revision should pin a specific Grafana version.
