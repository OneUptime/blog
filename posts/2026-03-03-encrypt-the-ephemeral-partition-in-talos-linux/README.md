# How to Encrypt the EPHEMERAL Partition in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, EPHEMERAL Partition, Disk Encryption, Kubernetes, Security

Description: Secure your Kubernetes runtime data by encrypting the EPHEMERAL partition in Talos Linux to protect container images, pod data, and etcd.

---

The EPHEMERAL partition in Talos Linux is where all the action happens. Container images, running pod data, etcd databases, kubelet state, and container logs all live here. While the STATE partition gets a lot of attention for holding cluster certificates, the EPHEMERAL partition often contains equally sensitive data - application secrets mounted into pods, database files, and container images with proprietary code. Encrypting the EPHEMERAL partition ensures this runtime data is protected at rest. This guide walks through the configuration, performance considerations, and best practices.

## What Lives on EPHEMERAL

The EPHEMERAL partition is mounted at `/var` and serves as the working directory for the entire Kubernetes stack:

- **containerd storage** - all container images and their layers
- **Pod writable layers** - container filesystem modifications
- **kubelet directory** - pod manifests, mounted secrets, configmaps
- **etcd data directory** - the etcd database (on control plane nodes)
- **Container logs** - stdout/stderr from all containers
- **emptyDir volumes** - scratch space requested by pods
- **CNI state** - network plugin state and configuration

Any of these could contain sensitive information that warrants encryption.

## Basic EPHEMERAL Encryption

The simplest configuration:

```yaml
machine:
  systemDiskEncryption:
    ephemeral:
      provider: luks2
      keys:
        - nodeID: {}
          slot: 0
```

This encrypts EPHEMERAL using the node's identity as the key source. It is simple, automatic, and requires no external infrastructure.

## EPHEMERAL Encryption with Recovery Key

Always add a recovery key for operational resilience:

```yaml
machine:
  systemDiskEncryption:
    ephemeral:
      provider: luks2
      keys:
        - nodeID: {}
          slot: 0
        - static:
            passphrase: "ephemeral-recovery-key"
          slot: 1
```

## EPHEMERAL-Only Encryption

In some cases, you might want to encrypt EPHEMERAL but not STATE. This is less common but could make sense if:

- STATE is protected through other means (separate encrypted storage, TPM)
- You are primarily concerned about workload data exposure
- You want to minimize the complexity of your encryption setup

```yaml
machine:
  systemDiskEncryption:
    # No 'state' section - STATE stays unencrypted
    ephemeral:
      provider: luks2
      keys:
        - nodeID: {}
          slot: 0
```

Generally, encrypting both is recommended. If you are going to encrypt EPHEMERAL, there is little reason not to encrypt STATE as well.

## Performance Impact on EPHEMERAL

Unlike the STATE partition which is mostly read once at boot, EPHEMERAL is constantly under I/O pressure. Container image pulls, pod startup, log writing, and application I/O all hit this partition. This makes encryption performance a real consideration.

**With AES-NI (hardware acceleration):**
- Sequential throughput: less than 5% overhead
- Random IOPS: less than 3% overhead
- Container startup time: negligible difference

**Without AES-NI:**
- Sequential throughput: 15-30% overhead
- Random IOPS: 10-20% overhead
- Container startup time: noticeably slower

Check if your nodes support AES-NI:

```bash
talosctl get cpuinfo --nodes 192.168.1.10 -o yaml
# Look for "aes" in the flags
```

If your nodes have AES-NI (most x86_64 processors from the last 10+ years do), the performance impact is minimal and encryption is worth enabling.

## EPHEMERAL on a Dedicated Disk with Encryption

For the best combination of performance and security, put EPHEMERAL on a dedicated fast disk with encryption:

```yaml
machine:
  volumes:
    - name: EPHEMERAL
      provisioning:
        diskSelector:
          match: 'disk.transport == "nvme" && !disk.systemDisk'
        grow: true
  systemDiskEncryption:
    ephemeral:
      provider: luks2
      keys:
        - nodeID: {}
          slot: 0
```

This gives you:
- Isolated I/O (no contention with system partitions)
- Fast NVMe performance
- Full encryption protection

## EPHEMERAL Encryption on Control Plane Nodes

On control plane nodes, EPHEMERAL contains the etcd database. Etcd stores all Kubernetes cluster state, including secrets. Encrypting EPHEMERAL protects etcd data at rest:

