# How to View Connection Status via Admin Socket

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Admin Socket, Connection, Network, Debug

Description: View active network connections, messenger state, and peer connectivity for Ceph daemons via the admin socket to diagnose network issues and monitor cluster communication.

---

## Overview

Ceph daemons communicate over TCP/IP using an internal messenger protocol. The admin socket exposes commands to inspect active connections, view peer states, and diagnose connectivity issues without using external network tools.

## Viewing Connections on an OSD

```bash
# Show OSD status including network address info
ceph daemon osd.0 status

# View messenger statistics
ceph daemon osd.0 perf dump | python3 -m json.tool | grep -A5 'AsyncMessenger'
```

## Dumping Messenger Statistics

```bash
# Detailed messenger performance stats
ceph daemon osd.0 perf dump | python3 -c "
import sys, json
data = json.load(sys.stdin)
ms = data.get('AsyncMessenger::Worker-0', {})
if ms:
    print('msgr_send_bytes:', ms.get('msgr_send_bytes', 0))
    print('msgr_recv_bytes:', ms.get('msgr_recv_bytes', 0))
    print('msgr_send_messages:', ms.get('msgr_send_messages', 0))
    print('msgr_recv_messages:', ms.get('msgr_recv_messages', 0))
"
```

## Viewing Session State on MON

```bash
# View MON connection sessions
ceph daemon mon.$(hostname) sessions

# Show monitor status and quorum info
ceph daemon mon.$(hostname) mon_status
```

## Checking OSD Peer Connections

```bash
# List active RADOS watch/notify subscriptions on this OSD
ceph daemon osd.0 dump_watchers

# View operation tracking for connected clients
ceph daemon osd.0 dump_ops_in_flight | python3 -m json.tool
```

## Network Health via Admin Socket

```bash
# Check if OSD can see its peers
ceph daemon osd.0 config get cluster_addr
ceph daemon osd.0 config get public_addr

# Verify OSD network interfaces
ceph daemon osd.0 config get cluster_network
ceph daemon osd.0 config get public_network
```

## Connection Debugging Script

```bash
#!/bin/bash
# check-osd-connections.sh - verify all OSD connections are healthy
# Uses 'ceph tell' which works remotely via the MON (unlike 'ceph daemon' which is local-only)

ERRORS=0
for osd in $(ceph osd ls); do
    STATUS=$(ceph tell osd.$osd version 2>&1)
    if echo "$STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin)['version'])" 2>/dev/null; then
        VERSION=$(echo "$STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin)['version'])")
        echo "OSD $osd: CONNECTED ($VERSION)"
    else
        echo "OSD $osd: ERROR - $STATUS"
        ((ERRORS++))
    fi
done

echo ""
echo "Total OSDs: $(ceph osd ls | wc -l)"
echo "Connection errors: $ERRORS"
```

## Messenger Connection Counters

```bash
# Check for connection errors and resets
for i in 0 1 2; do
    echo "--- AsyncMessenger Worker $i ---"
    ceph daemon osd.0 perf dump | python3 -c "
import sys, json
data = json.load(sys.stdin)
ms = data.get(f'AsyncMessenger::Worker-$i', {})
for k in ['msgr_created_connections', 'msgr_active_connections', 'msgr_send_messages', 'msgr_recv_messages']:
    print(f'  {k}: {ms.get(k, 0)}')
" 2>/dev/null
done
```

## Detecting Connection Flapping

```bash
# Watch for connection reset messages in OSD log
journalctl -u ceph-osd@0 --no-pager | grep -E "reset|disconnect|lost connection" | tail -20

# Check messenger error counters
ceph daemon osd.0 perf dump | python3 -m json.tool | grep -i "error\|reset\|lost"
```

## Summary

The Ceph admin socket provides visibility into daemon network connections through the `status`, `sessions`, and messenger perf counters. Use these to diagnose network partitions, identify flapping connections, and verify that all cluster members are communicating correctly. Combined with external network tools, admin socket connection inspection gives a complete picture of cluster network health.
