# Validation Summary: How to Use the --tunnel-addr and --tunnel-port Flags for Edge Agents

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- Portainer Server
- Portainer Edge Agent
- Portainer CLI flags
- Docker `run`
- Docker Compose
- TCP networking for remote management tunnels

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer Edge Agent architecture: https://docs.portainer.io/advanced/edge-agent
- Portainer Edge Agent deployment requirements on Docker: https://docs.portainer.io/admin/environments/add/docker/edge
- Portainer CE installation on Docker (current Compose example and exposed ports): https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Docker Compose file reference for top-level `version` deprecation: https://docs.docker.com/reference/compose-file/version-and-name/
- GNU Bash reference for backslash-newline line continuation: https://www.gnu.org/s/bash/manual/html_node/Escape-Character.html

## Issues Found
1. **Broken shell line continuations in both `docker run` examples**: The post placed inline `#` comments after lines ending in `\`. In Bash, line continuation requires an immediate `\newline` pair, so those comments break the command. Removed the inline comments so the examples are runnable.
2. **Incorrect network requirement description for Edge Agents**: The post said only the tunnel port needed to be publicly accessible. Portainer’s Edge Agent documentation requires the Portainer server to be reachable on both the API/UI port (`9443`) and the tunnel port (`8000`, or a custom tunnel port). Updated the explanation and diagram accordingly.
3. **Overly imprecise redeployment note**: The post said changing the tunnel port means generating a new Edge environment. Portainer documents that the deployment command embeds the Portainer API URL and reverse tunnel server address in `EDGE_KEY`; the operational requirement is to redeploy agents with an updated key / deployment command. Updated the wording to reflect that more accurately.
4. **Outdated Docker Compose snippet**: The Compose example used the obsolete top-level `version` field and exposed `9000` instead of Portainer’s current default HTTPS/UI port `9443`. Removed `version` and changed the port mapping to `9443:9443` while keeping the tunnel port exposed on `8000`.

## Review Notes
- The documented Portainer defaults for these flags remain correct: `--tunnel-addr` defaults to `0.0.0.0`, and the default Edge tunnel port remains `8000`.
- The `--edge-compute`, `--tunnel-addr`, and `--tunnel-port` flags are still present in current Portainer CLI documentation.
- The examples still use `portainer/portainer-ce:latest`; Portainer’s current install docs prefer release-channel tags such as `:lts` or `:sts`, but the post’s focus is the tunnel flags rather than image-tag strategy.
