# How to Set Up Log Rotation for Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Log Rotation, Disk Management, Operation, Logging

Description: Configure log rotation for Ceph daemons running in Rook to prevent log files from consuming excessive disk space on Kubernetes nodes.

---

When Ceph daemons write log files to disk, uncontrolled growth can fill node storage and cause cluster instability. In Rook-managed clusters, log rotation is handled differently depending on whether logs go to files or to container stdout.

## Understanding Log Destinations in Rook

By default, Rook configures Ceph daemons to log to stderr, which is captured by the container runtime and available via `kubectl logs`. When logging to files is enabled, rotation must be configured separately.

Check current log destination:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config get osd log_to_file
```

## Configure Logrotate on Kubernetes Nodes

If Ceph daemons write to `/var/log/ceph/` on nodes, configure logrotate:

```bash
# Create logrotate config on each node
cat > /etc/logrotate.d/ceph << 'EOF'
/var/log/ceph/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    sharedscripts
    postrotate
        pkill -HUP ceph-osd || true
        pkill -HUP ceph-mon || true
    endscript
}
EOF
```

Create a ConfigMap from the logrotate config and apply it via a privileged DaemonSet:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ceph-logrotate-config
  namespace: rook-ceph
data:
  ceph: |
    /var/log/ceph/*.log {
        daily
        rotate 7
        compress
        delaycompress
        missingok
        notifempty
        sharedscripts
        postrotate
            pkill -HUP ceph-osd || true
            pkill -HUP ceph-mon || true
        endscript
    }
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: ceph-logrotate
  namespace: rook-ceph
spec:
  selector:
    matchLabels:
      app: ceph-logrotate
  template:
    metadata:
      labels:
        app: ceph-logrotate
    spec:
      hostPID: true
      containers:
      - name: logrotate
        image: alpine:3.18
        command:
        - sh
        - -c
        - |
          apk add --no-cache logrotate
          while true; do
            logrotate -s /tmp/logrotate.status /etc/logrotate.d/ceph
            sleep 86400
          done
        securityContext:
          privileged: true
        volumeMounts:
        - name: varlog
          mountPath: /var/log
        - name: logrotate-config
          mountPath: /etc/logrotate.d/ceph
          subPath: ceph
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: logrotate-config
        configMap:
          name: ceph-logrotate-config
```

## Configure Kubernetes Log Rotation

For container stdout logs managed by the container runtime, configure log rotation via kubelet flags on each node:

```bash
--container-log-max-size=100Mi
--container-log-max-files=5
```

## Reduce Log Volume Instead of Rotating

Lower Ceph log verbosity to reduce the rotation burden:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set global debug_osd 0/2

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set global debug_ms 0/0
```

## Verify Rotation is Working

Check log sizes before and after rotation:

```bash
kubectl -n rook-ceph exec -it <osd-pod> -- ls -lh /var/log/ceph/
```

## Summary

Log rotation in Rook-managed Ceph clusters is primarily handled at two levels: the container runtime (for stdout logs) and logrotate on the host (for file-based logs). Configuring `--container-log-max-size` in kubelet is the simplest approach for clusters where Ceph logs to stderr, while file-based logging requires a dedicated logrotate DaemonSet.
