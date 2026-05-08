# How to Run a Container with SHM Size Configuration in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Shared Memory, Performance

Description: Learn how to configure the shared memory size for Podman containers to support applications that rely on /dev/shm for inter-process communication.

---

> Increasing /dev/shm size is essential for databases, browsers, and any application that uses shared memory for inter-process communication.

The `/dev/shm` directory in Linux is a shared memory filesystem (tmpfs) used for inter-process communication (IPC). By default, Podman containers get a `/dev/shm` of only 64MB. This is often insufficient for applications like PostgreSQL, Chrome/Chromium, machine learning frameworks, and other software that relies heavily on shared memory.

---

## Default SHM Size

By default, containers get 64MB of shared memory:

```bash
# Check the default /dev/shm size

podman run --rm alpine sh -c "
  df -h /dev/shm
  echo ''
  mount | grep shm
"
```

## Setting a Custom SHM Size

Use the `--shm-size` flag to increase shared memory:

```bash
# Set /dev/shm to 256 megabytes
podman run --rm --shm-size 256m alpine sh -c "
  df -h /dev/shm
"

# Set /dev/shm to 1 gigabyte
podman run --rm --shm-size 1g alpine sh -c "
  df -h /dev/shm
"

# Set /dev/shm to 2 gigabytes
podman run --rm --shm-size 2g alpine sh -c "
  df -h /dev/shm
"
```

## PostgreSQL and Shared Memory

PostgreSQL uses shared memory extensively for its shared buffer pool:

```bash
# PostgreSQL with increased shared memory
podman run -d --name postgres \
  --shm-size 256m \
  -e POSTGRES_PASSWORD=secret \
  postgres:16 \
  -c shared_buffers=128MB

# Verify the shared memory allocation
podman exec postgres sh -c "df -h /dev/shm"

# Wait for PostgreSQL to accept connections
podman exec postgres sh -c "until pg_isready -U postgres; do sleep 1; done"

# Check PostgreSQL shared buffer configuration
podman exec postgres sh -c "
  psql -U postgres -c 'SHOW shared_buffers;'
" 2>/dev/null

podman stop postgres && podman rm postgres
```

## Chrome/Chromium Headless Browsers

Headless browsers need substantial shared memory:

```bash
# Running headless Chrome requires at least 1GB of shared memory
podman run --rm \
  --shm-size 2g \
  alpine sh -c "
    echo 'SHM configured for headless browser:'
    df -h /dev/shm
  "

# Selenium with Chrome
podman run -d --name selenium \
  --shm-size 2g \
  -p 4444:4444 \
  selenium/standalone-chrome:latest 2>/dev/null || echo "Selenium image example"

podman stop selenium 2>/dev/null && podman rm selenium 2>/dev/null
```

## Testing Shared Memory Usage

```bash
# Write to /dev/shm to verify it works
podman run --rm --shm-size 128m alpine sh -c "
  echo 'Writing 50MB to /dev/shm...'
  dd if=/dev/zero of=/dev/shm/testfile bs=1M count=50 2>&1
  echo ''
  echo 'Usage after write:'
  df -h /dev/shm
  echo ''
  ls -la /dev/shm/
"

# Test exceeding the limit
podman run --rm --shm-size 64m alpine sh -c "
  echo 'Trying to write 100MB to 64MB /dev/shm...'
  dd if=/dev/zero of=/dev/shm/testfile bs=1M count=100 2>&1
  status=\$?
  echo \"Exit code: \$status\"
"
```

## SHM with Multiple Processes

Shared memory is commonly used for IPC between processes in the same container:

```bash
# Two processes communicating via /dev/shm
podman run --rm --shm-size 128m alpine sh -c "
  # Process 1: Write data to shared memory
  echo 'Message from process 1' > /dev/shm/ipc_channel

  # Process 2: Read data from shared memory
  echo 'Process 2 received:'
  cat /dev/shm/ipc_channel

  # Both processes share the same /dev/shm space
  echo ''
  df -h /dev/shm
"
```

## SHM with POSIX Shared Memory

Applications using `shm_open()` store data in `/dev/shm`:

```bash
# Python example using POSIX shared memory
podman run --rm --shm-size 256m python:3.12-slim python3 -c "
import multiprocessing.shared_memory as shm
import sys

# Create a shared memory block
block = shm.SharedMemory(name='test_block', create=True, size=1024*1024)
print(f'Created shared memory block: {block.name}')
print(f'Size: {block.size} bytes')

# Write data
block.buf[:5] = b'Hello'
print(f'Data written to shared memory')

# Clean up
block.close()
block.unlink()
print('Shared memory cleaned up')
"
```

## Verifying SHM Configuration

```bash
# Inspect the SHM size setting
podman run -d --name shm-check --shm-size 512m alpine sleep infinity

podman inspect shm-check --format '{{.HostConfig.ShmSize}}'
# Output in bytes: 536870912 (512MB)

# Verify from inside
podman exec shm-check df -h /dev/shm

podman stop shm-check && podman rm shm-check
```

## SHM Size in Pods

```bash
# Create a pod with a specific SHM size
podman pod create --name shm-pod --shm-size 512m

# Containers in the pod share the pod's /dev/shm
podman run -d --pod shm-pod --name pod-app alpine sleep infinity
podman exec pod-app df -h /dev/shm

podman pod stop shm-pod && podman pod rm shm-pod
```

## Practical Example: Machine Learning Workload

```bash
# ML frameworks like PyTorch use shared memory for data loading
podman run --rm \
  --shm-size 4g \
  --memory 8g \
  --cpus 4 \
  python:3.12-slim sh -c "
    echo 'SHM configured for ML workload:'
    df -h /dev/shm
    echo ''
    echo 'Total available memory for data loaders: 4GB'
    echo 'This prevents \"bus error\" and DataLoader crashes'
  "
```

## Common SHM Size Recommendations

```bash
# Small applications (default is fine)
podman run --rm alpine echo "64MB default SHM is sufficient"

# Web applications with session storage
podman run --rm --shm-size 128m alpine echo "128MB for session data"

# PostgreSQL (depends on shared_buffers setting)
podman run --rm --shm-size 256m alpine echo "256MB for PostgreSQL"

# Headless browsers (Chrome, Firefox)
podman run --rm --shm-size 2g alpine echo "2GB for headless browsers"

# Machine learning (PyTorch, TensorFlow data loaders)
podman run --rm --shm-size 4g alpine echo "4GB+ for ML workloads"

# Video processing
podman run --rm --shm-size 1g alpine echo "1GB for video processing"
```

## Summary

Configuring SHM size in Podman ensures applications have sufficient shared memory:

- Default `/dev/shm` is 64MB, which is too small for many workloads
- Use `--shm-size` to increase the allocation (e.g., `256m`, `1g`, `4g`)
- Databases like PostgreSQL need it for shared buffers
- Headless browsers need at least 1-2GB
- Machine learning frameworks need it for data loaders
- SHM is backed by RAM, so it counts against available memory
- Too-small SHM causes "bus error", crashes, or silent failures

Set SHM size based on your application's shared memory requirements, and always test under load to verify the allocation is sufficient.
