# Validation Summary: How to Set Up Inter-Service Communication in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker networking
- Docker Compose
- Container DNS and service discovery
- Node.js

## Sources Consulted
- Docker Docs: Networking in Compose - https://docs.docker.com/compose/how-tos/networking/
- Docker Docs: Define and manage networks in Docker Compose - https://docs.docker.com/reference/compose-file/networks/
- Docker Docs: Services reference - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Bridge network driver - https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer Docs: Access a container's console - https://docs.portainer.io/sts/user/docker/containers/console
- Node.js Docs: Global objects (`fetch`) - https://nodejs.org/docs/latest/api/globals.html
- Node.js Learn: Using the Fetch API with Undici in Node.js - https://nodejs.org/learn/getting-started/fetch

## Issues Found
- The Compose snippets used the top-level `version: "3.8"` field. I removed it because current Docker Compose documentation marks `version` as obsolete and only retained for backward compatibility.
- The DNS explanation was too broad. I narrowed it to shared user-defined Docker networks and explicitly separated container-name or alias resolution from Compose service-name discovery, which matches Docker's current networking documentation.
- The Node.js example used `require('node-fetch')`, which is not the current recommended approach for modern Node.js and can fail with current `node-fetch` versions. I replaced it with the built-in global `fetch`, which is available in current Node.js and aligns with the `node:20-alpine` example elsewhere in the post.
- The connectivity checks assumed `curl` and `nslookup` were always present inside the container and referred to Portainer's console as an "Exec console". I clarified that those commands depend on the image including the utilities and updated the wording to Portainer's current "Console" terminology.

## Review Notes
- The networking guidance is accurate for Portainer managing Docker/Compose workloads. If this post is later expanded to Docker Swarm stacks, service-discovery behavior should be documented separately because Swarm networking has different semantics.
