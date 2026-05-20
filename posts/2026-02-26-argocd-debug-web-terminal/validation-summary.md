# Validation Summary: How to Debug Using ArgoCD Web Terminal

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD web-based terminal
- Kubernetes Pods, Services, DNS, and ephemeral containers
- Linux networking and process inspection commands
- Bash TCP redirections
- cgroup v1 and cgroup v2 resource files
- PostgreSQL, MySQL, Redis, and MongoDB CLI connectivity checks

## Sources Consulted
- Argo CD Web-based Terminal documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/web_based_terminal/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes Ephemeral Containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- GNU Bash Reference Manual, Redirections: https://www.gnu.org/software/bash/manual/html_node/Redirections.html
- PostgreSQL pg_isready documentation: https://www.postgresql.org/docs/16/app-pg-isready.html
- MySQL mysql client options documentation: https://dev.mysql.com/doc/refman/9.7/en/mysql-command-options.html
- Redis redis-cli documentation: https://redis.io/docs/latest/operate/rs/references/cli-utilities/redis-cli/
- MongoDB ping command documentation: https://www.mongodb.com/docs/manual/reference/command/ping/
- Linux kernel cgroup v2 documentation: https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html
- Linux kernel cgroup v1 memory controller documentation: https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v1/memory.html

## Issues Found
- The access steps said to select a preferred shell from the Argo CD terminal UI. Current Argo CD documentation describes configured allowed shells and says Argo CD attempts them in order, so the step was removed.
- The ephemeral debug container tip said "For Kubernetes 1.23+" and said ephemeral containers attach without modifying the pod spec. Current Kubernetes documentation marks ephemeral containers stable in Kubernetes 1.25 and describes the `ephemeralcontainers` subresource. The note was updated to say Kubernetes 1.25+ (stable) and to describe the benefit as avoiding an application image rebuild or pod restart.

## Review Notes
- Most examples are diagnostic commands whose availability depends on the container image, installed packages, Linux capabilities, and cgroup version. The post already frames many of these as conditional fallbacks.
- Some commands may require elevated container capabilities, such as `iptables`, `dmesg`, and process/port ownership details from `ss -tlnp`, but the examples are still valid troubleshooting commands.
