# Validation Summary: How to Disable Bind Mounts for Non-Admin Users in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Docker Swarm
- Docker Engine API
- Docker Compose
- Kubernetes

## Sources Consulted
- Portainer Docker Standalone setup docs: https://docs.portainer.io/user/docker/host/setup
- Portainer Docker Swarm setup docs: https://docs.portainer.io/sts/user/docker/swarm/setup
- Portainer Docker security policy docs: https://docs.portainer.io/admin/environments/policies/docker-policies/security-policy
- Portainer Kubernetes setup docs: https://docs.portainer.io/user/kubernetes/cluster/setup
- Portainer policies overview: https://docs.portainer.io/admin/environments/policies
- Portainer API access docs: https://docs.portainer.io/2.21/api/access
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Docker bind mounts docs: https://docs.docker.com/engine/storage/bind-mounts/
- Docker Compose volumes docs: https://docs.docker.com/reference/compose-file/volumes/
- Docker Engine API version history: https://docs.docker.com/reference/api/engine/version-history/

## Issues Found
- The Docker/Swarm instructions used the wrong navigation path and wrong toggle name. I updated them to the documented `Host > Setup` or `Swarm > Setup` path and the `Disable bind mounts for non-administrators` toggle.
- The Kubernetes section described a non-existent per-user bind mount setting. I replaced it with a note that current Portainer Kubernetes setup uses different controls and does not expose an equivalent toggle.
- The post claimed a specific runtime error message for blocked bind mounts. I changed this to the documented behavior: the host-path option is removed for non-admin users and bind mount attempts through Portainer are rejected.
- The named-volume Compose example omitted the top-level `volumes` declaration. I added it so the snippet is valid Compose syntax.
- The API example used a generic bearer token description and an over-specific expected HTTP result. I updated it to the documented `X-API-Key` access-token header and a generic rejection expectation.
- The recommendations section claimed Portainer can restrict bind mounts to approved host paths, and the conclusion mentioned restricting host networking. I replaced those with doc-backed controls: trusted admin users, read-only mounts where appropriate, and Portainer's documented security settings such as privileged mode and device mapping restrictions.
- The security examples overstated or misstated a few details. I corrected `/etc/passwd` to "host account information" and clarified that bind mounts are typically writable unless mounted read-only.

## Review Notes
- Portainer also supports centralized Docker security policies in Business Edition, but that is a separate path from the per-environment Setup flow covered in this post.
- Kubernetes `hostPath`-style risks exist, but Portainer documents them under different Kubernetes controls rather than a Docker-style "disable bind mounts" toggle.
