# How to Fix MON_MSGR2_NOT_ENABLED Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Monitor, Messenger, Security

Description: Learn how to resolve the MON_MSGR2_NOT_ENABLED warning in Ceph by enabling the msgr2 protocol on all monitors for encrypted and authenticated communication.

---

## Understanding MON_MSGR2_NOT_ENABLED

Ceph msgr2 is the second generation messenger protocol introduced in Nautilus (14.x). It supports both encryption and authentication modes (`crc` and `secure`). The `MON_MSGR2_NOT_ENABLED` health check fires when monitors are not listening on the msgr2 port (port 3300), meaning clients can only connect using the older v1 protocol.

Check current health:

```bash
ceph health detail
```

Example output:

```text
HEALTH_WARN 3 monitors have not enabled msgr2
[WRN] MON_MSGR2_NOT_ENABLED: 3 monitors have not enabled msgr2
    mon.a has not enabled msgr2
    mon.b has not enabled msgr2
    mon.c has not enabled msgr2
```

## Checking Monitor Addresses

Inspect the monitor map to see which addresses are configured:

```bash
ceph mon dump
```

If monitors only show v1 addresses (port 6789) and no v2 addresses (port 3300), msgr2 is not enabled.

## Enabling msgr2 on All Monitors

Run the following command to enable msgr2 on all monitors simultaneously:

```bash
ceph mon enable-msgr2
```

This updates the monmap so each monitor also binds to port 3300. Verify the change:

```bash
ceph mon dump
```

You should now see both v1 and v2 addresses:

```text
0: [v2:10.0.0.10:3300/0,v1:10.0.0.10:6789/0] mon.a
1: [v2:10.0.0.11:3300/0,v1:10.0.0.11:6789/0] mon.b
2: [v2:10.0.0.12:3300/0,v1:10.0.0.12:6789/0] mon.c
```

## Fixing in Rook-Ceph

In Rook-managed clusters, the CephCluster resource controls network settings. Ensure the `network` section does not restrict msgr2:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  network:
    connections:
      requireMsgr2: true
```

Apply the patch:

```bash
kubectl -n rook-ceph patch cephcluster rook-ceph --type=merge \
  -p '{"spec":{"network":{"connections":{"requireMsgr2":true}}}}'
```

After applying, Rook will reconfigure the monitors.

## Updating the ceph.conf

If you manage bare metal Ceph, update `ceph.conf` to ensure monitors bind to the v2 address:

```text
[mon]
ms_bind_msgr2 = true
```

Restart monitors after the config change:

```bash
systemctl restart ceph-mon.target
```

## Verifying the Fix

After enabling msgr2, check cluster health:

```bash
ceph health detail
```

Also confirm that clients can connect using the v2 protocol:

```bash
ceph --connect-timeout 5 -s
```

## Enforcing Secure Mode

Once msgr2 is enabled, you can optionally enforce the `secure` connection mode for encryption at the transport layer:

```bash
ceph config set global ms_cluster_mode secure
ceph config set global ms_service_mode secure
ceph config set global ms_client_mode secure
```

## Summary

`MON_MSGR2_NOT_ENABLED` indicates that Ceph monitors are not listening on the v2 protocol port (3300). Fix this by running `ceph mon enable-msgr2` on bare metal clusters, or by setting `requireMsgr2: true` in the Rook CephCluster spec. After enabling msgr2, optionally enforce `secure` mode for end-to-end encryption across all cluster communications.
