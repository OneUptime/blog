# Validation Summary: How to use SELinux labels for mandatory access control in Kubernetes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Pods and security contexts
- Kubernetes SELinuxOptions and SELinux volume relabeling
- Linux SELinux mandatory access control and MCS labels
- Kubernetes PersistentVolumes and CSI driver SELinux mount support
- Linux audit troubleshooting commands

## Sources Consulted
- Kubernetes security context documentation: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes Pod API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes SELinux volume labeling change notes: https://kubernetes.io/blog/2026/04/22/breaking-changes-in-selinux-volume-labeling/
- Kubernetes PodSecurityPolicy documentation: https://kubernetes.io/docs/concepts/security/pod-security-policy/
- Red Hat SELinux documentation for AVC audit searches: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/using_selinux/

## Issues Found
- The post said SELinux checks every system call. SELinux enforces access decisions through SELinux policy hooks, so I changed the wording to avoid the overbroad claim.
- The post implied every container always gets a unique MCS category pair. Kubernetes documents that if `seLinuxOptions` is unspecified, the container runtime allocates a random SELinux context, so I clarified that this is the default/runtime behavior.
- The volume section said Kubernetes automatically applies the pod SELinux label when mounting a volume. Current Kubernetes behavior is conditional: by default the container runtime recursively relabels volume contents, while Kubernetes can use `-o context=<label>` only for eligible persistent volumes and supported CSI drivers. I corrected the explanation.
- The persistent volume section said Kubernetes recursively relabels all files and suggested `FSGroup` policies to avoid the delay. `fsGroup` and `fsGroupChangePolicy` manage ownership and permissions, not SELinux labels. I changed this to describe SELinux mount-option labeling and `spec.securityContext.seLinuxChangePolicy`.
- The troubleshooting section referenced conflicts with PodSecurityPolicies. PodSecurityPolicy was deprecated in Kubernetes v1.21 and removed in v1.25, so I replaced it with Pod Security Admission.
- The custom SELinux policy DaemonSet text implied copying files into the policy directory is sufficient. I clarified that production installation should use host SELinux tooling such as `semodule`.
- One example used `c012` as an MCS category. I changed it to `c12` to avoid ambiguous leading-zero category notation.

## Review Notes
The manifests are syntactically valid YAML, but several example images such as `myapp:1.0`, `tenant-app:1.0`, and `policy-installer:1.0` are placeholders. The DaemonSet for custom policy installation is illustrative and would need a real installer image plus host-specific SELinux tooling before production use.
