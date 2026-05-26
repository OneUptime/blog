# Validation Summary: How to Use Ansible to Configure Container Monitoring

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Docker
- Prometheus
- Grafana
- cAdvisor
- Prometheus Node Exporter
- Prometheus Alertmanager
- PromQL
- YAML

## Sources Consulted
- Ansible `community.docker.docker_container` module documentation: https://docs.ansible.com/ansible/latest/collections/community/docker/docker_container_module.html
- Ansible roles documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible `include_role` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_role_module.html
- Ansible `community.general.timezone` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus cAdvisor guide: https://prometheus.io/docs/guides/cadvisor/
- cAdvisor running documentation: https://github.com/google/cadvisor/blob/master/docs/running.md
- cAdvisor Prometheus metrics documentation: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana Prometheus data source provisioning documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/configure/
- Prometheus Node Exporter Docker documentation: https://github.com/prometheus/node_exporter#docker

## Issues Found
- The cAdvisor container image used the legacy `gcr.io/cadvisor/cadvisor` location. Updated it to `ghcr.io/google/cadvisor`, which is the current registry shown by the cAdvisor documentation for recent releases.
- The Prometheus Docker service discovery job used `unix:///var/run/docker.sock` but the Prometheus container did not mount the Docker socket. Added a read-only socket mount and renamed the job to `local-docker-containers` to make the scope accurate.
- The CPU alert expression compared a raw per-series CPU rate with `0.8` while describing it as 80%. Updated the expression to aggregate by container and changed the annotation to describe the threshold as more than 0.8 CPU cores.
- The memory alert divided by `container_spec_memory_limit_bytes` without excluding containers that have no memory limit. Updated the expression to use working set memory and require a positive memory limit.
- The restart alert used `container_restart_count`, which is not a cAdvisor Prometheus metric. Replaced it with `changes(container_start_time_seconds{name!=""}[1h])`, which uses a documented cAdvisor metric.
- The full deployment playbook used `tasks_from` under the play-level `roles:` keyword. Updated it to use `ansible.builtin.include_role`, where `tasks_from` is documented.
- The infrastructure example used `ansible.builtin.timezone`, but the current documented FQCN is `community.general.timezone`. Updated the module name.
- The SSH hardening `lineinfile` regexes did not match commented default settings. Updated the regexes to match both commented and uncommented directives.

## Review Notes
- The examples assume required collections such as `community.docker` and `community.general` are installed on the Ansible control node.
- The Docker socket mount allows Prometheus to discover containers on the monitoring server's local Docker daemon only. Monitoring multiple remote Docker daemons through Docker service discovery would require separately reachable Docker API endpoints or another discovery mechanism.
- Running cAdvisor, Node Exporter, and Prometheus with host mounts or Docker socket access has security implications. The snippets are technically valid, but production deployments should restrict network exposure and access to these endpoints.
