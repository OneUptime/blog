# Validation Summary: Portainer Agent Connection Timeouts: Debugging Port 9001, TLS, DNS, and Clock Skew

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered

- Portainer Server and standard Portainer Agent
- Portainer Edge Agent
- Docker Engine and Docker CLI
- Docker Compose networking and DNS
- Docker Swarm services and overlay networks
- HTTPS, TLS, and self-signed certificates
- Host firewalls, routing, NAT, proxies, and MTU
- Linux host time synchronization

## Sources Consulted

- Portainer: Install Portainer Agent on Docker Standalone — https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer: Install Portainer Agent on Docker Swarm — https://docs.portainer.io/admin/environments/add/swarm/agent
- Portainer: Why have my agents stopped working after upgrading Portainer? — https://docs.portainer.io/faqs/upgrading/why-have-my-agents-stopped-working-after-upgrading-portainer
- Portainer: Why can't my agents communicate with Portainer on Swarm? — https://docs.portainer.io/faqs/troubleshooting/agents-and-environment-management/why-cant-my-agents-communicate-with-portainer-on-swarm
- Portainer: Updating on Docker Standalone — https://docs.portainer.io/start/upgrade/docker
- Portainer Agent security, TLS, authentication, Edge behavior, and deployment options — https://github.com/portainer/agent#encryption
- Portainer Server Agent proxy and signed-request transport source — https://github.com/portainer/portainer/tree/develop/api/http/proxy/factory
- Docker: Container logs CLI reference — https://docs.docker.com/reference/cli/docker/container/logs/
- Docker: Swarm service logs CLI reference — https://docs.docker.com/reference/cli/docker/service/logs/
- Docker: Swarm service inspection CLI reference — https://docs.docker.com/reference/cli/docker/service/inspect/
- Docker: Swarm service task listing CLI reference — https://docs.docker.com/reference/cli/docker/service/ps/
- Docker: Deploy a stack to a Swarm — https://docs.docker.com/reference/cli/docker/stack/deploy/
- Docker: Network inspection CLI reference — https://docs.docker.com/reference/cli/docker/network/inspect/
- Docker: Port publishing and mapping — https://docs.docker.com/engine/network/port-publishing/
- Docker: Networking overview and container DNS behavior — https://docs.docker.com/engine/network/
- Docker: Compose networking and service discovery — https://docs.docker.com/compose/how-tos/networking/
- Docker: Go-template command formatting — https://docs.docker.com/engine/cli/formatting/
- curl command-line manual (`--verbose` and `--insecure`) — https://curl.se/docs/manpage.html
- OpenBSD `nc(1)` manual (`-v` and `-z`) — https://man.openbsd.org/nc.1
- systemd `timedatectl` manual — https://www.freedesktop.org/software/systemd/man/latest/timedatectl.html
- POSIX `date` utility specification — https://pubs.opengroup.org/onlinepubs/9799919799/utilities/date.html
- Linux time namespaces manual — https://man7.org/linux/man-pages/man7/time_namespaces.7.html

## Issues Found

- The TCP and HTTPS examples were described as tests that could be run from the Portainer Server host. Host networking can differ from the Server container's DNS, routes, and firewall path. Changed the instruction to require the Server network namespace or a diagnostics container on the same Docker network.
- The authentication explanation incorrectly presented a matching `AGENT_SECRET` as an alternative to signed request headers. Corrected it to state that protected requests use signed headers: default mode associates the first valid Portainer public key, while secret mode incorporates the shared secret into signature verification and permits multiple Portainer instances.
- The Swarm commands were presented without their manager-node execution constraint, and the log commands omitted their logging-driver constraint. Added the manager requirement and noted that `docker service logs` only reads services using Docker's `json-file` or `journald` logging driver.
- The post stated that Swarm itself prefixes service names with the stack name. Narrowed this to services created by `docker stack deploy`; services created directly with `docker service create` do not inherently receive a stack prefix.
- The Portainer Agent TLS link targeted the repository's general security-policy section rather than the encryption documentation. Updated the anchor to the Agent's `Encryption` section.

## Review Notes

Current Portainer documentation classifies standard Agent deployments as a legacy option and recommends Edge Agent for most new deployments. The post remains technically relevant because it explicitly scopes itself to standard Agent troubleshooting and distinguishes the Edge connection model. Portainer also requires Agent and Server versions to match; the post correctly avoids hard-coding a release number and directs readers to the current upgrade procedure.
