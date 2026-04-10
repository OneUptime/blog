# Validation Summary: How to Configure Device Hotplug for Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Kubernetes (container orchestration)
- udev / udevadm (Linux device management)

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook Helm chart values (operator configuration): https://rook.io/docs/rook/latest/Helm-Charts/operator-chart/
- Rook operator Helm chart values.yaml: https://github.com/rook/rook/blob/master/deploy/charts/rook-ceph/values.yaml
- Rook discover daemon source code: https://github.com/rook/rook/blob/master/pkg/daemon/discover/discover.go

## Issues Found

### Step 3: False claim about udev rules installation
- **What was wrong:** The original Step 3 ("Verify udev Rules on the Host") claimed the discover DaemonSet installs udev rules at `/etc/udev/rules.d/99-rook.rules` on the host. This is incorrect. The Rook discover daemon uses `udevadm monitor -u -s block` within the container to listen for block device events in real-time, but it does NOT install any udev rules on the host filesystem. The `kubectl debug node` command to inspect `/etc/udev/rules.d/99-rook.rules` would always fail because that file does not exist.
- **What was changed:** Replaced the entire Step 3 with "Verify the Discovery Daemon is Running", which provides correct verification commands: checking discover pod status (`kubectl get pods -l app=rook-discover`), reviewing discover logs (`kubectl logs -l app=rook-discover`), and restarting the operator if pods are not running.
- **Why:** The original step would mislead readers into debugging a non-existent file, wasting time and causing confusion.

## Review Notes
- The "How Hotplug Detection Works" section describes the discover daemon as using udev events. This is accurate: the source code confirms the daemon runs `udevadm monitor -u -s block` for real-time event capture alongside periodic polling. It is a simplification (it omits the polling mechanism) but not incorrect.
- The `ROOK_DISCOVER_DEVICES_INTERVAL` default is `60m` per the Helm chart. The blog sets it to `30m` which is a valid custom value, not an error.
- The `disableDeviceHotplug` Helm parameter (defaults to `false`) is not mentioned in the blog. This is fine since the blog focuses on the discovery daemon approach, and hotplug is enabled by default.
- All CephCluster storage spec fields (`useAllNodes`, `useAllDevices`, `deviceFilter`, `config.osdsPerDevice`) are confirmed correct per the official CRD documentation.
- All kubectl commands and label selectors (`app=rook-discover`, `app=rook-ceph-osd-prepare`, `app=rook-ceph-osd`, `deploy/rook-ceph-tools`) are correct.
