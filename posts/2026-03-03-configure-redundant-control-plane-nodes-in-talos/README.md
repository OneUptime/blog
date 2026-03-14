# How to Configure Redundant Control Plane Nodes in Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Control Plane, Redundancy, High Availability, Kubernetes, Etcd

Description: Learn how to configure and manage redundant control plane nodes in Talos Linux for a resilient Kubernetes cluster that tolerates node failures.

---

The control plane is the brain of your Kubernetes cluster. It runs etcd for state storage, the API server for all cluster interactions, the scheduler for pod placement, and the controller manager for maintaining desired state. If your control plane goes down, you can not deploy new workloads, scale existing ones, or even check the health of your cluster. Running redundant control plane nodes in Talos Linux is essential for any production deployment, and Talos makes this easier than most distributions because every control plane node runs the same immutable configuration.

This guide focuses specifically on the control plane redundancy aspects of a Talos Linux cluster, including etcd management, configuration synchronization, certificate handling, and operational procedures.

## Understanding Control Plane Redundancy

A redundant control plane in Kubernetes means running multiple instances of each control plane component:

- **etcd** - Needs an odd number of members (3 or 5) for quorum. Three members tolerate one failure, five tolerate two.
- **kube-apiserver** - Runs on every control plane node behind a load balancer. Stateless, so any number of replicas work.
- **kube-scheduler** - Uses leader election. Only one instance is active at a time, but others are on standby.
- **kube-controller-manager** - Also uses leader election with hot standby replicas.

Talos Linux runs all of these components as static pods managed by the Talos runtime, not by Kubernetes itself. This means they start before Kubernetes is fully running and do not depend on the cluster's own scheduling.

## Planning Your Control Plane

For most production clusters, three control plane nodes provide the right balance:

```text
Control Plane Node 1: 192.168.1.10 (etcd member, apiserver, scheduler, controller-manager)
Control Plane Node 2: 192.168.1.11 (etcd member, apiserver, scheduler, controller-manager)
Control Plane Node 3: 192.168.1.12 (etcd member, apiserver, scheduler, controller-manager)
VIP / Load Balancer:  192.168.1.100 (floating endpoint)
```

For larger clusters or those requiring higher fault tolerance, use five control plane nodes. Going beyond five rarely provides additional benefit because the overhead of etcd consensus increases with member count.

## Generating Control Plane Configuration

Generate the base configuration:

```bash
# Generate configs targeting the VIP endpoint
talosctl gen config ha-cluster https://192.168.1.100:6443 \
  --output-dir _out
```

Create a patch that applies to all control plane nodes:

```yaml
# cp-common-patch.yaml
machine:
  network:
    interfaces:
      - interface: eth0
        dhcp: true
        vip:
          ip: 192.168.1.100
  kubelet:
    extraArgs:
      rotate-server-certificates: "true"
  install:
    disk: /dev/sda
    wipe: false
cluster:
  etcd:
    advertisedSubnets:
      - 192.168.1.0/24
    extraArgs:
      election-timeout: "5000"
      heartbeat-interval: "500"
      snapshot-count: "10000"
      auto-compaction-mode: periodic
      auto-compaction-retention: "5m"
  apiServer:
    certSANs:
      - 192.168.1.100
      - 192.168.1.10
      - 192.168.1.11
      - 192.168.1.12
    extraArgs:
      default-not-ready-toleration-seconds: "30"
      default-unreachable-toleration-seconds: "30"
  controllerManager:
    extraArgs:
      node-monitor-period: "5s"
      node-monitor-grace-period: "20s"
  scheduler:
    extraArgs:
      bind-address: "0.0.0.0"
  allowSchedulingOnControlPlanes: false
```

The etcd configuration includes tuned timeouts: the election timeout of 5000ms and heartbeat interval of 500ms are appropriate for most on-premise deployments. For cloud environments with higher network latency, you may need to increase these values.

## Applying Node-Specific Configurations

Each control plane node may need slight variations. Use per-node patches:

```yaml
# cp1-patch.yaml
machine:
  network:
    hostname: cp-1

# cp2-patch.yaml
machine:
  network:
    hostname: cp-2

# cp3-patch.yaml
machine:
  network:
    hostname: cp-3
```

Apply configurations:

```bash
# Apply to first control plane node
talosctl apply-config --insecure --nodes 192.168.1.10 \
  --file _out/controlplane.yaml \
  --config-patch @cp-common-patch.yaml \
  --config-patch @cp1-patch.yaml

# Apply to second control plane node
talosctl apply-config --insecure --nodes 192.168.1.11 \
  --file _out/controlplane.yaml \
  --config-patch @cp-common-patch.yaml \
  --config-patch @cp2-patch.yaml

# Apply to third control plane node
talosctl apply-config --insecure --nodes 192.168.1.12 \
  --file _out/controlplane.yaml \
  --config-patch @cp-common-patch.yaml \
  --config-patch @cp3-patch.yaml
```

