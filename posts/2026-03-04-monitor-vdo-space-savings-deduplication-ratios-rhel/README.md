# How to Monitor VDO Space Savings and Deduplication Ratios on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, VDO, Monitoring, Deduplication, Storage, Linux

Description: Learn how to monitor VDO volume space savings, deduplication ratios, and compression effectiveness on RHEL to optimize your storage infrastructure.

---

Monitoring VDO (Virtual Data Optimizer) volumes is essential to understand how effectively deduplication and compression are working. RHEL provides several tools to track VDO space savings and help with capacity planning.

## Quick Status with vdostats

```bash
# Get a human-readable overview of all VDO volumes
sudo vdostats --human-readable

# Sample output:
# Device               1K-blocks   Used       Available    Use%  Space saving%
# /dev/mapper/vdo0     104857600   31457280   73400320     30%   62%
```

The "Space saving%" column shows the overall data reduction from both deduplication and compression combined.

## Detailed Statistics

```bash
# Get full statistics for a specific VDO volume
sudo vdostats --verbose /dev/mapper/vdo0
```

Key metrics to watch:

```bash
# Parse specific metrics from vdostats verbose output
sudo vdostats --verbose /dev/mapper/vdo0 | grep -E "data blocks used|logical blocks used|saving percent"

# data blocks used: physical blocks consumed on disk
# logical blocks used: logical blocks written by applications
# saving percent: overall space reduction percentage
```

## Calculating Deduplication and Compression Ratios

```bash
# Get raw numbers for ratio calculation
LOGICAL=$(sudo vdostats --verbose /dev/mapper/vdo0 | grep "logical blocks used" | awk '{print $NF}')
PHYSICAL=$(sudo vdostats --verbose /dev/mapper/vdo0 | grep "data blocks used" | awk '{print $NF}')

# Calculate the ratio
echo "scale=2; $LOGICAL / $PHYSICAL" | bc
# A result of 3.00 means 3:1 data reduction
```

## Monitoring Over Time

Set up periodic logging to track trends:

```bash
# Create a monitoring script
sudo tee /usr/local/bin/vdo-monitor.sh << 'EOF'
#!/bin/bash
# Log VDO stats with timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
STATS=$(vdostats --human-readable | tail -n +2)
echo "${TIMESTAMP} ${STATS}" >> /var/log/vdo-space-savings.log
EOF

sudo chmod +x /usr/local/bin/vdo-monitor.sh

# Run every 30 minutes via cron
echo "*/30 * * * * root /usr/local/bin/vdo-monitor.sh" | sudo tee /etc/cron.d/vdo-monitor
```

## Setting Up Alerts

```bash
# Script to alert when physical space usage exceeds 80%
sudo tee /usr/local/bin/vdo-alert.sh << 'EOF'
#!/bin/bash
USAGE=$(vdostats /dev/mapper/vdo0 | tail -1 | awk '{print $4}' | tr -d '%')
if [ "$USAGE" -gt 80 ]; then
    logger -p local0.warning "VDO volume vdo0 physical usage at ${USAGE}%"
fi
EOF

sudo chmod +x /usr/local/bin/vdo-alert.sh
```

Regular monitoring prevents surprises. When physical space runs low on a VDO volume, write operations will fail, so always monitor the physical usage rather than just the logical usage reported by standard tools like `df`.
