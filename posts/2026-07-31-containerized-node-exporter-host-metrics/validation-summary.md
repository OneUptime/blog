# Validation Summary: Why Containerized Node Exporter Reports Container Metrics Instead of Host Metrics

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Prometheus
- PromQL
- Prometheus Node Exporter
- Docker
- Kubernetes
- Linux namespaces, procfs, sysfs, and mount propagation
- kubelet/cAdvisor

## Sources Consulted

- [Prometheus Node Exporter v1.11.1 README: Docker deployment, collectors, and `timex` capability guidance](https://github.com/prometheus/node_exporter/blob/v1.11.1/README.md)
- [Prometheus Node Exporter releases](https://github.com/prometheus/node_exporter/releases)
- [Prometheus Node Exporter v1.11.1 Linux filesystem collector source](https://github.com/prometheus/node_exporter/blob/v1.11.1/collector/filesystem_linux.go)
- [Prometheus Node Exporter v1.11.1 Linux network device collector source](https://github.com/prometheus/node_exporter/blob/v1.11.1/collector/netdev_linux.go)
- [Prometheus Node Exporter v1.11.1 Linux systemd collector source](https://github.com/prometheus/node_exporter/blob/v1.11.1/collector/systemd_linux.go)
- [Prometheus Node Exporter v1.11.1 Linux uname collector source](https://github.com/prometheus/node_exporter/blob/v1.11.1/collector/uname_linux.go)
- [Prometheus Community Node Exporter Helm chart values](https://github.com/prometheus-community/helm-charts/blob/main/charts/prometheus-node-exporter/values.yaml)
- [Prometheus guide to monitoring Linux host metrics with Node Exporter](https://prometheus.io/docs/guides/node-exporter/)
- [Prometheus guide to monitoring container metrics with cAdvisor](https://prometheus.io/docs/guides/cadvisor/)
- [Prometheus querying basics and regular-expression matchers](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Prometheus aggregation operators](https://prometheus.io/docs/prometheus/latest/querying/operators/#aggregation-operators)
- [Docker `container run` reference](https://docs.docker.com/reference/cli/docker/container/run/)
- [Docker bind mounts, recursive read-only behavior, and bind propagation](https://docs.docker.com/engine/storage/bind-mounts/)
- [Docker host network driver](https://docs.docker.com/engine/network/drivers/host/)
- [Kubernetes volume and mount propagation documentation](https://kubernetes.io/docs/concepts/storage/volumes/#mount-propagation)
- [Kubernetes DaemonSet documentation](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)
- [Kubernetes Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [Kubernetes NetworkPolicy behavior for `hostNetwork` Pods](https://kubernetes.io/docs/concepts/services-networking/network-policies/#networkpolicy-and-hostnetwork-pods)
- [Kubernetes Pod API reference](https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/)
- [Linux kernel procfs documentation](https://docs.kernel.org/filesystems/proc.html#proc-pid-mountinfo-information-about-mounts)
- [Linux kernel shared-subtree documentation](https://docs.kernel.org/filesystems/sharedsubtree.html)
- [`findmnt(8)` Linux manual page](https://man7.org/linux/man-pages/man8/findmnt.8.html)
- [`ip(8)` Linux manual page](https://man7.org/linux/man-pages/man8/ip.8.html)

## Issues Found

- The Docker and Kubernetes snippets used the literal `<pinned-version>` placeholder. In a shell command, the angle brackets are parsed as redirection operators, and the value is not a valid container image reference. Replaced both placeholders with the current Node Exporter release tag, `v1.11.1`, and versioned the related upstream documentation links.
- The post said `node_filesystem_size_bytes{mountpoint="/"}` would describe the container image in a default container. Node Exporter's Linux filesystem collector excludes the `overlay` filesystem type by default, so the container root series is normally absent. Updated the example to describe the missing host filesystem series accurately.
- The Docker root bind was described as fully read-only without qualification. With Docker's default recursive bind behavior, nested submounts become read-only on Linux 5.12 or later but remain read-write on older kernels. Updated the wording to preserve that distinction.
- The `--path.rootfs` explanation implied that it affected every collector. Updated it to refer specifically to rootfs-aware collectors; procfs, sysfs, namespace, and interface access have separate dependencies.
- The Kubernetes security discussion mentioned only the Restricted Pod Security profile and only `hostPID`. The shown Pod also violates the Baseline profile because both Baseline and Restricted disallow host namespaces and `hostPath` volumes. Corrected the policy statement.
- The post recommended NetworkPolicy for the `hostNetwork` Pod without noting its portability limit. Kubernetes defines this behavior as implementation-dependent, and the common behavior is to ignore `hostNetwork` Pods for selector matching. Updated the guidance to require explicit CNI support or host firewall controls.

## Review Notes

- Node Exporter `v1.11.1` was the latest upstream release at validation time. Re-evaluate the pinned tag during a future post update; use an image digest as well if registry-level immutability is required.
- The upstream Docker pattern does not join the host UTS namespace. `node_uname_info` still reports the host kernel release and version, but its `nodename` label can reflect the container hostname. Use scrape target or node-discovery labels as the stable node identity.
- Docker bind propagation is available only on Linux hosts and does not work with Docker Desktop.
