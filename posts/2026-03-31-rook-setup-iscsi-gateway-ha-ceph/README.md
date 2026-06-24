# How to Set Up iSCSI Gateway HA in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, iSCSI, High Availability, Gateway

Description: Learn how to set up high-availability iSCSI gateways for Ceph using multiple gateway nodes with shared configuration and automatic failover.

---

## iSCSI Gateway HA Architecture

A highly available Ceph iSCSI setup uses two or more gateway nodes that share the same target configuration. Each gateway presents the same IQNs and LUNs to initiators. When one gateway fails, initiators connected through multipath automatically switch to the surviving gateway.

The `ceph-iscsi` configuration is stored in the Ceph RADOS gateway config pool, so all gateways stay synchronized automatically.

## Installing ceph-iscsi on All Gateway Nodes

Install the required packages on each gateway node:

```bash
dnf install -y ceph-iscsi targetcli
```

Configure the gateway by specifying all gateway addresses in the config file on each node:

```bash
cat > /etc/ceph/iscsi-gateway.cfg << 'EOF'
[config]
cluster_name = ceph
gateway_keyring = ceph.client.admin.keyring
api_secure = false
api_user = admin
api_password = admin
api_port = 5000
trusted_ip_list = 10.0.1.10,10.0.1.11
EOF
```

## Starting Gateway Services on Both Nodes

Enable and start the services on both gateway nodes:

```bash
systemctl enable --now rbd-target-api
systemctl enable --now rbd-target-gw
```

Verify the API is responding on each node:

```bash
curl http://10.0.1.10:5000/api/_ping
curl http://10.0.1.11:5000/api/_ping
```

## Configuring Targets Across Both Gateways

Use `gwcli` from either node to configure the target with both gateways:

```bash
gwcli
```

```text
/> cd /iscsi-targets
/iscsi-targets> create iqn.2024-01.com.example:ha-storage
/iscsi-targets/iqn.../> cd gateways
/gateways> create gw1.example.com 10.0.1.10
/gateways> create gw2.example.com 10.0.1.11
```

Both gateways automatically sync the target configuration from the shared RADOS pool.

## Testing Gateway Failover

From the initiator, confirm both paths are active:

```bash
iscsiadm -m session
multipath -ll | grep status
```

Simulate gateway 1 failure:

```bash
# On gateway1
systemctl stop rbd-target-gw rbd-target-api
```

Verify automatic failover on the initiator:

```bash
multipath -ll
# Path through gw1 should show as 'failed', gw2 as 'active'
```

Check I/O is still working:

```bash
dd if=/dev/zero of=/dev/mapper/mpatha bs=1M count=100 oflag=direct
```

Restore gateway 1:

```bash
systemctl start rbd-target-gw rbd-target-api
```

## Monitoring Gateway Health

Check the status of both gateways from the Ceph dashboard or CLI:

```bash
gwcli ls
```

Use the REST API to query gateway health:

```bash
curl http://10.0.1.10:5000/api/gateways/iqn.2024-01.com.example:ha-storage | python3 -m json.tool
```

## Configuring Keepalived (Optional)

For a virtual IP that follows the active gateway, use keepalived:

```bash
dnf install -y keepalived
```

```bash
cat > /etc/keepalived/keepalived.conf << 'EOF'
vrrp_instance VI_1 {
    state MASTER
    interface eth1
    virtual_router_id 51
    priority 101
    advert_int 1
    authentication {
        auth_type PASS
        auth_pass secret
    }
    virtual_ipaddress {
        10.0.1.100/24
    }
}
EOF
systemctl enable --now keepalived
```

## Summary

Setting up iSCSI gateway HA in Ceph involves deploying two gateway nodes with shared configuration stored in RADOS, registering both gateways in each target configuration, and pairing with multipath on the initiator side. Failover is transparent to applications because the multipath layer automatically switches to the surviving gateway path when one fails.