```yaml
machine:
  type: controlplane
  systemDiskEncryption:
    ephemeral:
      provider: luks2
      keys:
        - tpm: {}
          slot: 0
        - static:
            passphrase: "cp-ephemeral-recovery"
          slot: 1
```

Note that Kubernetes also supports encryption of secrets within etcd (at the application level). Combining both etcd-level encryption and EPHEMERAL partition encryption provides defense in depth:

```yaml
# Kubernetes encryption config (separate from Talos disk encryption)
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
    - secrets
    providers:
    - aescbc:
        keys:
        - name: key1
          secret: <base64-encoded-key>
    - identity: {}
```

## Sizing Considerations with Encryption

LUKS2 encryption adds a small overhead to the partition - the LUKS2 header takes about 16MB. For the EPHEMERAL partition, which is typically tens or hundreds of gigabytes, this is negligible.

However, be aware that the reported filesystem size will be slightly smaller than the partition size due to the LUKS2 header:

```bash
# The actual usable space is partition size minus LUKS2 header
talosctl get volumestatus EPHEMERAL --nodes 192.168.1.10 -o yaml
```

## Monitoring Encrypted EPHEMERAL

Monitor the EPHEMERAL partition for both capacity and health:

```bash
# Check volume status
talosctl get volumestatus EPHEMERAL --nodes 192.168.1.10

# Check filesystem usage through node metrics
kubectl top nodes
```

Set up alerts for capacity:

```yaml
# Prometheus alert for EPHEMERAL usage
groups:
- name: talos-ephemeral
  rules:
  - alert: EphemeralPartitionFull
    expr: |
      (1 - node_filesystem_avail_bytes{mountpoint="/var"}
      / node_filesystem_size_bytes{mountpoint="/var"}) > 0.85
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "EPHEMERAL partition on {{ $labels.instance }} is over 85% full"
```

## What Happens When the Node Resets

When you reset a Talos node, the EPHEMERAL partition is wiped. With encryption, the data is doubly protected:

1. The partition is wiped (data destroyed)
2. Even if remnants remain on disk, they are encrypted and unreadable without the key

```bash
# Reset wipes EPHEMERAL - encrypted data is gone permanently
talosctl reset --nodes 192.168.1.10 --system-labels-to-wipe EPHEMERAL
```

This is actually a security benefit. When decommissioning hardware, resetting the node and then disposing of the disk ensures data cannot be recovered.

## EPHEMERAL Encryption with Different Key Types

Choose the key type that matches your security requirements:

**Node ID - simplest, automatic:**
```yaml
machine:
  systemDiskEncryption:
    ephemeral:
      provider: luks2
      keys:
        - nodeID: {}
          slot: 0
```

**TPM - hardware-bound, strongest local protection:**
```yaml
machine:
  systemDiskEncryption:
    ephemeral:
      provider: luks2
      keys:
        - tpm: {}
          slot: 0
```

**KMS - centralized management, audit trail:**
```yaml
machine:
  systemDiskEncryption:
    ephemeral:
      provider: luks2
      keys:
        - kms:
            endpoint: "https://kms.example.com/v1/keys/ephemeral"
          slot: 0
```

**Combination - maximum resilience:**
```yaml
machine:
  systemDiskEncryption:
    ephemeral:
      provider: luks2
      keys:
        - tpm: {}
          slot: 0
        - kms:
            endpoint: "https://kms.example.com/v1/keys/ephemeral"
          slot: 1
        - static:
            passphrase: "emergency-recovery"
          slot: 2
```

## Troubleshooting

**EPHEMERAL not mounting after enabling encryption:**
- Check if the disk has enough space for the LUKS2 header plus the filesystem
- Verify the key source is available (TPM present, KMS reachable)
- Check logs: `talosctl logs machined --nodes <ip> | grep -i "ephemeral\|encrypt"`

**Slow container startup:**
- Verify AES-NI is available on the CPU
- Check if the EPHEMERAL disk is the bottleneck (consider NVMe)
- Monitor I/O with node metrics

**Volume stuck in Waiting state:**
- The encryption key source may not be available yet during boot
- For KMS, verify network connectivity during early boot

## Summary

Encrypting the EPHEMERAL partition in Talos Linux protects all Kubernetes runtime data at rest, including container images, pod data, logs, and etcd databases. The performance impact is minimal on modern hardware with AES-NI support. Choose a key management approach that fits your security model, always include recovery keys, and monitor the partition for capacity issues. Combined with STATE partition encryption, you get complete data-at-rest protection for your Talos Linux nodes.
