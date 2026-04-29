# Validation Summary: How to Configure K3s Data Directory

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- Local Path Provisioner
- containerd
- Linux storage and filesystems
- systemd

## Sources Consulted
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Server CLI Reference: https://docs.k3s.io/cli/server
- K3s Quick-Start Guide: https://docs.k3s.io/quick-start
- K3s Cluster Access: https://docs.k3s.io/cluster-access
- K3s Helm Add-On Documentation: https://docs.k3s.io/add-ons/helm
- K3s Backup and Restore: https://docs.k3s.io/datastore/backup-restore
- K3s Multus and IPAM plugins: https://docs.k3s.io/networking/multus-ipams
- K3s packaged local storage manifest: https://raw.githubusercontent.com/k3s-io/k3s/main/manifests/local-storage.yaml

## Issues Found
- The storage tree described `server/db/` as an etcd-only database path. I changed this to `SQLite or embedded etcd datastore` because K3s defaults to SQLite unless configured for embedded etcd or an external datastore.
- The storage tree described `server/static/` as `Static pods`. I corrected this to `Static files served by the Kubernetes API server`, which matches the K3s Helm/static content documentation.
- The migration instructions appended `data-dir` directly to `config.yaml`. I changed this to a config drop-in under `/etc/rancher/k3s/config.yaml.d/`, which matches K3s configuration file loading behavior and avoids duplicate-key issues in the main YAML file.
- The verification step used plain `kubectl` without configuring kubeconfig. I changed it to `sudo k3s kubectl`, which works with the default K3s-installed tooling and kubeconfig path.
- The monitoring section labeled `server/db/` as etcd-only. I corrected that label to cover both SQLite and etcd-backed K3s server state.
- The monitoring example claimed to set up an alert, but the command only attempted to read a nonexistent file. I replaced it with a working disk-usage threshold check.
- The Local Path Provisioner section used a `HelmChartConfig` example for `local-path` with `storageClass.defaultPath`, which does not match how K3s packages local storage. I replaced it with the documented K3s server setting `default-local-storage-path`.

## Review Notes
- The symlink-based split of etcd and containerd storage relies on standard Linux filesystem behavior; K3s does not document a first-class separate-path setting for those subdirectories.
- The NVMe formatting and mount recommendations are Linux-level guidance rather than K3s-specific documented requirements.
