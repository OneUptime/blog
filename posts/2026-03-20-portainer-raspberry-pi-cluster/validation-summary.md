# Validation Summary: How to Run Portainer on a Raspberry Pi Cluster

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Raspberry Pi OS
- NetworkManager (`nmcli`)
- Docker Engine
- Docker Swarm
- Portainer CE
- YAML stack and service definitions
- Nginx

## Sources Consulted
- Raspberry Pi Documentation: https://www.raspberrypi.com/documentation/computers/configuration.html
- Raspberry Pi Blog, "Bookworm — the new version of Raspberry Pi OS": https://www.raspberrypi.com/news/bookworm-the-new-version-of-raspberry-pi-os/
- NetworkManager Reference Manual (`nmcli` examples): https://networkmanager.dev/docs/api/latest/nmcli-examples.html
- Docker Docs, Raspberry Pi OS install and convenience script guidance: https://docs.docker.com/engine/install/raspberry-pi-os/
- Docker Docs, Linux post-installation steps: https://docs.docker.com/engine/install/linux-postinstall/
- Docker Docs, `docker swarm init`: https://docs.docker.com/reference/cli/docker/swarm/init/
- Docker Docs, how Swarm nodes and manager quorum work: https://docs.docker.com/engine/swarm/how-swarm-mode-works/nodes/
- Docker Docs, join nodes to a swarm: https://docs.docker.com/engine/swarm/join-nodes/
- Docker Docs, deploy services to a swarm: https://docs.docker.com/engine/swarm/services/
- Docker Docs, drain a node on the swarm: https://docs.docker.com/engine/swarm/swarm-tutorial/drain-node/
- Portainer Documentation, install Portainer CE with Docker Swarm on Linux: https://docs.portainer.io/start/install-ce/server/swarm/linux
- Portainer current Swarm stack manifest: https://downloads.portainer.io/ce-lts/portainer-agent-stack.yml

## Issues Found
- The static IP section used `/etc/dhcpcd.conf`, which is outdated for current Raspberry Pi OS releases that use NetworkManager by default. I replaced it with `nmcli`-based static IP commands.
- The Docker install section added the user to the `docker` group but did not mention reloading group membership. I added the required `log out and back in` / `newgrp docker` note so the later `docker` commands work as written.
- The Portainer deployment step downloaded the legacy `ce2-19` stack manifest and the manual example used floating `latest` tags. I updated both to the current `ce-lts` channel and `lts` image tags to match current Portainer documentation.
- The Portainer login step used `http://<ip>:9000`, but current Portainer documentation directs users to the HTTPS UI on port `9443`. I corrected the access URL.
- The intro, description, and conclusion overstated high availability for a topology with 1 manager and 2 workers. I revised that language to describe the setup as a multi-node cluster, which matches Docker's manager quorum guidance.
- The Nginx example claimed `replicas: 3` meant one replica per Pi and that Portainer would distribute replicas across all three Pis automatically. I corrected that to describe three replicas across the cluster without implying guaranteed one-per-node placement.
- The drain-node explanation implied all containers would migrate. I clarified that eligible Swarm service tasks are rescheduled onto active nodes.

## Review Notes
- Docker's `get.docker.com` convenience script is officially documented, but Docker recommends repository-based installation for production systems. For the home-lab scenario in this post, the script remains a valid choice.
- A single-manager swarm is not control-plane highly available. If manager-node HA is a future goal, Docker recommends using 3 or 5 manager nodes.
