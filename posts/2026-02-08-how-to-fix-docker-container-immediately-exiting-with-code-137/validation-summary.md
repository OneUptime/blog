# Validation Summary: How to Fix Docker Container Immediately Exiting with Code 137

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Docker Engine
- Docker Compose
- Linux signals and OOM killer
- Linux cgroups
- Kubernetes
- Docker Swarm
- Node.js
- Java JVM heap configuration

## Sources Consulted
- Docker Docs: Resource constraints, https://docs.docker.com/engine/containers/resource_constraints/
- Docker Docs: `docker container run`, https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: `docker container kill`, https://docs.docker.com/reference/cli/docker/container/kill/
- Docker Docs: Compose Deploy Specification, https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs: Compose services `stop_grace_period`, https://docs.docker.com/reference/compose-file/services/
- Docker Docs: `docker compose stop`, https://docs.docker.com/reference/cli/docker/compose/stop/
- Kubernetes Docs: Resource Management for Pods and Containers, https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Docs: Assign Memory Resources to Containers and Pods, https://kubernetes.io/docs/tasks/configure-pod-container/assign-memory-resource/
- Kubernetes Docs: Field Selectors, https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors
- Kubernetes API Reference: Event, https://kubernetes.io/docs/reference/kubernetes-api/core/event-v1/
- GNU Bash Reference Manual: Exit Status, https://www.gnu.org/s/bash/manual/html_node/Exit-Status.html
- Docker Hub: Node Docker Official Image, https://hub.docker.com/_/node
- Node.js Release Working Group, https://github.com/nodejs/Release

## Issues Found
- The post referred to "Docker's OOM killer." Docker configures container memory limits, but Linux enforces those limits through cgroups and the kernel OOM mechanism. Updated the wording to avoid implying Docker has a separate OOM killer.
- The Compose memory reservation comment said it was "minimum guaranteed memory." Docker documents reservations as soft limits or reservations, not hard guarantees in ordinary Compose usage. Updated the comment to describe it as a soft reservation used under memory contention.
- The host OOM section said `docker inspect` will show `OOMKilled: false` for host-level OOM kills. That is commonly the distinction the post is trying to make, but "will" was too absolute. Updated it to "may show" and clarified that the key difference is host-level OOM versus container memory-limit OOM.
- The `docker stop` troubleshooting command used `echo $?` to check whether the container exited cleanly. That checks the Docker CLI command's exit status, not the stopped container's exit code. Replaced it with `docker inspect my-container --format '{{.State.ExitCode}}'`.
- The Kubernetes/Swarm section said the orchestrator itself can kill containers that exceed limits. Kubernetes documents memory limits as ultimately enforced by the kernel. Updated the wording to say orchestrator-configured limits can cause the kernel to kill containers.
- The Dockerfile used `node:18-alpine`, but Node.js 18 reached end of life before the validation date. Updated it to `node:lts-alpine`.

## Review Notes
The remaining examples are syntactically valid and match current Docker CLI, Compose, Kubernetes, Bash, Node.js, and JVM behavior. `deploy.resources` is valid Compose syntax, but teams using older Compose implementations or Swarm-specific workflows should confirm how their runtime applies reservations and limits.
