# Validation Summary: How to Configure K3s SELinux Support

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- SELinux
- RHEL-compatible Linux distributions
- `auditd`

## Sources Consulted
- K3s Advanced Options / Configuration: https://docs.k3s.io/advanced
- K3s install script source: https://raw.githubusercontent.com/k3s-io/k3s/master/install.sh
- `k3s-selinux` file context policy: https://raw.githubusercontent.com/k3s-io/k3s-selinux/master/policy/centos9/k3s.fc
- `k3s-selinux` policy source: https://raw.githubusercontent.com/k3s-io/k3s-selinux/master/policy/centos9/k3s.te
- Kubernetes security context documentation: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Red Hat SELinux troubleshooting guidance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux
- Red Hat audit rules guidance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/auditing-the-system_security-hardening
- CentOS Stream 9 project page: https://www.centos.org/stream9/

## Issues Found
- The manual repository configuration hard-coded the EL8 Rancher RPM path while the post claimed to support both EL8 and EL9 systems. I changed the snippet to install the required `container-selinux` and `selinux-policy-base` packages first, then select the correct `centos/8` or `centos/9` repository path from `/etc/os-release`.
- The verification command `ps aux | grep k3s | grep selinux` was not a reliable way to confirm SELinux support. I replaced it with a service-status check and moved label verification to the dedicated SELinux verification step.
- The post claimed the K3s process should run with `k3s_t`, but the official `k3s-selinux` policy labels the K3s binary as `container_runtime_exec_t` and its data paths as `container_var_lib_t`, `k3s_data_t`, and `container_file_t`. I updated the verification step to check the labels that the official policy actually defines.
- The AVC troubleshooting step used `audit2why` and `audit2allow` without installing the package that provides those utilities on RHEL-family systems. I added `policycoreutils-python-utils`.
- The boolean example used `container_connect_any`, which is not a current documented SELinux boolean for this workflow. I removed that guidance and kept the documented `container_use_devices` example, reframed as an optional device-access setting.
- The audit section said the rule snippet was for log rotation and used `service auditd reload`, which reloads `auditd.conf` rather than loading rules from `/etc/audit/rules.d/`. I corrected the description and changed the command to `augenrules --load`.
- The prerequisites referred to `CentOS 8/9`; I updated this to `CentOS Stream 8/9` for accuracy.

## Review Notes
- K3s documentation notes that using a custom `--data-dir` with SELinux is not supported unless you provide your own custom policy. The post currently assumes the default data directory, which is fine, but that caveat may be worth mentioning in a future revision.
