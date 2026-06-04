# Validation Summary: How to Configure kubectl debug to Attach Debug Containers to Distroless Pods

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubectl debug
- Ephemeral containers
- Distroless container images
- Linux process and network debugging tools
- Docker debug images

## Sources Consulted
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes Ephemeral Containers concept documentation: https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/
- Kubernetes Debug Running Pods task documentation: https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/
- Kubernetes Pod API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- GoogleContainerTools distroless README: https://github.com/GoogleContainerTools/distroless
- GoogleContainerTools distroless Node.js README: https://github.com/GoogleContainerTools/distroless/tree/main/nodejs
- Docker Hub nicolaka/netshoot tags: https://hub.docker.com/r/nicolaka/netshoot/tags
- Docker Hub OpenJDK image notice: https://hub.docker.com/_/openjdk/
- Docker Hub Eclipse Temurin image: https://hub.docker.com/_/eclipse-temurin/
- Go release history and support policy: https://go.dev/doc/devel/release

## Issues Found
- The post used `--share-processes` on direct ephemeral-container `kubectl debug` commands. Current Kubernetes documentation describes `--share-processes` as a `--copy-to` option; direct ephemeral-container process targeting should use `--target`. Removed `--share-processes` from direct ephemeral examples and kept it only in the copied-pod example.
- The setup section said kubectl 1.18 or later was sufficient. The current examples use ephemeral containers and debug profiles, including `--custom`, so the setup guidance now calls for a current kubectl and kubectl 1.32 or later for the full workflow.
- The sample distroless Node.js image used `gcr.io/distroless/nodejs:18`, which is no longer a current supported distroless Node.js image. Updated it to `gcr.io/distroless/nodejs22-debian13` and removed the explicit `command: ["node"]` because the distroless Node.js image already sets the Node entrypoint.
- Several debug images were untagged or outdated. Added explicit tags for netshoot and Ubuntu, updated the Go debug image from `golang:1.21` to `golang:1.25`, and replaced deprecated `openjdk:17-slim` with `eclipse-temurin:21-jdk-jammy`.
- The filesystem inspection section described mounting the target filesystem and hard-coded `/proc/1`. Updated the wording and commands to find the application PID and inspect `/proc/$APP_PID/...`, which is more accurate when using a targeted ephemeral container.
- Network and process debugging commands such as `tcpdump`, `iptables`, `conntrack`, and `strace` may require elevated capabilities. Added appropriate `--profile=netadmin` or `--profile=sysadmin` flags where those tools are used.
- The debug profile section showed a ConfigMap saved under `~/.kube/debug-profiles.yaml`, but `kubectl debug` does not consume that as a profile configuration. Replaced it with a supported custom partial container spec and wired the wrapper script to pass it with `--custom`.
- The Debian package example installed `netcat`, which can be a virtual package on Ubuntu. Changed it to `netcat-openbsd`.
- The troubleshooting section did not name the exact RBAC subresource needed for ephemeral containers. Updated it to mention `pods/ephemeralcontainers`.

## Review Notes
`kubectl` was not installed in the local workspace, so command verification was performed against the current official Kubernetes CLI reference and task documentation. Some example commands still depend on cluster policy, Pod security admission settings, container runtime support for `--target`, and the debug image's available tools.
