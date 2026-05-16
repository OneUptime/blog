# How to Set Up Kubelet Extra Mounts in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubelet, Kubernetes, Storage, Volume Mounts

Description: Learn how to configure kubelet extra mounts in Talos Linux to expose host paths and devices to containers running on your nodes.

---

Talos Linux is an immutable operating system designed specifically for running Kubernetes. Because the filesystem is read-only and there is no shell access, you might wonder how to make host directories or devices available to pods. The answer is kubelet extra mounts. This feature lets you define additional bind mounts that the kubelet makes available to containers, giving pods access to host-level resources when needed.

In this guide, we will cover how to configure kubelet extra mounts in Talos Linux, common use cases, and important considerations for production deployments.

## What Are Kubelet Extra Mounts

In a traditional Linux setup, you might mount a host directory into a container using a Docker bind mount or a Kubernetes hostPath volume. In Talos Linux, the kubelet needs to know about paths that are not already exposed to it because the filesystem is locked down. The `extraMounts` configuration in the Talos machine config tells Talos to add specific mounts to the kubelet container, making them available for pods to use.

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

One common use case is making host-mounted storage available to pods. If you have a path that is already mounted on the host and is not managed as a Talos user volume, use an extra mount to pass it through:

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

For a disk that Talos should provision and mount, configure it as a Talos user volume:

```yaml
apiVersion: v1alpha1
kind: UserVolumeConfig
name: nvme0
provisioning:
  diskSelector:
    match: disk.transport == 'nvme'
  minSize: 100GB
```

Talos mounts this volume at `/var/mnt/nvme0` and automatically propagates it into the kubelet container. If you are exposing a host path that is not managed as a Talos user volume, then use an extra mount for that path.

## Using Extra Mounts with hostPath Volumes

Once the path is visible to the kubelet, pods can access it using a standard Kubernetes hostPath volume:

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

The key point is that the `hostPath` in the pod spec must match a path visible to the kubelet, such as the `destination` in an extra mount configuration or the `/var/mnt/<name>` path for a Talos user volume. Without a visible host path, the pod will fail to start.

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

For workloads that create nested mounts which need to propagate back to the host, `rshared` is usually the right choice. For simple data volumes, `rslave` or even a private mount may be sufficient.

## Supporting CSI Drivers

Container Storage Interface (CSI) drivers sometimes need specific host paths to be available. For example, if your CSI driver's documentation requires a custom host path, expose that path with an extra mount:

```yaml
machine:
  kubelet:
    extraMounts:
      # Mount point required by a CSI driver
      - destination: /var/lib/example-csi
        type: bind
        source: /var/lib/example-csi
        options:
          - bind
          - rshared
          - rw
```

Check your CSI driver documentation for the specific mount points it requires. Many drivers document the required host paths in their installation guides.

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
# Check mount status on the node
talosctl get mountstatus --nodes 10.0.0.5 | grep mnt

# Verify kubelet restarted successfully
talosctl service kubelet --nodes 10.0.0.5
```

## Persistent Storage Pattern

A common pattern for production clusters is to configure dedicated user volumes for applications that need persistent local storage:

```yaml
apiVersion: v1alpha1
kind: UserVolumeConfig
name: app-data
provisioning:
  diskSelector:
    match: "!system_disk"
  minSize: 100GB
```

This gives you a dedicated volume mounted at `/var/mnt/app-data` for application data that survives node reboots and OS upgrades. Combine this with a local PV provisioner for a fully automated local storage solution.

## Troubleshooting

If a pod fails to start because it cannot access a host path, check these things:

First, verify the extra mount exists in the node's machine configuration:

```bash
talosctl get machineconfig --nodes 10.0.0.5 -o yaml | grep -A 10 extraMounts
```

Second, make sure the source path actually exists on the host. If you are mounting a Talos user volume, confirm the volume and mount are ready with `talosctl get volumestatus` and `talosctl get mountstatus`.

Third, check that the mount options are correct. Using `ro` (read-only) when the pod needs write access will cause permission errors.

## Conclusion

Kubelet extra mounts in Talos Linux bridge the gap between the immutable host filesystem and the storage needs of your containers. They are useful for custom host paths, some CSI drivers, and device access. The configuration is declarative and applied through the Talos API, keeping the workflow consistent with everything else in Talos. Plan your mount points carefully, use appropriate propagation settings, and always verify your mounts after applying configuration changes.
