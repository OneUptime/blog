# Validation Summary: Planning Your Kubernetes Upgrade Next Steps

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- kubeadm
- kubectl
- etcd
- CNI plugins
- Linux package management with apt

## Sources Consulted
- Kubernetes kubeadm upgrade guide: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/
- Kubernetes Linux worker node upgrade guide: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/upgrading-linux-nodes/
- Kubernetes package repository migration guide: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/change-package-repository/
- Kubernetes kubeadm installation guide: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes kubectl node debug guide: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes deprecated API migration guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/

## Issues Found
- `kubectl version --short` is not present in the current generated `kubectl version` reference. Changed the command to `kubectl version`.
- The deprecated API inventory command used `kubectl get all`, which does not cover every API resource. Kept the lightweight inventory but added a caveat that a dedicated scanner or API server warnings/metrics are needed for a complete check.
- The target version section did not mention switching `pkgs.k8s.io` repositories or using the package manager to discover the latest patch for the target minor version. Added the apt commands shown in the kubeadm upgrade guide.
- The disk-space check used `kubectl debug -it` inside a loop, which is unsuitable for a non-interactive script. Removed `-it` while preserving the documented `/host` filesystem check.
- The kubeadm package examples pinned `1.29.0-1.1`, while the current kubeadm docs recommend selecting the latest patch version with package patterns like `1.29.x-*`. Updated kubeadm, kubelet, and kubectl install examples accordingly and included `apt-mark unhold` / `apt-mark hold`.
- The control plane flow upgraded kubelet without first draining the node. Added the documented drain and uncordon steps around the control plane kubelet upgrade.
- The worker-node flow installed kubeadm, kubelet, and kubectl together before running `kubeadm upgrade node`. Updated the sequence to upgrade kubeadm, run `kubeadm upgrade node`, drain the node, then upgrade kubelet and kubectl.
- The CNI verification example used `curl` inside an nginx container, which is not a reliable assumption for the image. Replaced it with a BusyBox DNS lookup that keeps the pod alive long enough for `kubectl wait`.
- The deployment readiness check only excluded `1/1`, `2/2`, and `3/3`, which incorrectly reports healthy deployments with other replica counts. Replaced it with an `awk` comparison of ready and desired replicas.

## Review Notes
The guide remains an example for kubeadm-based clusters on Debian/Ubuntu-style systems. Managed Kubernetes services, RPM-based hosts, HA control planes, external etcd, and CNI-specific upgrade procedures still require provider-specific documentation.
