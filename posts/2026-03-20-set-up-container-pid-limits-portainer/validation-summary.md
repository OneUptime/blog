# Validation Summary: How to Set Up Container PID Limits in Portainer - Set

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer Stacks
- Docker Compose
- Docker CLI
- Docker container PID limits
- Kubernetes kubelet PID limits

## Sources Consulted
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker CLI `docker container run` reference: https://docs.docker.com/reference/cli/docker/container/run/
- Docker CLI `docker container stats` reference: https://docs.docker.com/reference/cli/docker/container/stats/
- Portainer stack deployment documentation: https://docs.portainer.io/sts/user/docker/stacks/add
- Kubernetes Process ID Limits and Reservations: https://kubernetes.io/docs/concepts/policy/pid-limiting/
- Kubernetes kubelet configuration API reference: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/

## Issues Found
- The Docker Compose example used the top-level `version: "3.8"` key. Docker Compose now treats the top-level `version` property as obsolete and only informative, so I removed it from the stack example.
- The Kubernetes section incorrectly showed PID limits under a Pod container's `resources.limits` block and referenced `--pod-pids-limit`. Kubernetes documentation states that pod-defined PID limits are not currently supported in the Pod spec; per-pod PID limits are configured on kubelet with `--pod-max-pids` or `podPidsLimit`. I replaced the invalid Pod manifest with a kubelet configuration example and corrected the flag name.
- The `docker stats --no-stream container_name | awk 'NR==2 {print $7}'` command would print the memory percentage column in Docker's default Linux table output, not the PID count. I replaced it with `docker stats --no-stream --format "{{.PIDs}}" container_name`, which uses Docker's documented `.PIDs` format placeholder.

## Review Notes
Docker's `PIDS` metric includes processes and Linux kernel threads, so high PID counts can also indicate excessive thread creation. The recommended PID limits in the article are reasonable starting points but should still be validated under each workload's normal and peak behavior.
