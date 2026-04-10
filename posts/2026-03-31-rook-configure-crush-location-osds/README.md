# How to Configure crush_location for OSDs in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CRUSH, OSD, Configuration

Description: Configure the crush_location option for Ceph OSDs to ensure accurate topology placement in the CRUSH map for proper failure domain isolation.

---

## What is crush_location for OSDs

The `crush_location` option in Ceph's configuration tells each OSD daemon where it sits in the CRUSH topology hierarchy. By default, every time an OSD starts it verifies that it is in the correct location in the CRUSH map and moves itself if it is not (controlled by the `osd crush update on start` option, which defaults to `true`). This is essential for automated deployments where you want OSDs to self-register and maintain the correct topology position.

## Setting crush_location in ceph.conf

You can set the location globally for all OSDs or per-OSD:

```ini
[global]
# Default location for all OSDs (overridden per-OSD if specified)
crush_location = root=default

[osd.0]
crush_location = root=default datacenter=dc1 rack=rack1 host=node-01

[osd.1]
crush_location = root=default datacenter=dc1 rack=rack1 host=node-01

[osd.2]
crush_location = root=default datacenter=dc2 rack=rack2 host=node-02
```

## Using crush_location in Rook

In Rook-based deployments, CRUSH locations are derived from Kubernetes node labels. Apply topology labels to nodes to control OSD placement:

```bash
# Apply topology labels to each node
kubectl label node k8s-node-01 \
  topology.kubernetes.io/region=us-east \
  topology.kubernetes.io/zone=us-east-1a \
  topology.rook.io/datacenter=dc1 \
  topology.rook.io/rack=rack1
```

Then configure Rook to use topology for CRUSH:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  storage:
    useAllNodes: true
    useAllDevices: true
  placement:
    all:
      nodeAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
          nodeSelectorTerms:
            - matchExpressions:
                - key: role
                  operator: In
                  values:
                    - storage-node
```

## Verifying OSD crush_location at Startup

When an OSD starts, it logs its CRUSH location:

```bash
# Check OSD startup logs for crush_location
kubectl -n rook-ceph logs rook-ceph-osd-0-xxxxxxxxx | grep crush_location

# Or check directly via ceph
ceph osd find 0
```

Expected output:

```json
{
    "osd": 0,
    "crush_location": {
        "datacenter": "dc1",
        "host": "node-01",
        "rack": "rack1",
        "root": "default"
    }
}
```

## Using crush_location_hook for Dynamic Locations

For fully dynamic location assignment, Ceph supports a `crush_location_hook` script that is executed at OSD startup:

```bash
# Create a location hook script
cat > /usr/local/bin/ceph-crush-location <<'EOF'
#!/bin/bash
# Returns crush location based on hostname and environment
HOST=$(hostname -s)
RACK=$(echo $HOST | sed 's/node-[0-9]*//' | cut -d- -f2)
echo "root=default rack=rack-$RACK host=$HOST"
EOF
chmod +x /usr/local/bin/ceph-crush-location
```

```ini
# Reference the hook in ceph.conf
[osd]
crush_location_hook = /usr/local/bin/ceph-crush-location
```

## Confirming Topology After Deployment

```bash
# View the full CRUSH tree to verify placement
ceph osd tree

# Sample output showing correct topology
# ID CLASS WEIGHT  TYPE NAME             STATUS REWEIGHT PRI-AFF
# -1       10.000  root default
# -5        5.000      datacenter dc1
# -3        5.000          rack rack1
# -2        5.000              host node-01
#  0   hdd  1.000                  osd.0   up  1.00000  1.00000
```

## Summary

The `crush_location` option defines an OSD's place in the CRUSH topology at startup. Set it in ceph.conf per OSD for static deployments, use Kubernetes node labels in Rook for dynamic placement, or use `crush_location_hook` for fully automated location detection. Correct CRUSH locations are the foundation of reliable failure domain isolation in Ceph.
