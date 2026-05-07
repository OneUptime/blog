# How to Configure Masked Paths in Podman Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Linux, Security, Filesystem, Isolation

Description: Learn how to configure masked paths in Podman containers to hide sensitive host system information from containerized processes.

---

> Masked paths prevent containers from reading sensitive kernel and system information that could aid an attacker in escaping the container.

Podman masks certain filesystem paths inside containers by default, mounting them over with empty or null devices so the container process cannot read their contents. Paths like `/proc/kcore`, `/proc/keys`, and `/sys/firmware` contain kernel internals and host secrets that containers should never access. You can customize which paths are masked to tighten or relax these restrictions.

This guide explains how path masking works in Podman and how to configure it for your containers.

---

## Understanding Default Masked Paths

Podman masks several sensitive paths by default to prevent information leakage from the host.

```bash
# View the default masked paths for a Podman container

# These paths are mounted over with /dev/null or tmpfs
podman run --rm docker.io/library/alpine:latest \
  sh -c "cat /proc/kcore 2>&1 || echo '/proc/kcore is masked'"

# Try to read other commonly masked paths
podman run --rm docker.io/library/alpine:latest \
  sh -c "
    echo '--- /proc/keys ---'
    cat /proc/keys 2>&1 || echo 'masked'
    echo '--- /proc/timer_list ---'
    cat /proc/timer_list 2>&1 || echo 'masked'
    echo '--- /proc/sched_debug ---'
    cat /proc/sched_debug 2>&1 || echo 'masked'
  "

# Inspect the container to see the full list of masked paths
podman run -d --name mask-check docker.io/library/alpine:latest sleep 60
podman inspect mask-check --format '{{json .HostConfig.MaskedPaths}}' | python3 -m json.tool
podman stop mask-check && podman rm mask-check
```

## Why Paths Are Masked

Masked paths prevent the container from accessing host kernel internals that could be exploited:

- `/proc/kcore` - raw kernel memory, could leak host secrets
- `/proc/keys` - cryptographic keys held by the kernel
- `/proc/timer_list` - timing information useful for side-channel attacks
- `/proc/sched_debug` - scheduler details exposing host process information
- `/sys/firmware` - firmware and BIOS data from the host

```bash
# Demonstrate that masked paths return empty or error responses
podman run --rm docker.io/library/alpine:latest \
  sh -c "
    echo 'Checking masked paths:'
    for path in /proc/kcore /proc/keys /proc/timer_list /proc/sched_debug; do
      if [ -e \$path ]; then
        size=\$(wc -c < \$path 2>/dev/null || echo 'unreadable')
        echo \"\$path: \$size bytes\"
      else
        echo \"\$path: does not exist\"
      fi
    done
  "
```

## Adding Custom Masked Paths

Use the `--security-opt mask=` flag to add additional paths to the mask list.

```bash
# Mask a custom path in addition to the defaults
# This hides /etc/hostname from the container
podman run --rm \
  --security-opt mask=/etc/hostname \
  docker.io/library/alpine:latest \
  sh -c "cat /etc/hostname 2>&1 || echo '/etc/hostname is masked'"

# Mask multiple paths by separating them with colons
podman run --rm \
  --security-opt mask=/etc/hostname:/etc/resolv.conf \
  docker.io/library/alpine:latest \
  sh -c "
    echo '--- hostname ---'
    cat /etc/hostname 2>&1 || echo 'masked'
    echo '--- resolv.conf ---'
    cat /etc/resolv.conf 2>&1 || echo 'masked'
  "
```

## Masking Paths via Quadlet

Set masked paths for containers managed by Podman Quadlet units with the `Mask=` key.

```bash
# Create a sample Quadlet container unit with custom masked paths
mkdir -p ~/.config/containers/systemd
cat > ~/.config/containers/systemd/secure-db.container << 'EOF'
[Container]
Image=docker.io/library/alpine:latest
Exec=sleep 3600
Mask=/proc/kcore:/proc/keys:/proc/timer_list:/proc/sched_debug:/sys/firmware:/proc/scsi:/proc/acpi:/sys/devices/virtual/powercap
EOF

systemctl --user daemon-reload
systemctl --user start secure-db.service
```

## Practical Example: Securing a Database Container

Database containers should not have access to host kernel details.

```bash
# Run a database container with additional masked paths
# Mask paths that could leak host hardware or kernel information
podman run -d \
  --name secure-db \
  --security-opt mask=/proc/kcore:/proc/keys:/proc/timer_list:/sys/firmware:/proc/acpi \
  docker.io/library/alpine:latest sleep 3600

# Verify masked paths from inside the container
podman exec secure-db sh -c "
  for path in /proc/kcore /proc/keys /proc/timer_list /sys/firmware /proc/acpi; do
    echo -n \"\$path: \"
    cat \$path 2>&1 | head -1 || echo 'inaccessible'
  done
"

# Check the container configuration
podman inspect secure-db --format '{{json .HostConfig.MaskedPaths}}' | python3 -m json.tool

# Clean up
podman stop secure-db && podman rm secure-db
```

## Combining Masked Paths with Other Security Options

Masked paths work alongside other Podman security features for defense in depth.

```bash
# Run a container with multiple security hardening options
podman run --rm \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --security-opt mask=/proc/kcore:/proc/keys:/proc/acpi \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid \
  docker.io/library/alpine:latest \
  sh -c "
    echo 'Security settings active:'
    cat /proc/self/status | grep NoNewPrivs
    echo 'Masked /proc/kcore:' && cat /proc/kcore 2>&1 | head -1
    echo 'Filesystem is read-only:' && touch /test 2>&1 || echo 'confirmed'
  "
```

## Summary

Masked paths in Podman prevent containers from reading sensitive kernel and system information. Podman applies sensible defaults, but you can add custom masked paths with `--security-opt mask=` or, for Quadlet-managed containers, with `Mask=`. Mask paths that could expose host hardware details, kernel memory, cryptographic keys, or scheduling information. Combined with dropped capabilities, no-new-privileges, and read-only filesystems, masked paths form part of a comprehensive container security strategy.
