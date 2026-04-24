# Validation Summary: How to Create Services in Portainer on Docker Swarm - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Swarm
- Docker Engine CLI (`docker service create`, `docker service ls`, `docker service ps`)
- Docker overlay networking and routing mesh
- Traefik Docker labels

## Sources Consulted
- Portainer Documentation: Add a new service — https://docs.portainer.io/user/docker/services/add
- Portainer Documentation: Configure service options — https://docs.portainer.io/user/docker/services/configure
- Portainer Documentation: Services — https://docs.portainer.io/user/docker/services
- Portainer Documentation: View the status of a service task — https://docs.portainer.io/sts/user/docker/services/tasks
- Portainer Documentation: View service logs — https://docs.portainer.io/sts/user/docker/services/logs
- Portainer Documentation: Docker roles and permissions — https://docs.portainer.io/advanced/docker-roles-and-permissions
- Docker Docs: Deploy services to a swarm — https://docs.docker.com/engine/swarm/services/
- Docker Docs: Manage swarm service networks — https://docs.docker.com/engine/swarm/networking/
- Docker Docs: Use Swarm mode routing mesh — https://docs.docker.com/engine/swarm/ingress/
- Docker Docs: `docker service create` — https://docs.docker.com/reference/cli/docker/service/create/
- Docker Docs: `docker service ps` — https://docs.docker.com/reference/cli/docker/service/ps/
- Traefik Documentation: Docker routing configuration — https://doc.traefik.io/traefik/reference/routing-configuration/other-providers/docker/

## Issues Found
- The placement constraint examples used spaced expressions (`node.role == worker`, `node.labels.zone == us-east`). Docker documents constraint expressions without spaces around the operator, so these were corrected to `node.role==worker` and `node.labels.zone==us-east`.
- The `Host` port-publishing explanation omitted an important Swarm limitation. I added a note that a fixed published port in `host` mode can only be bound by one task per node.
- The storage section used a named-volume example without the Swarm caveat that the default `local` volume driver is node-local rather than automatically shared across replicas. I added that note and also clarified that bind-mount source paths must exist on every eligible node.
- The verification section described task inspection through the service name, but Portainer documents task inspection via the down-arrow in the Services list. I corrected the navigation and separated task inspection from service-log/update access.
- The CLI verification block mixed `docker service ls` and `docker service ps` under one "Expected output" heading and did not mention that `docker service` commands must be run on a swarm manager node. I split the examples and added the manager-node note.
- The Docker CLI example was described as an "equivalent" command even though it only represented a subset of the earlier settings. I changed the wording to "comparable" and aligned the example with the documented service-create flags used in the post.

## Review Notes
- The article is technically relevant and remains salvageable; it is now accurate after the corrections above.
- Portainer operator access is valid for service creation, subject to Portainer RBAC/security settings documented for Docker Swarm environments.
- The Traefik label syntax shown in the labels example is valid.
- Docker was not installed in the local review environment, so CLI verification was performed against official Docker documentation rather than local `--help` output.
- The review was performed against current Portainer and Docker documentation available on 2026-04-24; the post does not pin specific product versions.
