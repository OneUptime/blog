# Validation Summary: How to Disable Host PID Access for Non-Admin Users in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Kubernetes
- Linux namespaces / `nsenter`

## Sources Consulted
- Portainer Docker host setup: https://docs.portainer.io/user/docker/host/setup?fallback=true
- Portainer Docker security policy: https://docs.portainer.io/admin/environments/policies/docker-policies/security-policy
- Portainer Kubernetes security constraints: https://docs.portainer.io/user/kubernetes/cluster/security
- Portainer Kubernetes security policy: https://docs.portainer.io/admin/environments/policies/kubernetes-policies/kubernetes-security-policy
- Docker CLI reference for `docker container run`: https://docs.docker.com/reference/cli/docker/container/run/
- Docker CLI reference for `docker inspect`: https://docs.docker.com/reference/cli/docker/inspect/
- Kubernetes Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes namespace label enforcement task: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Linux `nsenter(1)` manual: https://man7.org/linux/man-pages/man1/nsenter.1.html
- Linux `setns(2)` manual: https://man7.org/linux/man-pages/man2/setns.2.html

## Issues Found
- The Portainer navigation and control names were outdated. I changed the instructions from `Edit` / `Allow host PID` to the current documented `Setup` / `Docker Security Settings` / `Disable the use of host PID 1 for non-administrators`.
- The `nsenter` example implied that `--pid=host` by itself gives an immediate root shell on the host. I changed the text to state that additional privileges are required and rewrote the snippet as an in-container `nsenter` example, which matches Linux namespace behavior more accurately.
- The line saying Portainer blocks `hostPID` through the UI or API was more specific than the documentation I verified. I changed it to the broader documented claim that Portainer prevents non-admin users from requesting host PID access through Portainer.
- The Kubernetes section described the mechanism as Pod Security Standards but used the namespace-label workflow from Pod Security Admission. I corrected the wording, added `--overwrite` to the `kubectl label` example, and clarified that the policy is enforced at the API level.
- The Portainer security summary listed `Allow host IPC` and `Allow host network`, which are not documented Docker Security Settings in current Portainer documentation. I replaced the list with the current documented controls: privileged mode, bind mounts, host PID 1, device mappings, container capabilities, and sysctl settings.
- The conclusion referred to host networking as part of the Portainer hardening baseline and overstated host PID as an automatic escape. I updated it to refer to the settings Portainer actually exposes and to describe the risk more accurately as host exposure.

## Review Notes
- Kubernetes `baseline` is already sufficient to block `spec.hostPID`, `spec.hostIPC`, and `spec.hostNetwork`; the post uses `restricted`, which is stricter and still correct.
- The Docker inspection command is valid for running containers, but it depends on `jq` being installed and will print Docker container names with their leading `/`.
- Portainer’s wording is specifically “host PID 1”, reflecting the product UI and documentation, even though the underlying Docker feature is the host PID namespace via `--pid=host`.
