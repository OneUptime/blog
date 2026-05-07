# How to Configure Unmasked Paths in Podman Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Linux, Security, Filesystem, Configuration

Description: Learn how to unmask default-hidden filesystem paths in Podman containers when your workload legitimately needs access to system information.

---

> Unmasking paths grants the container access to system information that Podman hides by default - do so only when the workload genuinely requires it.

Podman masks several `/proc` and `/sys` paths by default to prevent containers from reading sensitive host information. However, certain workloads such as monitoring agents, hardware diagnostic tools, and system utilities need access to these paths to function correctly. Podman provides the `--security-opt unmask=` flag to selectively expose masked paths.

Unmasking removes Podman's default mask for the path, but normal kernel permissions, capabilities, and host kernel support still apply.

This guide explains when and how to unmask paths in Podman containers while maintaining reasonable security.

---

## Understanding Masked vs Unmasked Paths

By default, Podman overlays certain paths with `/dev/null` or an empty tmpfs so containers cannot read their contents.

```bash
# Show that certain paths are masked by default

podman run --rm docker.io/library/alpine:latest \
  sh -c "
    echo '--- Default masked paths ---'
    cat /proc/kcore 2>&1 | head -1 || echo '/proc/kcore: masked'
    cat /proc/keys 2>&1 | head -1 || echo '/proc/keys: masked'
    cat /proc/timer_list 2>&1 | head -1 || echo '/proc/timer_list: masked'
    ls /sys/firmware 2>&1 || echo '/sys/firmware: masked'
  "

# View the full list of default masked paths
podman run -d --name mask-list docker.io/library/alpine:latest sleep 60
podman inspect mask-list --format '{{json .HostConfig.MaskedPaths}}' | python3 -m json.tool
podman stop mask-list && podman rm mask-list
```

## Unmasking a Single Path

Use `--security-opt unmask=` to expose a specific masked path to the container.

```bash
# Unmask /proc/timer_list so the container can read timing data
# This is needed by some profiling and monitoring tools
podman run --rm \
  --security-opt unmask=/proc/timer_list \
  docker.io/library/alpine:latest \
  sh -c "head -20 /proc/timer_list 2>/dev/null || echo 'timer_list unavailable'"

# Verify that other paths remain masked
podman run --rm \
  --security-opt unmask=/proc/timer_list \
  docker.io/library/alpine:latest \
  sh -c "cat /proc/kcore 2>&1 | head -1 || echo '/proc/kcore still masked'"
```

## Unmasking Multiple Paths

Specify several paths separated by colons to unmask multiple paths.

```bash
# Unmask multiple paths for a system monitoring container
podman run --rm \
  --security-opt unmask=/proc/timer_list:/proc/sched_debug \
  docker.io/library/alpine:latest \
  sh -c "
    echo '--- timer_list (first 5 lines) ---'
    head -5 /proc/timer_list 2>/dev/null || echo 'unavailable'
    echo '--- sched_debug (first 5 lines) ---'
    head -5 /proc/sched_debug 2>/dev/null || echo 'unavailable'
  "

```

## Unmasking All Paths

Use `unmask=ALL` to remove all default path masking and default read-only path restrictions. This is the least restrictive option.

```bash
# Unmask all default masked paths at once
podman run --rm \
  --security-opt unmask=ALL \
  docker.io/library/alpine:latest \
  sh -c "
    echo '--- All paths unmasked ---'
    head -3 /proc/timer_list 2>/dev/null || echo 'timer_list: N/A'
    head -3 /proc/sched_debug 2>/dev/null || echo 'sched_debug: N/A'
    ls /sys/firmware 2>/dev/null || echo 'firmware: N/A'
  "
```

## Practical Example: Monitoring Agent Container

Monitoring agents like Prometheus node exporter often need access to host namespaces and host filesystem data. Unmasking only applies to Podman's default masked paths; common files such as `/proc/stat`, `/proc/meminfo`, and `/proc/cpuinfo` are not masked by default.

```bash
# Run a monitoring container with the paths it needs unmasked
podman run -d \
  --name monitoring-agent \
  --security-opt unmask=/proc/timer_list:/proc/sched_debug \
  docker.io/library/alpine:latest \
  sh -c "
    # Simulate a monitoring loop that reads system metrics
    while true; do
      cat /proc/stat > /dev/null 2>&1
      cat /proc/meminfo > /dev/null 2>&1
      head -1 /proc/sched_debug > /dev/null 2>&1 || true
      sleep 10
    done
  "

# Verify the agent can read the unmasked paths
podman exec monitoring-agent sh -c "
  echo 'CPU stats:' && head -1 /proc/stat
  echo 'Memory:' && head -1 /proc/meminfo
  head -1 /proc/sched_debug > /dev/null 2>&1 && echo 'sched_debug: accessible' || echo 'sched_debug: unavailable'
"

# Clean up
podman stop monitoring-agent && podman rm monitoring-agent
```

## Combining Unmask with Other Security Controls

When unmasking paths, compensate by tightening other security settings.

```bash
# Unmask needed paths but harden everything else
podman run --rm \
  --security-opt unmask=/proc/timer_list \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid \
  docker.io/library/alpine:latest \
  sh -c "
    echo 'Readable /proc/stat:' && head -1 /proc/stat
    echo 'No new privs:' && grep NoNewPrivs /proc/self/status
    echo 'Read-only FS:' && touch /test 2>&1 || echo 'filesystem is read-only'
  "
```

## Verifying Unmasked Paths

Always confirm that unmasking worked as expected.

```bash
# Start a container with specific paths unmasked
podman run -d --name unmask-verify \
  --security-opt unmask=/proc/timer_list:/proc/sched_debug \
  docker.io/library/alpine:latest sleep 3600

# Inspect the container to see the maskedPaths list
# Unmasked paths should be absent from this list
podman inspect unmask-verify --format '{{json .HostConfig.MaskedPaths}}' | python3 -m json.tool

# Test access from inside the container
podman exec unmask-verify sh -c "
  cat /proc/timer_list > /dev/null 2>&1 && echo 'timer_list: accessible' || echo 'timer_list: blocked'
  cat /proc/sched_debug > /dev/null 2>&1 && echo 'sched_debug: accessible' || echo 'sched_debug: blocked'
  cat /proc/kcore > /dev/null 2>&1 && echo 'kcore: accessible' || echo 'kcore: still masked'
"

# Clean up
podman stop unmask-verify && podman rm unmask-verify
```

## Summary

Unmasking paths in Podman with `--security-opt unmask=` gives containers access to system information that is hidden by default. Use this for monitoring agents, profiling tools, and hardware diagnostics that genuinely need this data. Unmask only the specific paths your workload requires rather than using `unmask=ALL`. Always compensate by applying other security controls such as dropped capabilities, no-new-privileges, and read-only filesystems to maintain a strong security posture.
