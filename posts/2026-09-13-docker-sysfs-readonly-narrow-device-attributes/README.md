# Why sysfs Is Read-Only in Docker and How to Expose One Control

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Sysfs, Docker, Security, Troubleshooting

Description: Diagnose container sysfs restrictions and choose a narrow bind mount or host broker for an approved device attribute.

Root inside a Docker container can still receive `Read-only file system` when writing under `/sys`. Container root is a process identity inside a configured environment; it does not remove mount restrictions, supply every capability, or override the host driver's policy.

First identify the restriction. Then expose only the operation the application needs, using a narrowly selected attribute or a host-side service that performs the operation on its behalf.

## Inspect the container's view

Inside the affected container, inspect identity and mounts using available tools:

```bash
id
cat /proc/self/mountinfo
findmnt -T /sys -o TARGET,FSTYPE,OPTIONS
```

`findmnt` may need to be included in a diagnostic image. The mountinfo file is a direct fallback. Inspect the exact attribute's mount too, because a nested mount can have different restrictions.

Typical unprivileged Linux container configurations mount sysfs read-only. Runtime configuration also separates capabilities, device access rules, and masked or read-only paths. Those are independent controls, not one root switch. [OCI Linux runtime configuration](https://github.com/opencontainers/runtime-spec/blob/main/config-linux.md)

Compare the host's read-only inspection of the same device with the container's view. If the file does not exist on the host, changing Docker permissions cannot create the driver interface.

## Separate sysfs from device nodes

Docker's `--device` option makes a specified device node available with configured device access. It does not automatically make a related sysfs attribute writable. Opening `/dev/ttyUSB0` and writing a USB power-policy attribute are different operations on different filesystem objects. [Docker container device and privilege options](https://docs.docker.com/engine/containers/run/)

Likewise, adding a capability does not change a read-only mount flag. If the error is `EROFS`, first explain the mount policy. If a write reaches the driver and fails with another error, inspect its value, namespace-sensitive checks, and device state.

With user namespace remapping, container UID zero maps to an unprivileged host identity. Host file ownership and the driver capability checks must be evaluated with that mapping in mind. [Docker user namespace remapping](https://docs.docker.com/engine/security/userns-remap/)

## Expose a single attribute for reading first

For a dedicated LED, resolve the intended host attribute before creating a bind mount:

```bash
attribute=$(readlink -e /sys/class/leds/example:green:status/brightness) || exit 1
printf '%s\n' "$attribute"
```

The device name is illustrative. Verify identity and the attribute's meaning on the Docker daemon host. Bind mount sources are evaluated on that host, which can differ from the machine running the Docker CLI. Docker Desktop's Linux daemon also runs in a VM, so its sysfs devices are the VM's visible devices. [Docker bind mount documentation](https://docs.docker.com/engine/storage/bind-mounts/)

A read-only inspection container can then receive only the file:

```bash
docker run --rm \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --mount "type=bind,src=$attribute,dst=/device/brightness,readonly" \
  debian:trixie-slim cat /device/brightness
```

This command reads state; it does not change brightness. A file bind mount avoids exposing the device's adjacent controls or the entire host sysfs tree.

## Make write access an explicit host policy

For an approved writable control, the daemon host must provide suitable ownership and permissions on the exact attribute. A dedicated host group can grant access to that file, with the policy reapplied when the device is recreated.

The application container can then use an unprivileged user and that numeric group, with a writable single-file bind mount. The following is a deployment template; supply your own approved image and actual identity values:

```bash
control_gid=12345
docker run --rm \
  --user 10001:10001 \
  --group-add "$control_gid" \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --mount "type=bind,src=$attribute,dst=/device/brightness" \
  your-device-agent:version
```

The image must implement the intended bounded control operation. The group ID above is a placeholder, not a group to copy blindly. Under rootless Docker or user namespace remapping, map the identities deliberately and validate the resulting host permissions.

A writable bind mount is not a guarantee that an arbitrary attribute is writable from a container. The host mount, security policy, and driver can still reject it. Confirm the exact runtime and device combination with a controlled test rather than escalating to `--privileged` as a generic fix.

## Plan for device lifetime

A bind mount refers to the selected file object. If the driver removes and recreates the attribute, the mount can become stale instead of automatically following the same pathname to a new object. Re-resolve the stable device identity and recreate the container's mount when the device lifecycle requires it.

Keep another host component responsible for discovery and permission restoration. Do not let the application choose an arbitrary host sysfs pathname to mount or write.

## Prefer a host broker for richer policy

If the application needs only two named actions, or the attribute requires host-level privilege checks, a host service can be the clearer design. Expose a narrow local API, authenticate the client, validate values, and let the service own device identity and lifecycle.

This also centralizes coordination when multiple containers share a control. Mount access alone does not prevent conflicting requests or enforce a business-specific range.

## Conclusion

Read-only sysfs inside Docker is a mount and runtime-policy question before it is a UID question. Inspect the exact path, distinguish device nodes from attributes, and expose one reviewed control only when the host and driver permit it. A host broker is useful when identity, privilege, or allowed-value policy needs stronger coordination.

## Official Documentation

- [Docker: running containers and device access](https://docs.docker.com/engine/containers/run/)
- [Docker: bind mounts](https://docs.docker.com/engine/storage/bind-mounts/)
- [Docker: user namespace remapping](https://docs.docker.com/engine/security/userns-remap/)
- [OCI: Linux runtime configuration](https://github.com/opencontainers/runtime-spec/blob/main/config-linux.md)
