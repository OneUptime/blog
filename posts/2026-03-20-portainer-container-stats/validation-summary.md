# Validation Summary: How to Monitor Container CPU and Memory Stats in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Docker Compose
- cAdvisor
- Prometheus
- Grafana

## Sources Consulted
- Portainer documentation: View container statistics - https://docs.portainer.io/user/docker/containers/stats
- Docker CLI reference: `docker container stats` - https://docs.docker.com/reference/cli/docker/container/stats/
- Docker Compose services reference (`cpus`, `deploy`, service attributes) - https://docs.docker.com/reference/compose-file/services/
- Docker Compose version top-level element reference - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Engine resource constraints - https://docs.docker.com/engine/containers/resource_constraints/
- Docker Engine restart policies - https://docs.docker.com/engine/containers/start-containers-automatically/
- Prometheus guide: Monitoring Docker container metrics using cAdvisor - https://prometheus.io/docs/guides/cadvisor/
- Prometheus download page - https://prometheus.io/download/
- cAdvisor upstream README / quick start - https://github.com/google/cadvisor
- Grafana Docker installation docs - https://grafana.com/docs/grafana/latest/setup-grafana/installation/docker/
- Grafana 13.0.1 download page - https://grafana.com/grafana/download/13.0.1

## Issues Found
- The access steps relied on a list-page stats icon, while Portainer's current docs document the supported flow as `Containers` -> container -> `Stats`. I updated Step 1 to match the official navigation path.
- The CPU explanation treated `100%` as full use of all host cores. Docker's stats calculation scales by the number of online CPUs, so usage can exceed `100%` on multi-core hosts. I corrected the explanation and examples to show `400%` on a fully saturated 4-core host and `200%` for a 2-CPU limit.
- The "high CPU" example used `deploy.resources.limits.cpus` in a generic Compose snippet. Docker documents `deploy` as optional and ignored if not implemented, while service-level `cpus` is the direct Compose setting for CPU limits. I changed the example to `cpus: 2.0`.
- The memory section implied that continuous growth proves a leak and that a memory limit automatically kills and restarts the container. I corrected this to "may have a memory leak" under similar workload and clarified that automatic restart requires a restart policy.
- The persistent monitoring stack used obsolete Compose `version` syntax, an outdated cAdvisor image registry/tag, and older Prometheus and Grafana image versions. I updated the stack to current upstream references, added cAdvisor's current recommended `/dev/disk` and `/dev/kmsg` access, and changed the wording so the example is presented as a generic Compose-based monitoring stack rather than a Portainer-specific deployment flow.

## Review Notes
- The separate `prometheus.yml` file remains valid for standard Docker Compose deployments. If a reader deploys the stack through Portainer, the exact handling of `./prometheus.yml` depends on the deployment method and whether relative path support is available.
- Grafana's current Docker docs recommend the Enterprise image by default, but they also document `grafana/grafana` as the supported OSS image, so the post's OSS image choice remains technically valid.
- Commands and configuration were checked against current official documentation. They were not executed in this workspace because Docker is not installed here.
