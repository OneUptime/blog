# How to Enable CRIU for Podman Container Checkpointing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Podman, CRIU, Container, Checkpointing, Linux

Description: A step-by-step guide to installing and enabling CRIU on Linux so you can use Podman's container checkpoint and restore features for live migration, fast startup, and disaster recovery.

---

> CRIU is the engine behind Podman's ability to freeze a running container in place and bring it back to life later. Before you can checkpoint anything, CRIU needs to be installed and properly configured on your system.

Container checkpointing lets you snapshot the runtime state of a container, including its process memory, open file descriptors, and supported network state. Podman delegates the heavy lifting to CRIU (Checkpoint/Restore In Userspace), a Linux tool that can freeze and restore process trees. This post walks through installing CRIU, verifying it works, and configuring your system so Podman can use it.

---

## What Is CRIU and Why Does Podman Need It

CRIU is a Linux utility that can freeze a running application, save its state to disk, and later restore it from that saved state. It operates at the kernel level, using features like ptrace, parasite code injection, and the `/proc` filesystem to capture everything a process needs to resume execution.

Podman does not implement checkpoint/restore logic itself. When you run `podman container checkpoint`, Podman calls CRIU under the hood. Without CRIU installed, the checkpoint command will fail immediately.

CRIU supports capturing:

- Process memory pages
- CPU register state
- Open file descriptors and pipes
- Network sockets, and established TCP connections when requested with TCP support
- Timers and signals
- Namespaces (PID, network, mount, IPC, UTS)

This makes it possible to freeze a container mid-execution and resume it on the same host or a compatible different host.

## Checking Your Kernel Support

CRIU requires specific kernel features to function. Most modern Linux distributions ship kernels that support CRIU, but it is worth verifying before you begin.

Check your kernel version:

```bash
uname -r
```

You need Linux kernel 3.11 or later, though 5.x or newer is recommended for full feature support. CRIU also requires certain kernel configuration options. You can check for the critical ones:

```bash
grep -E "CONFIG_CHECKPOINT_RESTORE|CONFIG_NAMESPACES|CONFIG_PID_NS|CONFIG_NET_NS" /boot/config-$(uname -r)
```

You should see output like:

```text
CONFIG_CHECKPOINT_RESTORE=y
CONFIG_NAMESPACES=y
CONFIG_PID_NS=y
CONFIG_NET_NS=y
```

If `CONFIG_CHECKPOINT_RESTORE` is not set to `y`, your kernel was not compiled with checkpoint/restore support and you will need a different kernel.

## Installing CRIU on Fedora and RHEL

Fedora and RHEL-based distributions have CRIU in their default repositories. Install it with:

```bash
sudo dnf install criu
```

For older RHEL or CentOS systems using yum:

```bash
sudo yum install criu
```

Verify the installation:

```bash
criu --version
```

You should see output like `Version: 3.17` or newer. For Podman checkpoint/restore to work, CRIU 3.11 or later is required. CRIU 3.12 or later is recommended for checkpoint image support, and 3.13 or later for full SELinux support.

## Installing CRIU on Ubuntu and Debian

On Ubuntu 20.04 and later, CRIU is available in the default repositories:

```bash
sudo apt update
sudo apt install criu
```

For older Ubuntu or Debian releases where the packaged version is too old, you can build from source:

```bash
sudo apt install build-essential pkg-config libprotobuf-dev libprotobuf-c-dev \
  protobuf-c-compiler protobuf-compiler python3-protobuf libbsd-dev \
  uuid-dev iproute2 libcap-dev libnl-3-dev libnet-dev libaio-dev \
  libgnutls28-dev

git clone https://github.com/checkpoint-restore/criu.git
cd criu
make
sudo make install
```

After installation, confirm it works:

```bash
criu --version
```

## Running the CRIU Self-Check

CRIU includes a built-in check command that verifies your kernel supports all the features it needs:

```bash
sudo criu check
```

If everything is configured correctly, you will see:

```text
Looks good.
```

If there are problems, CRIU will report which kernel features are missing. Common issues include:

```text
Error (criu/cr-check.c:1234): Dirty tracking is not supported
Warn  (criu/cr-check.c:1235): Soft dirty not available, will use slow memory tracking
```

Warnings about soft dirty tracking are usually not fatal. They mean memory tracking will be slower but still functional. Errors about missing namespaces or checkpoint/restore support require kernel changes.

For a more detailed check:

```bash
sudo criu check --all
```

This runs the basic, extra, and experimental kernel feature checks.

## Configuring Podman to Use CRIU

Podman and the OCI runtime expect CRIU to be available on the host. If you installed it via a package manager, no additional configuration is usually needed. You can verify the binary is present:

```bash
which criu
```

This should return something like `/usr/sbin/criu` or `/usr/local/sbin/criu`.

If you installed CRIU to a non-standard location, make sure the binary is available to root since checkpoint operations require root privileges:

```bash
sudo which criu
```

Podman also needs to run with sufficient privileges. Container checkpointing requires root access because CRIU needs to read `/proc` entries and manipulate kernel state. Rootless Podman does not support checkpoint/restore in most configurations.

## Verifying the Full Stack

Run a quick end-to-end test to confirm everything works together. Start a simple container:

```bash
sudo podman run -d --name criu-test docker.io/library/alpine sleep 3600
```

Attempt a checkpoint:

```bash
sudo podman container checkpoint criu-test
```

If this succeeds without errors, your setup is correct. Restore it to confirm the full cycle:

```bash
sudo podman container restore criu-test
```

Verify the container is running again:

```bash
sudo podman ps
```

Clean up:

```bash
sudo podman rm -f criu-test
```

## Setting Up SELinux Policies

On systems with SELinux enabled (Fedora, RHEL, CentOS), you may encounter permission denials during checkpoint operations. Check for SELinux denials:

```bash
sudo ausearch -m avc -ts recent | grep criu
```

If you see denials, you can create a custom policy module:

```bash
sudo ausearch -m avc -ts recent | audit2allow -M criu-podman
sudo semodule -i criu-podman.pp
```

Alternatively, you can set SELinux to permissive mode temporarily for testing:

```bash
sudo setenforce 0
```

Remember to set it back to enforcing after testing and install the proper policy module for production use.

## Common Installation Issues

**CRIU version too old**: Podman requires CRIU 3.11+. Check with `criu --version` and upgrade if needed.

**Permission denied errors**: Checkpoint/restore requires root. Use `sudo podman` instead of rootless Podman.

**Missing kernel modules**: Some distributions ship modular kernels. Load required modules:

```bash
sudo modprobe tcp_diag
sudo modprobe udp_diag
sudo modprobe inet_diag
```

**Container runtime mismatch**: Ensure your container runtime (usually runc or crun) supports CRIU integration. Check the configured OCI runtime with:

```bash
sudo podman info --format '{{.Host.OCIRuntime.Name}}'
```

For more detail, inspect the full runtime block:

```bash
sudo podman info --format '{{.Host.OCIRuntime.Version}}'
```

crun builds commonly include CRIU support and crun is the default runtime in newer Podman versions on many distributions.

## Conclusion

Enabling CRIU for Podman requires installing the CRIU package, verifying kernel support, and running a quick self-check. Once the `sudo criu check` command reports success and you can checkpoint and restore a test container, your system is ready for live migration, fast container restarts, and state-preserving updates. The next step is learning how to checkpoint running containers, which is covered in the follow-up posts in this series.