## Managing etcd Membership

After bootstrapping, verify etcd membership:

```bash
# List etcd members
talosctl etcd members --nodes 192.168.1.10

# Check etcd status on each node
talosctl etcd status --nodes 192.168.1.10,192.168.1.11,192.168.1.12
```

### Adding a Control Plane Node

To add a fourth or fifth control plane node:

```bash
# Apply control plane config to the new node
talosctl apply-config --insecure --nodes 192.168.1.13 \
  --file _out/controlplane.yaml \
  --config-patch @cp-common-patch.yaml \
  --config-patch @cp4-patch.yaml
```

The new node will automatically join the etcd cluster during bootstrap.

### Removing a Control Plane Node

If you need to decommission a control plane node:

```bash
# First, remove the etcd member
talosctl etcd remove-member --nodes 192.168.1.10 <member-id>

# Then drain the node
kubectl drain cp-4 --ignore-daemonsets --delete-emptydir-data

# Reset the node
talosctl reset --nodes 192.168.1.13 --graceful
```

Always remove the etcd member before shutting down the node. If you shut down first, the remaining etcd members may have issues reaching quorum during the removal.

## Certificate Management

Talos automatically manages certificates for control plane components. Each control plane node gets its own server certificate for the API server, and all nodes share the same CA. The certSANs field ensures certificates include all node IPs and the VIP:

```yaml
cluster:
  apiServer:
    certSANs:
      - 192.168.1.100     # VIP
      - 192.168.1.10      # CP1
      - 192.168.1.11      # CP2
      - 192.168.1.12      # CP3
      - cp1.example.com   # DNS names if using DNS-based LB
      - cp2.example.com
      - cp3.example.com
```

If you need to rotate certificates:

```bash
# Rotate Talos API certificates
talosctl gen secrets --from-controlplane-config _out/controlplane.yaml > secrets.yaml
```

## Monitoring Control Plane Health

Create Prometheus alerts for control plane issues:

```yaml
# control-plane-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: control-plane-alerts
  namespace: monitoring
spec:
  groups:
    - name: control-plane
      rules:
        - alert: EtcdMemberDown
          expr: up{job="etcd"} == 0
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "etcd member is down on {{ $labels.instance }}"

        - alert: EtcdNoLeader
          expr: etcd_server_has_leader == 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "etcd cluster has no leader"

        - alert: EtcdHighCommitDuration
          expr: histogram_quantile(0.99, rate(etcd_disk_wal_fsync_duration_seconds_bucket[5m])) > 0.5
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "etcd WAL fsync is slow on {{ $labels.instance }}"

        - alert: APIServerDown
          expr: up{job="apiserver"} == 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "API server is down on {{ $labels.instance }}"
```

## Backup and Recovery

Regularly back up etcd data from your control plane:

```bash
# Take an etcd snapshot
talosctl etcd snapshot db.snapshot --nodes 192.168.1.10

# Verify the snapshot
talosctl etcd snapshot status db.snapshot
```

Schedule automatic backups:

```bash
# Create a cron job to back up etcd daily
# Run this from your management machine
0 2 * * * talosctl etcd snapshot /backups/etcd-$(date +\%Y\%m\%d).snapshot --nodes 192.168.1.10
```

To recover from a snapshot:

```bash
# Recover etcd from a snapshot (use only in disaster recovery)
talosctl bootstrap --recover-from=/path/to/db.snapshot --nodes 192.168.1.10
```

## Performance Tuning

For control plane nodes, ensure etcd has fast storage. On bare metal, use NVMe drives for the etcd data directory. In cloud environments, use provisioned IOPS storage. The etcd performance directly affects the responsiveness of your entire cluster.

```yaml
# Ensure etcd uses fast storage
machine:
  install:
    disk: /dev/nvme0n1  # Use NVMe for better etcd performance
```

## Conclusion

Redundant control plane nodes are the foundation of a production-ready Talos Linux cluster. With three or five nodes, proper etcd configuration, and a load balancer or VIP, your cluster can survive individual node failures without impacting availability. Talos's immutable design ensures that all control plane nodes are configured identically, eliminating the configuration drift that often causes problems in HA setups. Regular etcd backups and proper monitoring complete the picture, giving you confidence that your cluster will remain available through any single-node failure scenario.
