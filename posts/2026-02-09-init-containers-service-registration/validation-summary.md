# Validation Summary: How to Use Init Containers to Register Service with External Discovery Systems

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes init containers
- Kubernetes Downward API environment variables
- Kubernetes lifecycle `preStop` hooks
- Kubernetes ConfigMaps, Secrets, and volumes
- HashiCorp Consul Agent service registration API
- etcd v3 leases and `etcdctl`
- Alpine Linux and BusyBox container images
- Shell scripting with `curl`, `wget`, `nc`, and `nslookup`

## Sources Consulted
- Kubernetes Init Containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Kubernetes Container Lifecycle Hooks documentation: https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/
- HashiCorp Consul Agent Service HTTP API documentation: https://developer.hashicorp.com/consul/api-docs/agent/service
- HashiCorp Consul service registration documentation: https://developer.hashicorp.com/consul/docs/register/service/vm
- etcd lease tutorial: https://etcd.io/docs/v3.5/tutorials/how-to-create-lease/
- etcd v3 API lease documentation: https://etcd.io/docs/v3.5/learning/api/
- Docker Official Image documentation for Alpine: https://hub.docker.com/_/alpine/
- Alpine Linux package information for curl: https://pkgs.alpinelinux.org/package/v3.18/main/x86/curl
- Local Docker checks against `alpine:3.18` and `busybox:1.36`

## Issues Found
- The Consul init container used `curl` with `image: alpine:3.18`, but the base Alpine image does not include `curl` by default. Added `apk add --no-cache curl` before the first `curl` call.
- The custom REST API init container used `curl` with `image: alpine:3.18`, but the base Alpine image does not include `curl` by default. Added `apk add --no-cache curl` before the first `curl` call.
- The retry example used `curl` in an Alpine-based ConfigMap script without installing it. Added `apk add --no-cache curl`.
- The retry example claimed to implement exponential backoff but only used a fixed retry delay. Added `RETRY_DELAY=$((RETRY_DELAY * 2))` after each failed sleep before the next retry.
- The retry example incremented `attempt` before calling `register_service`, while the log line printed `$((attempt + 1))`, causing the first log message to show attempt 2. Changed the log line to print `$attempt`.

## Review Notes
The Kubernetes API fields used in the examples are current and valid. The etcd lease pattern is technically correct, and the post correctly notes that a separate sidecar or equivalent process would need to keep the lease alive after the init container exits. The `preStop` examples depend on the application images containing `sh` and `curl`; that is plausible for placeholder images but should be verified for any real production image.
