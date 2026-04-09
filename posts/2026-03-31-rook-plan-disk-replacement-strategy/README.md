# How to Plan Disk Replacement Strategy for Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Operation, Disk, Maintenance, Storage

Description: Develop a systematic disk replacement strategy for Ceph clusters covering failure detection, graceful OSD removal, hardware replacement, and safe OSD re-addition procedures.

---

## Building a Proactive Replacement Strategy

Disk failures in Ceph clusters are inevitable - the question is whether you respond reactively after data loss risk accumulates or proactively before drives fail. A good strategy combines SMART monitoring for early warning, defined procedures for graceful removal, and spare capacity planning.

## Monitoring Drive Health

Set up SMART monitoring on all OSD nodes:

```bash
# Install smartmontools
dnf install -y smartmontools

# Enable SMART on a drive
smartctl -s on /dev/sda

# Check SMART health
smartctl -H /dev/sda

# Get detailed attributes
smartctl -a /dev/sda | grep -E "Reallocated|Pending|Uncorrectable|Temperature|Power_On"
```

Automate daily SMART checks:

```bash
cat > /etc/cron.daily/ceph-smart-check << 'EOF'
#!/bin/bash
for disk in /dev/sd[a-z] /dev/nvme*; do
  [ -b "$disk" ] || continue
  RESULT=$(smartctl -H $disk 2>/dev/null | grep "SMART overall-health")
  if echo "$RESULT" | grep -q "FAILED"; then
    echo "ALERT: $disk SMART health FAILED on $(hostname)" | \
        mail -s "SMART Failure Alert" ops@example.com
  fi
done
EOF
chmod +x /etc/cron.daily/ceph-smart-check
```

## Scheduled SMART Monitoring via Kubernetes

In Rook environments, use a DaemonSet to monitor disk health:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: smart-monitor
  namespace: rook-ceph
spec:
  selector:
    matchLabels:
      app: smart-monitor
  template:
    metadata:
      labels:
        app: smart-monitor
    spec:
      nodeSelector:
        ceph-osd: "true"
      hostPID: true
      containers:
      - name: smartmonitor
        image: alpine:3.18
        command:
        - /bin/sh
        - -c
        - |
          apk add --no-cache smartmontools
          while true; do
            for d in /host/dev/sd* /host/dev/nvme*; do
              [ -b "$d" ] && smartctl -H $d 2>/dev/null | grep -i failed && echo "FAILED: $d"
            done
            sleep 3600
          done
        securityContext:
          privileged: true
        volumeMounts:
        - name: dev
          mountPath: /host/dev
      volumes:
      - name: dev
        hostPath:
          path: /dev
```

## Graceful OSD Removal Before Replacement

Before physically replacing a drive, gracefully remove the OSD:

```bash
# 1. Mark OSD as out (triggers data migration away from it)
ceph osd out osd.3

# 2. Wait for data to migrate
watch -n 30 'ceph -s | grep misplaced'

# 3. Verify cluster is healthy
ceph health

# 4. Stop the OSD daemon on the node
systemctl stop ceph-osd@3

# 5. Mark OSD down (speeds up detection vs waiting for heartbeat timeout)
ceph osd down osd.3

# 6. Purge the OSD from cluster (removes from CRUSH map, auth, and OSD map)
ceph osd purge osd.3 --yes-i-really-mean-it
```

## Replacing the Physical Drive

After purging the OSD:

```bash
# On the node - identify the failed drive
lsblk
ls -la /dev/disk/by-id/ | grep <serial>

# Zero the first few MBs to clear any old OSD data
dd if=/dev/zero of=/dev/sdb bs=1M count=100

# Physically replace the drive
# Then rescan SCSI bus to detect new drive
echo "- - -" > /sys/class/scsi_host/host0/scan
```

## Re-Adding the OSD in Rook

For Rook-managed clusters, trigger OSD discovery after drive replacement:

```bash
# Delete the OSD prepare job to allow re-provisioning
kubectl delete job -n rook-ceph $(kubectl get jobs -n rook-ceph -o name | grep osd-prepare | head -1)

# Rook will automatically discover and provision the new drive
kubectl logs -n rook-ceph -l app=rook-ceph-operator -f | grep -i "new osd"
```

## Maintaining Spare OSD Capacity

Reserve 10-15% spare drive slots in each node for hot spares:

```bash
# Check per-OSD fill levels (column number for %USE may vary by Ceph version)
ceph osd df | awk 'NR>1 && $1 ~ /^[0-9]+/ {print $1, $11"%"}' | sort -t'%' -k2 -n

# Calculate cluster-wide utilization
ceph df | awk '/TOTAL/ {print "Used:", $6"%", "(" $5, "of", $2 ")"}'
```

## Summary

A proactive disk replacement strategy combines SMART monitoring for early failure detection, graceful OSD removal before hardware replacement (allowing data migration to complete safely), and maintaining spare capacity to absorb new drive commissioning time. In Rook environments, deleting the OSD prepare job triggers automatic reprovisioning of newly installed drives without manual intervention.
