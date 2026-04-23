# Validation Summary: How to Use Ephemeral Containers in Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher-managed Kubernetes clusters
- Kubernetes Pods
- Ephemeral containers
- `kubectl debug`
- Kubernetes RBAC
- Linux process and network troubleshooting tools

## Sources Consulted
- Kubernetes Ephemeral Containers concept docs: https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/
- Kubernetes Debug Running Pods task docs: https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/
- `kubectl debug` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- `kubectl version` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes API reference for Pod spec / Pod status / EphemeralContainer fields: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.25/
- Kubernetes RBAC reference: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes blog example for debug RBAC and `pods/ephemeralcontainers` `update` access: https://kubernetes.io/blog/2026/03/18/securing-production-debugging-in-kubernetes/
- Kubernetes 1.31 custom profiling blog: https://kubernetes.io/blog/2024/08/22/kubernetes-1-31-custom-profiling-kubectl-debug/

## Issues Found
- The introduction said ephemeral containers are "not listed in the pod spec". That was inaccurate. Ephemeral containers are added through the `ephemeralcontainers` subresource and appear under `.spec.ephemeralContainers`. I corrected the explanation to match the Kubernetes concept and API docs.
- The post used `kubectl version --short`. Current official `kubectl version` reference does not document `--short`, so I changed the command to `kubectl version`.
- The RBAC verification command used `pods/ephemeralcontainers` directly with `kubectl auth can-i`. I updated it to `kubectl auth can-i update pods --subresource=ephemeralcontainers` to match current `kubectl auth can-i` subresource usage.
- The explanation of `--target` said it "shares process namespace" as an unconditional behavior. The docs are more specific: `--target` asks the runtime to place the ephemeral container in the target container's namespaces, and runtime support is required. I corrected that wording.
- The Step 5 API example was technically incorrect. Applying a normal `Pod` manifest with `spec.ephemeralContainers` does not add an ephemeral container to an existing Pod; Kubernetes requires the `ephemeralcontainers` subresource. I replaced that section with documented `kubectl debug --profile=sysadmin` usage and a `--custom` profile example for Kubernetes v1.32+.
- The network debugging section showed `tcpdump` from a default ephemeral container. Packet capture generally requires elevated privileges. I updated the example to use `--profile=sysadmin`, following the current Kubernetes debugging guidance.
- The status section inspected `.spec.ephemeralContainers`, which shows configuration, not runtime status. I changed it to `.status.ephemeralContainerStatuses`.
- The note saying ephemeral containers stay as "Completed" until Pod deletion was too broad. They cannot be removed, but only terminated ephemeral containers remain in Pod status after exit. I corrected that wording.
- The RBAC example granted `patch` on `pods/ephemeralcontainers`, but current Kubernetes guidance for `kubectl debug` uses `update`. I changed that verb to `update`.
- The RBAC example did not include `pods/log`, even though the guide instructs readers to use `kubectl logs` against the ephemeral container. I added `pods/log` with `get` so the sample permissions cover the commands used in the post.

## Review Notes
- The `--target` behavior depends on container runtime support. If the runtime does not support namespace targeting, process inspection commands such as `ps` may not show the target container's processes.
- The custom profile example is version-specific. Kubernetes documents custom debug profiles as stable in v1.32; older clusters may need to rely on the built-in profiles instead.
- Rancher does not materially change the Kubernetes ephemeral container API shown here; the commands remain standard `kubectl` workflows against a Rancher-managed cluster.
