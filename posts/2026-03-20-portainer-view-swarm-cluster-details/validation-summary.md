# Validation Summary: How to View Swarm Cluster Details in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Swarm
- Docker CLI
- Docker networking
- Docker configs and secrets
- Prometheus
- Grafana

## Sources Consulted
- Portainer Dashboard: https://docs.portainer.io/sts/user/docker/dashboard
- Portainer Swarm Details: https://docs.portainer.io/sts/user/docker/swarm/details
- Portainer Cluster visualizer: https://docs.portainer.io/2.27/user/docker/swarm/cluster-visualizer
- Portainer Services: https://docs.portainer.io/user/docker/services
- Portainer View the status of a service task: https://docs.portainer.io/sts/user/docker/services/tasks
- Portainer Networks: https://docs.portainer.io/sts/user/docker/networks
- Portainer Configs: https://docs.portainer.io/user/docker/configs
- Portainer Secrets: https://docs.portainer.io/user/docker/secrets
- Portainer Add a Docker Swarm environment: https://docs.portainer.io/sts/admin/environments/add/swarm
- Docker manage nodes in a swarm: https://docs.docker.com/engine/swarm/manage-nodes/
- Docker `docker node rm`: https://docs.docker.com/reference/cli/docker/node/rm/
- Docker `docker network ls`: https://docs.docker.com/reference/cli/docker/network/ls/
- Docker `docker network inspect`: https://docs.docker.com/reference/cli/docker/network/inspect/
- Docker secrets: https://docs.docker.com/engine/swarm/secrets/

## Issues Found
- The prerequisites implied Portainer had to be installed on the Swarm itself, required a worker node, and required admin access. I updated this to the accurate requirement: a Docker Swarm environment added to Portainer, at least one manager node, and environment access.
- The dashboard summary listed Configs, Secrets, and Nodes as dashboard summary items. I updated Step 2 to match current Portainer docs, which document cluster information plus summary tiles for stacks, services, containers, images, networks, and volumes.
- The Swarm details section described undocumented cluster fields and incorrect node-status values. I updated Step 3 to match the documented cluster status fields and node summary information exposed in Portainer.
- The node detail section included fields not documented in Portainer's Swarm node overview and implied a row click instead of selecting the node name. I updated the text and example to align with documented node overview information.
- The post said service tasks could be viewed from the node detail page. I updated Step 5 to use the documented Services view for service tasks, and pointed readers to the cluster visualizer for node placement.
- The visualizer path used `Swarm → Visualizer`. I updated this to the documented `Swarm → Cluster visualizer`.
- The post claimed a Swarm node `Stats` view for CPU and memory usage. I updated Step 7 to reflect documented per-node CPU and memory availability in Swarm views and to direct live utilization monitoring to external tooling.
- The Configs and Secrets navigation paths were wrong. I updated them from `Swarm → Configs/Secrets` to the top-level `Configs` and `Secrets` menus documented by Portainer.
- The node status interpretation table used an invalid `Disconnected` row and mixed status and availability semantics. I corrected the table to use documented Swarm node states and availability meanings.
- The troubleshooting example labeled `docker node rm worker-01` as a force-removal command. I corrected it to `docker node rm --force worker-01`, which matches Docker's CLI reference for inaccessible nodes.

## Review Notes
- Portainer’s current official docs describe cluster and node capacity/configuration views for Swarm, but they do not document a dedicated live per-node Swarm stats page comparable to container stats. External monitoring remains the correct recommendation for live utilization.
- The cluster visualizer reference available in search results was the official Portainer LTS documentation page rather than the latest generic path, but the feature description and navigation matched current Swarm behavior.
- Sample values such as node counts, CPU totals, memory totals, and Docker API versions remain illustrative examples rather than exact outputs from a live cluster.
