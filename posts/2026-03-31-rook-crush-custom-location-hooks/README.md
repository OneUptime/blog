# How to Use Custom Location Hooks in CRUSH

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CRUSH, OSD, Configuration

Description: Learn how to implement Ceph CRUSH custom location hooks to dynamically determine OSD topology placement at startup using scripts.

---

## What are CRUSH Location Hooks

Ceph's `osd crush location hook` configuration option specifies a script that runs when an OSD daemon starts. The script outputs key-value pairs representing the OSD's location in the CRUSH hierarchy. This allows dynamic topology detection without hardcoding locations in ceph.conf - especially useful in cloud environments, automated deployments, or where hostname patterns encode location information.

## Basic Hook Configuration

```ini
[osd]
osd crush location hook = /usr/local/bin/ceph-crush-location
```

The hook script receives the OSD ID as an argument and must output the CRUSH location to stdout in the format `key=value` separated by spaces:

```bash
#!/bin/bash
# /usr/local/bin/ceph-crush-location
# Arguments: --cluster <name> --id <osd-id> --type osd
echo "root=default host=$(hostname -s)"
```

## Parsing Hostname-Based Topology

Many organizations encode rack or datacenter information in hostnames. Here is a hook that parses this:

```bash
#!/bin/bash
# /usr/local/bin/ceph-crush-location
# Expected hostname format: dc1-rack3-node02

HOST=$(hostname -s)
DATACENTER=$(echo "$HOST" | cut -d- -f1)
RACK=$(echo "$HOST" | cut -d- -f1-2)

echo "root=default datacenter=${DATACENTER} rack=${RACK} host=${HOST}"
```

Make the hook executable:

```bash
chmod +x /usr/local/bin/ceph-crush-location
```

## Reading Location from a Metadata File

For cloud environments where instance metadata is available:

```bash
#!/bin/bash
# /usr/local/bin/ceph-crush-location

# Read from AWS EC2 instance metadata
AZ=$(curl -s http://169.254.169.254/latest/meta-data/placement/availability-zone 2>/dev/null)
REGION=$(curl -s http://169.254.169.254/latest/meta-data/placement/region 2>/dev/null)
HOST=$(hostname -s)

if [ -n "$AZ" ] && [ -n "$REGION" ]; then
  echo "root=default region=${REGION} datacenter=${AZ} host=${HOST}"
else
  # Fallback for non-cloud environments
  echo "root=default host=${HOST}"
fi
```

## Hook Arguments

The hook receives the following arguments from Ceph:

```text
--cluster <cluster-name>    e.g., ceph
--id <osd-id>               e.g., 0
--type osd                  always "osd"
```

A complete hook using these arguments:

```bash
#!/bin/bash
# Parse arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --cluster) CLUSTER="$2"; shift ;;
    --id) OSD_ID="$2"; shift ;;
    --type) OSD_TYPE="$2"; shift ;;
  esac
  shift
done

# Look up location from a custom database or config file
LOCATION_FILE="/etc/ceph/osd-locations.conf"
if [ -f "$LOCATION_FILE" ]; then
  LOCATION=$(grep "^osd.${OSD_ID}:" "$LOCATION_FILE" | cut -d: -f2)
  echo "$LOCATION"
else
  echo "root=default host=$(hostname -s)"
fi
```

## Location File Format for the Above Hook

```text
# /etc/ceph/osd-locations.conf
osd.0: root=default rack=rack1 host=node-01
osd.1: root=default rack=rack1 host=node-01
osd.2: root=default rack=rack2 host=node-02
```

## Testing the Hook

Before deploying, test the hook directly:

```bash
# Test the hook manually
/usr/local/bin/ceph-crush-location --cluster ceph --id 0 --type osd

# Expected output:
# root=default datacenter=dc1 rack=rack1 host=node-01

# Verify the OSD location in the CRUSH map
ceph osd find 0
```

## Summary

CRUSH location hooks provide a flexible, script-based mechanism for determining OSD placement in the topology hierarchy at startup. They are ideal for cloud deployments where availability zone metadata is available, for environments with hostname-encoded topology, or for any scenario where static ceph.conf entries are impractical. Always test your hook script independently before deploying it to production OSDs.
