# Validation Summary: How to Configure Container DNS Settings in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Docker Engine networking
- Docker Compose / Compose file syntax
- Docker daemon configuration (`daemon.json`)
- Kubernetes DNS concepts
- Linux resolver configuration (`resolv.conf`)

## Sources Consulted
- Portainer Documentation, "Add a new container": https://docs.portainer.io/user/docker/containers/add
- Portainer Documentation, "Advanced container settings": https://docs.portainer.io/user/docker/containers/advanced
- Portainer Documentation, "Add a new stack": https://docs.portainer.io/user/docker/stacks/add?fallback=true
- Docker Docs, "Networking" (DNS services): https://docs.docker.com/network/
- Docker Docs, "Services" (Compose `dns`, `dns_search`, `dns_opt`): https://docs.docker.com/reference/compose-file/services/
- Docker Docs, "`dockerd` reference" (`dns`, `dns-search`, `dns-opts`): https://docs.docker.com/reference/cli/dockerd/
- Docker Docs, "`docker service create`" (`--dns`, `--dns-search`, `--dns-option`): https://docs.docker.com/reference/cli/docker/service/create/
- Kubernetes Docs, "Service": https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Docs, "DNS for Services and Pods": https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/

## Issues Found
- The post said bridge networks use Docker's embedded DNS resolver. Docker's official networking docs distinguish the default `bridge` network from user-defined networks: the default `bridge` gets a copy of the host's `/etc/resolv.conf`, while user-defined networks use Docker's embedded DNS. I corrected the explanation and the troubleshooting note.
- The post claimed Portainer's **Add container** UI supports DNS servers, search domains, and DNS options. Portainer's current documentation only shows **Primary DNS Server** and **Secondary DNS Server** in the container form. I updated Steps 1-4 to reflect that DNS servers are set in the container form, while `dns_search` and `dns_opt` should be configured through a Portainer stack / Compose deployment.
- The Portainer UI examples showed repeated generic "DNS server" fields and an "add DNS server" action, which do not match the documented UI. I replaced them with the documented primary/secondary DNS fields and noted the two-server limit in the container form.
- Several Compose snippets in the scenario section omitted `image`, making them incomplete service definitions. I added `image` entries to the Kubernetes-style, high-performance, and air-gapped examples.
- The Kubernetes-style example needed an environment caveat. I clarified that the example only applies when the container can actually reach the cluster network, because Kubernetes `ClusterIP` services are cluster-internal.
- The `daemon.json` example contained a `// /etc/docker/daemon.json` comment inside a `json` code block, which is not valid JSON. I moved the path note outside the block.
- The Docker restart command lacked `sudo`, which is normally required to restart the daemon on Linux hosts. I updated it to `sudo systemctl restart docker`.
- The verification and troubleshooting commands assumed `nslookup` and `dig` exist in the container image. I added conditional wording so those commands are presented accurately.

## Review Notes
- The post is Linux-oriented because it uses `/etc/docker/daemon.json`, `/etc/resolv.conf`, and `systemctl` examples.
- Portainer's documented container-form DNS fields were current at review time. If a future Portainer release adds DNS search-domain or resolver-option fields to **Add container**, the post should be revisited.
