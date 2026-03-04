# How to Run Rootless Pods with SELinux Confinement on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Podman, SELinux, Rootless, Containers, Security, Linux

Description: Learn how to run rootless Podman pods with SELinux confinement on RHEL for enhanced container security.

---

SELinux (Security-Enhanced Linux) on RHEL provides mandatory access control that confines container processes. When combined with rootless Podman pods, SELinux adds an additional layer of isolation beyond user namespaces. This guide covers running rootless pods with proper SELinux confinement.

## Prerequisites

- A RHEL system with SELinux in enforcing mode
- A non-root user with subuid and subgid mappings
- Podman installed

Verify SELinux is enforcing:

```bash
getenforce
```

Expected output: `Enforcing`

## Understanding SELinux and Containers

Podman assigns the `container_t` SELinux type to container processes by default. This type restricts what files and resources the container can access. Rootless containers get the same SELinux confinement as root containers.

Check the SELinux context of a running container:

```bash
podman run --rm registry.access.redhat.com/ubi9/ubi:latest cat /proc/self/attr/current
```

Expected output:

```bash
system_u:system_r:container_t:s0:c123,c456
```

The `container_t` type and the MCS (Multi-Category Security) labels `c123,c456` ensure process isolation.

## Creating a Rootless Pod

Create a pod with multiple containers:

```bash
podman pod create --name mypod -p 8080:80
```

Add containers to the pod:

```bash
podman run -d --pod mypod --name web registry.access.redhat.com/ubi9/ubi:latest sleep infinity
podman run -d --pod mypod --name app registry.access.redhat.com/ubi9/ubi:latest sleep infinity
```

All containers in the pod share the same network namespace and SELinux MCS labels.

## Verifying SELinux Labels on Pod Containers

Check the SELinux labels for each container:

```bash
podman inspect --format '{{.ProcessLabel}}' web
podman inspect --format '{{.ProcessLabel}}' app
```

Both containers should have the same MCS categories since they share a pod.

## Mounting Volumes with SELinux Labels

When mounting host directories into rootless containers, use the `:z` or `:Z` suffix to relabel the volume:

```bash
mkdir -p ~/poddata

# Shared label (lowercase z) - multiple containers can access
podman run --rm -v ~/poddata:/data:z registry.access.redhat.com/ubi9/ubi:latest ls /data

# Private label (uppercase Z) - only this container can access
podman run --rm -v ~/poddata:/data:Z registry.access.redhat.com/ubi9/ubi:latest ls /data
```

The `:z` option adds the `container_file_t` label with a shared MCS category. The `:Z` option adds a private MCS category.

Check the relabeled directory:

```bash
ls -laZ ~/poddata
```

## Using Custom SELinux Labels

Override the default SELinux label for a container:

```bash
podman run --rm --security-opt label=type:svirt_sandbox_file_t registry.access.redhat.com/ubi9/ubi:latest cat /proc/self/attr/current
```

Disable SELinux confinement for debugging (not recommended for production):

```bash
podman run --rm --security-opt label=disable registry.access.redhat.com/ubi9/ubi:latest cat /proc/self/attr/current
```

## Writing Custom SELinux Policies for Containers

If your container needs access that `container_t` does not allow, create a custom policy module. First, identify the denials:

```bash
sudo ausearch -m avc -ts recent | grep container_t
```

Generate a policy module from the denials:

```bash
sudo ausearch -m avc -ts recent | audit2allow -M mycontainer
```

Install the module:

```bash
sudo semodule -i mycontainer.pp
```

## Troubleshooting SELinux Denials

Check for SELinux denials related to containers:

```bash
sudo ausearch -m avc -ts recent --comm podman
```

Use `sealert` for human-readable analysis:

```bash
sudo sealert -a /var/log/audit/audit.log
```

If SELinux blocks a legitimate operation, check the suggested fixes from `sealert` before disabling SELinux. In most cases, using the `:z` or `:Z` volume options resolves file access denials.

## Setting SELinux Booleans for Containers

Some container operations require specific SELinux booleans:

```bash
# Allow containers to use the host network
sudo setsebool -P container_connect_any 1

# Allow containers to manage all files
sudo setsebool -P container_manage_cgroup 1
```

List all container-related booleans:

```bash
getsebool -a | grep container
```

## Conclusion

Running rootless pods with SELinux confinement on RHEL provides defense in depth. The combination of user namespaces and SELinux mandatory access control limits the damage a compromised container can do. Always keep SELinux in enforcing mode and use volume relabeling instead of disabling confinement.
