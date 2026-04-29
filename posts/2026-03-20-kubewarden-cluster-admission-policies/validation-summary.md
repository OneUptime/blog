# Validation Summary: How to Create Kubewarden Cluster Admission Policies

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubewarden
- Kubernetes admission control
- Kubernetes `ClusterAdmissionPolicy` CRDs
- `kubectl`
- Pod Security Admission / Pod Security Standards

## Sources Consulted
- Kubewarden CRD reference: https://docs.kubewarden.io/reference/CRDs
- Kubewarden policy configuration guide: https://docs.kubewarden.io/howtos/policies
- Kubewarden quick start: https://docs.kubewarden.io/quick-start
- Kubewarden monitor mode reference: https://docs.kubewarden.io/reference/monitor-mode
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Official Kubewarden `host-namespaces-psp-policy` README: https://raw.githubusercontent.com/kubewarden/host-namespaces-psp-policy/main/README.md
- Official Kubewarden `trusted-repos-policy` README: https://raw.githubusercontent.com/kubewarden/trusted-repos-policy/main/README.md
- Official Kubewarden `pod-privileged-policy` README: https://raw.githubusercontent.com/kubewarden/pod-privileged-policy/main/README.md
- Official Kubewarden `safe-labels-policy` README: https://raw.githubusercontent.com/kubewarden/safe-labels-policy/main/README.md
- Official Kubewarden `psa-label-enforcer-policy` README: https://raw.githubusercontent.com/kubewarden/psa-label-enforcer-policy/main/README.md
- Official Kubewarden `host-namespaces-psp-policy` tags API: https://api.github.com/repos/kubewarden/host-namespaces-psp-policy/tags
- Official Kubewarden `trusted-repos-policy` tags API: https://api.github.com/repos/kubewarden/trusted-repos-policy/tags
- Official Kubewarden `pod-privileged-policy` tags API: https://api.github.com/repos/kubewarden/pod-privileged-policy/tags
- Official Kubewarden `safe-labels-policy` tags API: https://api.github.com/repos/kubewarden/safe-labels-policy/tags
- Official Kubewarden `psa-label-enforcer-policy` tags API: https://api.github.com/repos/kubewarden/psa-label-enforcer-policy/tags

## Issues Found
- The host namespace example used outdated settings keys (`hostPID`, `hostIPC`, `hostNetwork`) for `host-namespaces-psp`. Updated the example to the current `allow_host_pid`, `allow_host_ipc`, and `allow_host_network` keys and pinned the module to a current official tag.
- The trusted registry example referenced `allowed-image-repositories` with an `allowedRegistries` setting that does not match the current official Kubewarden policy. Replaced it with `trusted-repos-policy` using the supported `registries.allow` configuration.
- The `pod-privileged` examples were pinned to an old `v0.2.0` tag. Updated them to a current official tag.
- The cluster-scoped resource example used a policy/module pairing that did not match the behavior being described. Replaced it with a `safe-labels` policy example that correctly targets `ClusterRole` resources.
- The Pod Security Standards section incorrectly used `pod-privileged` to claim baseline PSS enforcement and relied on a non-standard namespace exemption label. Replaced it with the official `psa-label-enforcer` policy targeting `Namespace` resources with `modes.enforce: baseline`.
- The monitoring section claimed `kubectl get clusteradmissionpolicy -o wide` would show evaluation counts and suggested an events query that was not supported by the official Kubewarden docs reviewed. Replaced those commands with status YAML and validating webhook inspection commands backed by upstream documentation.
- The temporary disable section suggested patching `spec.mode` from `protect` to `monitor`. Current Kubewarden documentation explicitly disallows that transition. Updated the section to delete and recreate the policy in `monitor` mode, while keeping the valid `monitor` to `protect` patch flow.
- The explanation of `namespaceSelector` scope was too broad. Updated it to clarify that namespace selectors limit namespaced resources, while other cluster-scoped resources are still evaluated.

## Review Notes
- The post is technically relevant and code-focused.
- Several examples originally used older policy versions. They were updated to current official tags as of April 29, 2026.
- Kubewarden policy repositories note that policy source code moved into the `kubewarden/policies` monorepo starting with Kubewarden 1.32, but the existing OCI module names used in this post remain valid for published policies.
