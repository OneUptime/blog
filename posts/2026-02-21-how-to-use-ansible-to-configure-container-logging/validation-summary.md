# Validation Summary: How to Use Ansible to Configure Container Logging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Docker logging drivers
- Docker json-file logging
- Docker Fluentd logging driver
- Fluentd
- fluent-plugin-elasticsearch
- Elasticsearch
- Kibana
- ELK / EFK logging pipelines

## Sources Consulted
- Docker Docs: Configure logging drivers - https://docs.docker.com/engine/logging/configure/
- Docker Docs: JSON File logging driver - https://docs.docker.com/engine/logging/drivers/json-file/
- Docker Docs: Fluentd logging driver - https://docs.docker.com/engine/logging/drivers/fluentd/
- Docker Docs: Local file logging driver - https://docs.docker.com/engine/logging/drivers/local/
- Ansible community.docker.docker_container module - https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_container_module.html
- Ansible community.docker.docker_image module - https://docs.ansible.com/ansible/latest/collections/community/docker/docker_image_module.html
- Ansible ansible.builtin.uri module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Fluentd Docs: Docker Logging Driver - https://docs.fluentd.org/container-deployment/docker-logging-driver
- Fluentd Docs: Docker Compose EFK example - https://docs.fluentd.org/container-deployment/docker-compose
- Fluentd Docs: Elasticsearch output plugin - https://docs.fluentd.org/output/elasticsearch
- Fluentd Docs: Output plugins and buffer configuration - https://docs.fluentd.org/output
- Fluentd Docs: Buffer plugins - https://docs.fluentd.org/buffer
- Elastic Docs: Install Elasticsearch with Docker - https://www.elastic.co/guide/en/elasticsearch/reference/current/docker.html
- Elastic Docs: Install Kibana with Docker - https://www.elastic.co/guide/en/kibana/current/docker.html
- Elastic Docs: Elasticsearch security settings - https://www.elastic.co/guide/en/elasticsearch/reference/current/security-settings.html

## Issues Found
- The Docker daemon template included comments inside the `daemon.json.j2` snippet and was fenced as YAML even though the rendered file must be valid JSON. I changed the snippet to a JSON code block with only valid JSON content.
- The daemon-level `json-file` configuration included a `tag` log option, but Docker's `json-file` driver options are `max-size`, `max-file`, `labels`, `labels-regex`, `env`, `env-regex`, and `compress`. I removed the default `docker_log_tag` value and kept `tag` only in the per-container Fluentd logging example, where it is supported.
- The Fluentd container used the stock `fluent/fluentd:v1.16-1` image while the configuration required `@type elasticsearch`. The Elasticsearch output plugin is installed separately, so I added Ansible tasks to build a local Fluentd image with `fluent-plugin-elasticsearch` installed and changed the container task to use that image.
- The Fluentd deployment mounted `/var/log/docker`, but the shown Fluentd setup receives Docker logs through the Fluentd logging driver's forward input rather than tailing host log files. I removed the unused mount and the unused Docker log directory default.
- The Fluentd parser comment said it parsed Docker JSON logs. With the Fluentd logging driver, Docker sends structured records with a `log` field; the parser only parses application log lines if those lines contain JSON. I corrected the comment and set `emit_invalid_record_to_error false` so non-JSON application log lines do not become parser errors.
- The Elasticsearch and Kibana examples used short Docker image names. Elastic's current Docker documentation uses images from `docker.elastic.co`, so I updated both image references to the Elastic Docker registry.
- The log rotation section configured external `logrotate` against Docker container log files under `/var/lib/docker/containers`. Docker warns that these files are intended for Docker daemon access, and the post already configures rotation through the `json-file` driver. I replaced the external `logrotate` task with an assertion that verifies Docker log rotation settings are defined.

## Review Notes
- The ELK example disables Elasticsearch security for a simple single-node setup. That can be useful for local testing, but Elastic does not recommend disabling security for production deployments.
- The "Common Use Cases" examples are generic Ansible workflow examples and are syntactically valid, but several are only loosely related to container logging.
