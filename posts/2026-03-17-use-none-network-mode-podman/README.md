# How to Use None Network Mode with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, Isolation, Security

Description: Learn how to use the none network mode in Podman to run containers with no network access for maximum isolation.

---

> The none network mode completely disables networking for a container, providing maximum network isolation for sensitive workloads that do not need connectivity.

Setting `--network none` creates a container with only a loopback interface and no external network access. This is useful for security-sensitive batch processing, offline computations, and workloads that should be completely isolated from the network.

---

## Using None Network Mode

```bash
# Run a container with no network

podman run --rm --network none \
  docker.io/library/alpine:latest ip addr show
# Output: Only the loopback interface (lo) is shown

# Verify no external access
podman run --rm --network none \
  docker.io/library/alpine:latest ping -c 1 8.8.8.8
# Output: ping: sendto: Network unreachable
```

## Use Cases for None Network Mode

### Batch Data Processing

```bash
# Process data without any network access
podman run --rm --network none \
  -v /home/user/input:/input:ro \
  -v /home/user/output:/output \
  docker.io/library/python:3.12 \
  python -c "
import os
for f in os.listdir('/input'):
    with open(f'/input/{f}') as src:
        data = src.read().upper()
    with open(f'/output/{f}', 'w') as dst:
        dst.write(data)
print('Processing complete')
"
```

### Cryptographic Operations

```bash
# Generate keys in an isolated environment using an image with OpenSSL pre-installed
podman run --rm --network none \
  -v /home/user/keys:/keys \
  docker.io/alpine/openssl:latest \
  openssl genrsa -out /keys/private.pem 4096
```

### Compilation and Build Tasks

```bash
# Compile code without network access (all dependencies pre-installed)
podman run --rm --network none \
  -v /home/user/src:/src:ro \
  -v /home/user/build:/build \
  docker.io/library/gcc:latest \
  sh -c "gcc /src/main.c -o /build/app"
```

## Verifying Network Isolation

```bash
# Only loopback is available
podman run --rm --network none \
  docker.io/library/alpine:latest ip link show
# 1: lo: <LOOPBACK,UP,LOWER_UP>

# No routes exist
podman run --rm --network none \
  docker.io/library/alpine:latest ip route show
# (empty output)

# DNS is not available
podman run --rm --network none \
  docker.io/library/alpine:latest nslookup google.com
# nslookup: can't resolve 'google.com'
```

## None Network with Volume Access

Containers with no network can still access data through volumes:

```bash
# Read data from volumes, process offline, write results
podman run -d --name offline-worker \
  --network none \
  -v input-data:/input:ro \
  -v output-data:/output \
  docker.io/library/python:3.12 \
  python /input/process.py
```

## Combining with Other Security Options

```bash
# Maximum security: no network, read-only root, dropped capabilities
podman run --rm \
  --network none \
  --read-only \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  -v /home/user/data:/data:ro \
  docker.io/library/alpine:latest cat /data/file.txt
```

## None vs Internal Network

| Feature | --network none | --internal network |
|---------|---------------|-------------------|
| Loopback | Yes | Yes |
| Container-to-container | No | Yes |
| External access | No | No |
| DNS resolution | No | Container names only |

## Summary

The `--network none` mode in Podman disables all networking except the loopback interface, providing complete network isolation. Use it for batch processing, cryptographic operations, and any workload that should not have network access. Combine with read-only filesystems and dropped capabilities for maximum container security. Containers can still access data through volume mounts while remaining network-isolated.
