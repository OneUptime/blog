# Validation Summary: How to Use the Swarm Visualizer in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker Swarm
- Docker CLI (`docker service`, `docker node`, `docker stack`)
- Compose/stack YAML for Swarm deployment
- `dockersamples/visualizer`

## Sources Consulted
- Portainer Documentation: Swarm — https://docs.portainer.io/user/docker/swarm
- Portainer Documentation: Cluster visualizer — https://docs.portainer.io/user/docker/swarm/cluster-visualizer
- Portainer Documentation: Scale a service — https://docs.portainer.io/user/docker/services/scale
- Portainer Documentation: View the status of a service task — https://docs.portainer.io/user/docker/services/tasks
- Portainer Documentation: View service logs — https://docs.portainer.io/user/docker/services/logs
- Docker Docs: `docker service ps` — https://docs.docker.com/reference/cli/docker/service/ps/
- Docker Docs: `docker service logs` — https://docs.docker.com/reference/cli/docker/service/logs/
- Docker Docs: `docker service scale` — https://docs.docker.com/reference/cli/docker/service/scale/
- Docker Docs: Drain a node on the swarm — https://docs.docker.com/engine/swarm/swarm-tutorial/drain-node/
- Docker Docs: `docker stack deploy` — https://docs.docker.com/reference/cli/docker/stack/deploy/
- Docker Docs: Deploy a stack to a swarm — https://docs.docker.com/engine/swarm/stack-deploy/
- `dockersamples/docker-swarm-visualizer` upstream README — https://github.com/dockersamples/docker-swarm-visualizer
- Docker Hub: `dockersamples/visualizer` tags — https://hub.docker.com/r/dockersamples/visualizer

## Issues Found

1. **The Portainer navigation path and feature naming were inaccurate.** The post described a generic "Visualizer" button on the Swarm overview page, but the current Portainer docs document this as **Swarm -> Cluster visualizer**, with links also available from the Swarm details page and dashboard. Updated the instructions and terminology to match the docs.

2. **Several visualizer UI claims were more specific than the docs support.** The original post claimed per-task status colors, direct click-through from task boxes to container details, and node-header task counts. Portainer's docs explicitly document the cluster visualizer as showing nodes and tasks, plus the **Only display running tasks** and **Display node labels** options. Rewrote this section to stay within documented behavior.

3. **The failure-diagnosis workflow mixed together visualizer behavior and service/task inspection behavior.** Portainer documents task drill-down from the **Services** task view and service logs from the **Services** log view, not from the cluster visualizer itself. I changed the text so the visualizer is used to locate placement, then the related service/task views or Docker CLI are used for deeper inspection. I also added Docker's logging-driver caveat for `docker service logs`.

4. **The drain-node explanation was too absolute.** Docker's swarm docs show that draining a node ends the task on the drained node and creates a replacement task on an active node to maintain desired state. The original wording implied that tasks always "disappear and reappear" with no caveats and that "no tasks are lost". I corrected this to describe replicated-service behavior accurately and added the important caveat that global-service tasks are removed from the drained node rather than rescheduled elsewhere.

5. **The alternative visualizer example had deployment inaccuracies and missing safety context.** The snippet labeled the file as `docker-compose.yml` but deployed `visualizer.yml`, used the outdated/inactive `dockersamples/visualizer:stable` tag instead of the current upstream-documented `dockersamples/visualizer` image, and omitted the upstream warning that this sample mounts the Docker socket and is not production-safe by default. I fixed the filename/image reference and added the security warning.

6. **The prerequisites were too strict.** The post implied Portainer must be installed on the swarm itself and that multiple nodes are required. The official Portainer docs describe the feature in terms of a Docker Swarm environment connected to Portainer; a single-node swarm can still use the feature, though multiple nodes make task distribution more meaningful. I adjusted the prerequisites accordingly.

## Review Notes
- Portainer's official name for the feature is **Cluster visualizer**, even though the post title still uses "Swarm Visualizer" as descriptive wording.
- `docker stack deploy` uses the legacy Compose v3 file format for Swarm stacks, not the full modern Compose Specification. The corrected YAML remains valid for this use case.
- The upstream `dockersamples/visualizer` image is a long-lived sample project rather than a modern production monitoring tool. For production environments, readers should treat it as a demo utility and apply Docker-socket security controls carefully.
