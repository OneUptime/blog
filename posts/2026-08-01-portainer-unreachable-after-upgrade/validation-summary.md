# Validation Summary: Portainer Is Unreachable After an Upgrade: A Container, Port, and Proxy Checklist

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Portainer Server 2.x
- Docker Engine and Docker CLI
- Docker volumes, bind mounts, networks, and published ports
- Docker Compose and Docker Swarm
- Kubernetes persistent volumes
- HTTPS and TLS certificates
- Reverse proxies and WebSockets
- curl
- SSO and browser session troubleshooting

## Sources Consulted
- Portainer: Updating on Docker Standalone: https://docs.portainer.io/start/upgrade/docker
- Portainer: Install Portainer CE with Docker on Linux: https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer: How can I ensure Portainer's configuration is retained?: https://docs.portainer.io/faqs/installing/how-can-i-ensure-portainers-configuration-is-retained
- Portainer: Requirements and prerequisites: https://docs.portainer.io/start/requirements-and-prerequisites
- Portainer: Upgrading and downgrading: https://docs.portainer.io/faqs/upgrading
- Portainer: How can I roll back to a previous version of Portainer?: https://docs.portainer.io/faqs/upgrading/how-can-i-roll-back-to-a-previous-version-of-portainer
- Portainer: CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer: Force HTTPS only recovery: https://docs.portainer.io/faqs/troubleshooting/access-and-authentication/i-enabled-force-https-only-and-now-im-locked-out-of-portainer.-how-do-i-get-back-in
- Portainer: Using Portainer with reverse proxies: https://docs.portainer.io/advanced/reverse-proxy
- Portainer: Deploying Portainer behind nginx reverse proxy: https://docs.portainer.io/advanced/reverse-proxy/nginx
- Portainer: Why is my console closing after a certain time?: https://docs.portainer.io/faqs/troubleshooting/logs-errors-and-debugging/why-is-my-console-closing-after-a-certain-time
- Portainer: Authenticate via OAuth: https://docs.portainer.io/admin/settings/authentication/oauth
- Docker: `docker container ls` CLI reference: https://docs.docker.com/reference/cli/docker/container/ls/
- Docker: `docker container inspect` CLI reference: https://docs.docker.com/reference/cli/docker/container/inspect/
- Docker: `docker container logs` CLI reference: https://docs.docker.com/reference/cli/docker/container/logs/
- Docker: `docker container port` CLI reference: https://docs.docker.com/reference/cli/docker/container/port/
- Docker: Format command and log output: https://docs.docker.com/engine/cli/formatting/
- Docker: Publishing and exposing ports: https://docs.docker.com/get-started/docker-concepts/running-containers/publishing-ports/
- Docker: Port publishing and mapping: https://docs.docker.com/engine/network/port-publishing/
- curl command-line manual: https://curl.se/docs/manpage.html

## Issues Found
- The post described port `9000` as potentially not being "exposed" by the recommended update command. Docker distinguishes an image's exposed ports from ports published to host interfaces. I changed the wording to say that the recommended Portainer update command does not publish `9000`, and clarified that host-level HTTP access requires both an enabled HTTP listener and a host publication.
- The `docker port` example had the mapping direction reversed. I changed `0.0.0.0:9443 -> 9443/tcp` to the actual `docker port` format, `9443/tcp -> 0.0.0.0:9443`.
- The local test description implied that `curl -k` retained certificate validation. The `-k` option bypasses certificate verification, so I changed the description to state that verification is temporarily bypassed while verbose TLS details are displayed.
- The reverse-proxy section implied that port `9000` must always be published. I clarified that publication is necessary when the proxy connects through the Docker host, while a proxy on the same Docker network can connect directly to an enabled listener on container port `9000`.
- The description of port `8000` was broader than the current Portainer requirements documentation. I clarified that it is the optional TCP tunnel server for Edge Agents when Edge Compute features require it, not a general UI or standard Agent port.

## Review Notes
- The Docker CLI commands, filters, Go-template fields, `json` function, and `println` function are valid in the current Docker CLI. The local Docker CLI help output was also checked for `docker ps`, `docker inspect`, `docker logs`, and `docker port`.
- Portainer has enabled HTTPS on `9443` by default since CE 2.9 and BE 2.10. The recommended Docker Standalone update command publishes `9443`, does not publish legacy HTTP port `9000`, and publishes optional Edge tunnel port `8000` unless the operator removes it.
- The `/data` persistence guidance matches Portainer's storage documentation, including the risk that a Swarm task using node-local storage can move to a node without the existing data.
- The rollback guidance is correct: a database upgraded to a newer schema cannot generally be opened by an older Portainer image, and the restored database must match the Portainer version that created the backup. Portainer also documents an automatically created `backups/portainer.db.bak` option when no manual backup exists; omission of that alternative is not an error.
- The reverse-proxy checks are technically sound. Portainer uses long-lived connections for console operations, and its documentation specifically notes that reverse-proxy read timeouts can close container consoles or Kube-shell sessions.
- All external documentation links already present in the post returned HTTP 200 during validation.
