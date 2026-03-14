# How to Set Up Kubelet Extra Mounts in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubelet, Kubernetes, Storage, Volume Mounts

Description: Learn how to configure kubelet extra mounts in Talos Linux to expose host paths and devices to containers running on your nodes.

---

Talos Linux is an immutable operating system designed specifically for running Kubernetes. Because the filesystem is read-only and there is no shell access, you might wonder how to make host directories or devices available to pods. The answer is kubelet extra mounts. This feature lets you define additional bind mounts that the kubelet makes available to containers, giving pods access to host-level resources when needed.

In this guide, we will cover how to configure kubelet extra mounts in Talos Linux, common use cases, and important considerations for production deployments.

## What Are Kubelet Extra Mounts

In a traditional Linux setup, you might mount a host directory into a container using a Docker bind mount or a Kubernetes hostPath volume. In Talos Linux, the kubelet needs to know about these paths ahead of time because the filesystem is locked down. The `extraMounts` configuration in the Talos machine config tells the kubelet to bind mount specific host paths into the kubelet's mount namespace, making them available for pods to use.

## Basic Configuration

The extra mounts configuration lives under `machine.kubelet.extraMounts` in your Talos machine configuration:

```yaml
machine:
  kubelet:
    extraMounts:
      - destination: /var/mnt/data
        type: bind
        source: /var/mnt/data
        options:
          - bind
          - rshared
          - rw
```

Each mount entry has four fields:

- `destination` - where the mount appears inside the kubelet's namespace
- `source` - the actual path on the host
- `type` - the mount type (usually `bind`)
- `options` - mount options like read-write or read-only

## Mounting External Storage

One of the most common use cases is making external storage devices available to pods. If you have an NVMe drive or SSD mounted on the host, you need an extra mount to pass it through:

```yaml
machine:
  kubelet:
    extraMounts:
      # Mount an external NVMe drive
      - destination: /var/mnt/nvme0
        type: bind
        source: /var/mnt/nvme0
        options:
          - bind
          - rshared
          - rw
      # Mount a secondary data disk
      - destination: /var/mnt/data-disk
        type: bind
        source: /var/mnt/data-disk
        options:
          - bind
          - rshared
          - rw
```

First, you need to configure the disk itself in the Talos machine config:

```yaml
machine:
  disks:
    - device: /dev/nvme1n1
      partitions:
        - mountpoint: /var/mnt/nvme0
          size: 0  # Use all available space
```

Then the extra mount makes this path visible to the kubelet and pods.

## Using Extra Mounts with hostPath Volumes

Once you have configured an extra mount, pods can access the path using a standard Kubernetes hostPath volume:

```yaml
# Pod spec using hostPath that relies on the extra mount
apiVersion: v1
kind: Pod
metadata:
  name: data-processor
spec:
  containers:
    - name: processor
      image: myapp:latest
      volumeMounts:
        - name: data-volume
          mountPath: /data
  volumes:
    - name: data-volume
      hostPath:
        path: /var/mnt/nvme0
        type: Directory
```

The key point is that the `hostPath` in the pod spec must match the `destination` in the extra mount configuration. Without the extra mount, the kubelet cannot see the host path, and the pod will fail to start.

## Mount Propagation Options

The mount options you choose affect how mounts propagate between the host and containers. Understanding these is important:

```yaml
machine:
  kubelet:
    extraMounts:
      # Shared mount - mounts propagate in both directions
      - destination: /var/mnt/shared
        type: bind
        source: /var/mnt/shared
        options:
          - bind
          - rshared
          - rw
      # Slave mount - mounts only propagate from host to container
      - destination: /var/mnt/slave
        type: bind
        source: /var/mnt/slave
        options:
          - bind
          - rslave
          - rw
      # Read-only mount
      - destination: /var/mnt/readonly
        type: bind
        source: /var/mnt/readonly
        options:
          - bind
          - rshared
          - ro
```

For CSI drivers and dynamic provisioning, `rshared` is usually the right choice because the CSI driver needs to create mounts that are visible to pods. For simple data volumes, `rslave` or even a private mount may be sufficient.

## Supporting CSI Drivers

Container Storage Interface (CSI) drivers often need specific mount points to be available. For example, if you use a CSI driver that mounts volumes under a specific path:

```yaml
machine:
  kubelet:
    extraMounts:
      # Required for many CSI drivers
      - destination: /var/lib/kubelet
        type: bind
        source: /var/lib/kubelet
        options:
          - bind
          - rshared
          - rw
      # Mount point for CSI driver sockets
      - destination: /var/lib/csi
        type: bind
        source: /var/lib/csi
        options:
          - bind
          - rshared
          - rw
```

Check your CSI driver documentation for the specific mount points it requires. Most drivers document the required host paths in their installation guides.

## Device Access

Some workloads need access to host devices. GPU workloads and storage drivers are common examples:

```yaml
machine:
  kubelet:
    extraMounts:
      # Expose GPU devices
      - destination: /dev/dri
        type: bind
        source: /dev/dri
        options:
          - bind
          - rshared
          - rw
```

For device access, you typically also need to configure the pod's security context to allow device access.

## Applying the Configuration

Apply extra mounts to your nodes:

```bash
# Apply the full configuration
talosctl apply-config --nodes 10.0.0.5 --file worker.yaml

# Or use a patch for just the extra mounts
cat > mounts-patch.yaml <<EOF
machine:
  kubelet:
    extraMounts:
      - destination: /var/mnt/data
        type: bind
        source: /var/mnt/data
        options:
          - bind
          - rshared
          - rw
EOF

talosctl patch machineconfig --nodes 10.0.0.5 --patch @mounts-patch.yaml
```

After applying, verify the mount is in place:

```bash
# Check mount points on the node
talosctl mounts --nodes 10.0.0.5 | grep mnt

# Verify kubelet restarted successfully
talosctl service kubelet --nodes 10.0.0.5
```

## Persistent Storage Pattern

A common pattern for production clusters is to configure dedicated data disks with extra mounts for applications that need persistent local storage:

```yaml
machine:
  disks:
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/mnt/app-data
          size: 0
  kubelet:
    extraMounts:
      - destination: /var/mnt/app-data
        type: bind
        source: /var/mnt/app-data
        options:
          - bind
          - rshared
          - rw
```

This gives you a dedicated disk for application data that survives node reboots and OS upgrades. Combine this with a local PV provisioner for a fully automated local storage solution.

## Troubleshooting

If a pod fails to start because it cannot access a host path, check these things:

First, verify the extra mount exists in the node's machine configuration:

```bash
talosctl get machineconfig --nodes 10.0.0.5 -o yaml | grep -A 10 extraMounts
```

Second, make sure the source path actually exists on the host. If you are mounting a disk partition, confirm the disk is configured and the partition is mounted.

Third, check that the mount options are correct. Using `ro` (read-only) when the pod needs write access will cause permission errors.

## Conclusion

Kubelet extra mounts in Talos Linux bridge the gap between the immutable host filesystem and the storage needs of your containers. They are essential for local storage, CSI drivers, and device access. The configuration is declarative and applied through the Talos API, keeping the workflow consistent with everything else in Talos. Plan your mount points carefully, use appropriate propagation settings, and always verify your mounts after applying configuration changes.
