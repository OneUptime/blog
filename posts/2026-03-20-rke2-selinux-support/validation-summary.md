# Validation Summary: How to Configure RKE2 SELinux Support

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- RKE2
- Kubernetes
- SELinux
- containerd
- Linux package management with RPM/DNF
- SELinux audit and policy utilities

## Sources Consulted
- RKE2 SELinux documentation: https://docs.rke2.io/security/selinux
- RKE2 installation methods: https://docs.rke2.io/install/methods
- RKE2 configuration options: https://docs.rke2.io/install/configuration
- RKE2 server configuration reference: https://docs.rke2.io/reference/server_config
- RKE2 SELinux policy source: https://github.com/rancher/rke2-selinux
- Kubernetes security context documentation: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- container-selinux policy source: https://github.com/containers/container-selinux
- Red Hat Enterprise Linux SELinux mode documentation: https://docs.redhat.com/documentation/red_hat_enterprise_linux/9/html/using_selinux/changing-selinux-states-and-modes_using-selinux
- Red Hat Enterprise Linux SELinux tooling documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/using_selinux/index
- Red Hat OpenShift NFS SELinux guidance: https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/html-single/storage/storage

## Issues Found
- The prerequisite listed `RKE2 v1.21+`, which could imply that an old, unsupported Kubernetes/RKE2 minor is appropriate for a current deployment. Changed it to require a supported RKE2 release.
- The direct `rke2-selinux` RPM URL used a stale package version and the wrong current repository path, and the `INSTALL_RKE2_SELINUX` installer variable is not part of the current RKE2 install script. Replaced this with the supported RPM install flow and a repository-based `dnf install rke2-selinux` option.
- The post used `semanage`, `audit2allow`, and `audit2why` without installing the package that commonly provides those tools on RHEL-family systems. Added `policycoreutils-python-utils`.
- The SELinux mode step implied `setenforce 1` can move a Disabled system directly to Enforcing. Clarified that Disabled systems require updating `/etc/selinux/config` and rebooting; `setenforce` only switches an already-enabled system between Permissive and Enforcing.
- The RKE2 config example included `kubelet-arg: seccomp-default=true` as SELinux labeling configuration. That flag is for seccomp, not SELinux, so it was removed.
- The process-label verification section said control-plane containers such as `etcd` and `kube-apiserver` should have `container_t`. RKE2 SELinux policy can use RKE2-specific labels such as `rke2_service_db_t` and `rke2_service_t` for control-plane static pods, so the example was corrected.
- The SELinux boolean section described the booleans as RKE2 requirements and gave incorrect explanations for `container_manage_cgroup` and `container_connect_any`. Reworded the section as optional workload-specific guidance and corrected the descriptions.
- The NFS boolean used `container_use_nfs`, but current container SELinux policy and Red Hat/OpenShift guidance use `virt_use_nfs` for allowing container domains to use NFS. Updated the command and verification.

## Review Notes
- RKE2's SELinux docs note that Calico as the selected CNI requires Tigera's SELinux policy package. This post does not cover CNI-specific setup, so that remains a future improvement.
- SELinux booleans vary by distribution and policy package version. Operators should confirm available booleans with `getsebool` or `semanage boolean -l` before enabling them.
