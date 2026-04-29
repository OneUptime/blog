# Validation Summary: How to Install K3s on Fedora

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- K3s
- Kubernetes
- Fedora Linux
- SELinux
- firewalld
- cgroup v2
- `kubectl`

## Sources Consulted
- K3s Requirements: https://docs.k3s.io/installation/requirements
- K3s Advanced Options / Configuration: https://docs.k3s.io/advanced
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Environment Variables: https://docs.k3s.io/reference/env-variables
- K3s Quick-Start Guide: https://docs.k3s.io/quick-start
- K3s Cluster Access: https://docs.k3s.io/cluster-access
- K3s Basic Network Options: https://docs.k3s.io/networking/basic-network-options
- Kubernetes swap behavior: https://kubernetes.io/docs/reference/node/swap-behavior/
- Kubernetes swap memory management: https://kubernetes.io/docs/concepts/cluster-administration/swap-memory-management/
- Kubernetes NodePort service access: https://kubernetes.io/docs/tasks/access-application-cluster/service-access-application-cluster/
- Fedora `container-selinux` package metadata: https://packages.fedoraproject.org/pkgs/container-selinux/container-selinux/
- Fedora `selinux-policy` package metadata: https://packages.fedoraproject.org/pkgs/selinux-policy/selinux-policy/
- Fedora `policycoreutils-python-utils` package metadata: https://packages.fedoraproject.org/pkgs/policycoreutils/policycoreutils-python-utils/

## Issues Found
- The firewalld section described TCP `10250` as an agent-registration port. K3s documents it as the kubelet metrics/API port, primarily relevant for metrics-server and node-to-node access. I corrected the comment and aligned the base firewalld rules with the K3s requirements page by adding the trusted-zone pod and service CIDRs.
- The firewalld section used `cni0` and `flannel.1` interface rules instead of the official K3s guidance to trust the default pod and service CIDRs. I replaced those rules with the documented `10.42.0.0/16` and `10.43.0.0/16` trusted-zone source rules.
- The SELinux section said the recommended install was only `container-selinux` and `selinux-policy-base`. K3s also requires the `k3s-selinux` policy package. I added installation of the official Rancher `k3s-selinux` RPM.
- The permissive-mode fallback used the wrong config key in `/etc/selinux/config` (`ENFORCING=` instead of `SELINUX=`). I corrected the `sed` command.
- The install steps claimed `INSTALL_K3S_SELINUX_WARN=true` ensures the SELinux RPM is installed. The official K3s docs state that this variable only tells the installer to continue with a warning if the policy is not found. I removed that incorrect guidance.
- The server and agent install steps did not actually enable SELinux support in K3s. The official K3s docs require `--selinux`, `K3S_SELINUX=true`, or `selinux: true` in config. I added `selinux: true` to both config files.
- The agent install command placed `INSTALL_K3S_EXEC="agent"` before `sudo` in the original post, which is not a reliable way to pass the variable to the root shell running the installer. I changed it to `sudo env INSTALL_K3S_EXEC="agent" sh -`.
- The agent-node section wrote `/etc/rancher/k3s/config.yaml` without first creating `/etc/rancher/k3s`. I added `sudo mkdir -p /etc/rancher/k3s`.
- The NodePort test curled `localhost`, but Kubernetes documents NodePort access via the node address and node port. I changed the test to use the node IP.
- The test section did not wait for the deployment to become ready before curling the service. I added `kubectl rollout status deployment/test-nginx` to make the flow reliable.
- The cgroup v2 section made a specific K3s version claim that was not reflected in the current official installation docs. I replaced it with version-neutral wording scoped to the versions covered by the guide.
- The cgroup troubleshooting note implied `systemd-cgls` directly shows `memory.max`. It shows the hierarchy, not the cgroup file values themselves. I corrected the troubleshooting note.

## Review Notes
- The post's "Tested Versions" section lists Fedora 37-40 and K3s `v1.26+`. I left that intact because it is presented as the author's tested matrix, not as current upstream support policy.
- K3s currently documents Fedora as a supported OS family with additional firewalld setup requirements, but it does not publish Fedora-version-specific installation instructions on the main requirements page.
