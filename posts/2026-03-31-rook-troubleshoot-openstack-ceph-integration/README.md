# How to Troubleshoot OpenStack-Ceph Integration Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, OpenStack, Troubleshooting, Debugging, Cinder, Nova

Description: Diagnose and resolve common issues when integrating Ceph with OpenStack services including Cinder volume failures, Nova boot errors, and authentication problems.

---

OpenStack-Ceph integration involves multiple moving parts: libvirt secrets, Ceph auth keys, network connectivity, and driver configuration. When something breaks, it can be difficult to know where to start. This guide covers the most common failure modes and how to resolve them.

## Common Failure Categories

1. Authentication failures (wrong keyring, bad permissions)
2. Network connectivity issues (RBD client cannot reach monitors)
3. Volume driver misconfiguration
4. libvirt secret mismatches

## Diagnosing Cinder Volume Creation Failures

When `openstack volume create` fails, start with Cinder logs:

```bash
# Check cinder-volume logs
journalctl -u openstack-cinder-volume -n 100 --no-pager | grep -E "ERROR|WARN|Traceback"

# Common error: authentication failure
# ERROR oslo_messaging._drivers.impl_rabbit ... ClientError: AuthError
# Check the keyring path and permissions
ls -la /etc/ceph/ceph.client.cinder.keyring

# Test Ceph auth directly as the cinder user
rbd --id cinder --conf /etc/ceph/ceph.conf -p volumes ls
```

## Diagnosing Nova Boot Failures

```bash
# Check nova-compute logs on the compute node where boot failed
journalctl -u nova-compute -n 200 --no-pager | grep -E "ERROR|libvirt|rbd"

# Common error: libvirt secret not found
# Look for: Secret not found: no secret with matching uuid
# Fix: re-create the libvirt secret with the correct UUID
virsh secret-list
virsh secret-get-value <uuid>  # should return the base64 key

# Test the libvirt secret value matches the Ceph key
# ceph auth get-key already returns a base64-encoded key
ceph auth get-key client.nova
virsh secret-get-value <nova-secret-uuid>
```

## Testing RBD Connectivity from Compute Nodes

```bash
# Verify monitor connectivity
ceph --id nova mon_status

# List images as the nova user
rbd --id nova -p vms ls

# Check network path to monitors
for mon in mon1 mon2 mon3; do
  nc -zv ${mon} 6789 && echo "${mon}: OK" || echo "${mon}: FAILED"
done
```

## Fixing Permission Issues

```bash
# Wrong keyring ownership - fix on affected node
chown nova:nova /etc/ceph/ceph.client.nova.keyring
chmod 640 /etc/ceph/ceph.client.nova.keyring

# Verify ceph.conf is readable
cat /etc/ceph/ceph.conf | grep mon_host
```

## Diagnosing Live Migration Failures

```bash
# Check libvirtd logs on source compute node
journalctl -u libvirtd -n 100 --no-pager | grep -i "migration\|error"

# Test libvirt connectivity between compute nodes
virsh -c qemu+tcp://compute2/system list

# Check firewall ports
firewall-cmd --list-ports | grep -E "16514|49152"

# Abort a stuck migration (requires both server and migration ID)
openstack server migration abort <instance-id> <migration-id>
```

## Diagnosing Manila/CephFS Issues

```bash
# Check MDS health
ceph mds stat
ceph fs status cephfs

# Check Manila share errors
openstack share show <share-id> -c status -c export_locations

# Verify Manila user can list subvolumes
ceph fs subvolume ls cephfs --group_name _nogroup
```

## Useful Ceph Diagnostic Commands

```bash
# Full cluster health with explanations
ceph health detail

# Check if OSD pool mapping is correct
ceph osd pool ls detail | grep -E "volumes|vms|images"

# Verify auth capabilities
ceph auth get client.cinder
ceph auth get client.nova
ceph auth get client.glance
```

## Summary

Troubleshooting OpenStack-Ceph integration issues follows a consistent pattern: check service logs for the specific error, verify Ceph auth credentials are present and correctly permissioned on the affected node, test RBD connectivity directly from the failing host, and validate libvirt secrets match the Ceph keyring values. Most failures trace back to authentication misconfiguration or network connectivity issues between compute nodes and Ceph monitors.
