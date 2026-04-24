# Validation Summary: How to Scale Individual Microservices in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker Swarm
- Docker stack / Compose file for Swarm stacks
- Docker CLI
- JavaScript (`fetch`)

## Sources Consulted
- Portainer Documentation: Services — https://docs.portainer.io/user/docker/services
- Portainer Documentation: Scale a service — https://docs.portainer.io/user/docker/services/scale
- Portainer Documentation: Inspect or edit a stack — https://docs.portainer.io/sts/user/docker/stacks/edit
- Docker Docs: Deploy a stack to a swarm — https://docs.docker.com/engine/swarm/stack-deploy/
- Docker Docs: `docker service scale` — https://docs.docker.com/reference/cli/docker/service/scale/
- Docker Docs: `docker service ps` — https://docs.docker.com/reference/cli/docker/service/ps/
- Docker Docs: Compose Deploy Specification — https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs: Manage swarm service networks / service discovery — https://docs.docker.com/engine/swarm/networking/
- Docker Docs: Use Swarm mode routing mesh — https://docs.docker.com/engine/swarm/ingress/
- Docker Docs: `docker container stats` — https://docs.docker.com/reference/cli/docker/container/stats/

## Issues Found
1. **Portainer scaling scope was overstated.** The post said Portainer provides UI-based scaling for Docker Swarm mode and Compose stacks. Portainer's Services menu is only available for Docker Swarm endpoints. I corrected the introduction to make the UI scaling section explicitly Swarm-only, and clarified that stack-file scaling applies to stacks deployed to Swarm and requires a redeploy.

2. **Portainer UI steps did not match the documented workflow.** The original instructions said to open `Swarm > Services`, click into the service, change replicas, and click Update. Portainer's documentation shows scaling from the Services list using the `scale` action and applying with the tick icon. I updated the steps to match the documented UI flow.

3. **The load-balancing explanation conflated VIP service discovery with the routing mesh.** Internal service-to-service traffic in Swarm uses service discovery with a VIP by default, while the routing mesh applies to published ports and external traffic distribution. I split those behaviors so the explanation matches Docker's networking model.

4. **The auto-scaling script was incorrect.** The original script passed `docker service ps -q` output into `docker stats`. `docker service ps -q` returns task IDs, while `docker stats` operates on containers. The script also implied cluster-wide CPU-based scaling from a single command without handling multi-node metric collection. I replaced it with a technically correct example showing the scaling action an external monitoring/controller process can invoke on a manager node.

5. **Replica monitoring claims were too specific.** The post said Portainer shows current and desired replica counts and that endpoint monitoring alerts if all replicas are unhealthy. I tightened this to the verified behavior: Portainer lets you confirm service tasks are running after scaling, and endpoint monitoring alerts if the service becomes unavailable.

6. **Swarm scheduling language was slightly misleading.** "Distributes the new replicas across nodes" suggested an even spread guarantee. I changed this to say Swarm schedules replicas onto available nodes, which is the behavior Docker documents.

## Review Notes
- The Compose example is valid for Swarm stacks because `deploy.replicas` is part of the Compose Deploy Specification and is used when deploying a stack to Swarm. It should not be read as a generic `docker compose up` scaling example on Docker Standalone, where `deploy` may be ignored.
- The JavaScript `fetch('http://user-service:3001/users')` example is valid as an in-network service-to-service example, assuming the caller is on the same Swarm overlay network and the target service listens on port `3001`.
