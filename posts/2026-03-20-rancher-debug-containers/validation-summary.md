# Validation Summary: How to Set Up Debug Containers in Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- `kubectl`
- Ephemeral containers
- Kubernetes RBAC
- Docker
- Alpine Linux

## Sources Consulted
- Kubernetes `kubectl debug` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes Ephemeral Containers concept docs: https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/
- Kubernetes Debug Running Pods task: https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/
- Kubernetes Debugging Kubernetes Nodes With Kubectl task: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes `kubectl auth can-i` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes `kubectl cp` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cp/
- Kubernetes v1.25 release notes blog: https://kubernetes.io/blog/2022/08/23/kubernetes-v1-25-release/
- Kubernetes removed feature gates reference: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates-removed/
- Upstream `kubectl debug` source showing `pods/ephemeralcontainers` is patched and interactive sessions attach: https://github.com/kubernetes/kubectl/blob/master/pkg/cmd/debug/debug.go
- Alpine Linux release branches: https://alpinelinux.org/releases/
- Alpine `mysql-client` package index for `v3.23`: https://pkgs.alpinelinux.org/package/v3.23/main/x86_64/mysql-client
- Alpine `postgresql18-client` package index for `v3.23`: https://pkgs.alpinelinux.org/package/v3.23/main/x86_64/postgresql18-client
- Alpine `redis` package index for `v3.23`: https://pkgs.alpinelinux.org/package/v3.23/community/loongarch64/redis
- Official Alpine Docker image tests confirming `main` and `community` repositories are configured: https://github.com/alpinelinux/docker-alpine/blob/master/tests/common.bats

## Issues Found
- The introduction said Kubernetes 1.23+ introduced stable ephemeral container support. I corrected this to beta in Kubernetes 1.23 and stable in Kubernetes 1.25, matching the Kubernetes v1.25 release notes and current concept docs.
- The prerequisites and Step 1 implied a generic “enable” flow, but the commands only checked version and authorization. I renamed the section to checking support, clarified the 1.23-1.24 feature-gate caveat, and changed the permission check to `kubectl auth can-i patch pods --subresource=ephemeralcontainers -n production`.
- The Step 2 explanation incorrectly said `--target` lets you see the target container’s filesystem. I corrected it to process inspection only, which is what the official docs describe.
- The node debugging example used `chroot /host` commands without privilege. I added `--profile=sysadmin` so the example matches Kubernetes’ current node-debug guidance.
- The first copy-and-debug example mixed `--image` with `--container=my-app` in a way that would not do what the text described. I changed it to add a separate debug container named `debugger`.
- The second copy-and-debug example claimed to override the copied pod’s entrypoint but omitted `--container=my-app`. I added that flag so the command targets the intended container.
- The Deployment manifest in Step 6 was invalid because it lacked the required Deployment selector and matching pod-template labels. I added `spec.selector.matchLabels` and `template.metadata.labels`.
- The RBAC example was incomplete for interactive `kubectl debug -it` usage. I added `pods/attach` alongside `pods/exec`, while keeping `pods/ephemeralcontainers` on the correct `patch` verb.
- The network debugging example used packet capture without a privileged debug profile and then copied from a nonexistent pod name. I updated it to use `--profile=sysadmin`, set the debug container name explicitly, and fixed the `kubectl cp` command to copy from `production/my-app-pod` with `-c debugger`.
- The sample Dockerfile used `alpine:3.18`, which is outside standard support. I updated it to `alpine:3.23` after confirming the package names used in the example still resolve and that the official Alpine Docker image includes both `main` and `community` repositories.

## Review Notes
- `kubectl debug -it` uses attach semantics under the hood, so interactive debugging depends on `pods/attach` permission in addition to ephemeral container patch access.
- Packet capture examples that use `tcpdump` generally need a privileged debug profile such as `--profile=sysadmin`; otherwise they can fail depending on runtime and cluster policy.
- `kubectl cp` requires `tar` inside the target container. The example image is suitable, but custom debug images should include `tar` if file copy is part of the workflow.
