# How to Verify Rootless Podman Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Rootless, Verification, Configuration

Description: Learn how to verify that your rootless Podman installation is correctly configured and ready for production use.

---

> Verifying your rootless Podman configuration ensures that user namespaces, storage, networking, and other components are working correctly before deploying containers.

After setting up rootless Podman, it is important to verify that all components are functioning properly. A misconfigured setup can lead to subtle issues with permissions, networking, or storage that are harder to diagnose later.

---

## Check Rootless Mode

```bash
# Verify Podman is running in rootless mode

podman info --format '{{.Host.Security.Rootless}}'
# Expected: true

# Confirm you are not running as root
whoami
id
```

## Verify subuid and subgid

```bash
# Check that your user has subuid/subgid allocations
grep "$USER" /etc/subuid
grep "$USER" /etc/subgid

# Both should show entries like: username:100000:65536
# If empty, a standard rootless setup is incomplete
```

## Test User Namespace Mappings

```bash
# Verify UID mapping is working
podman unshare cat /proc/self/uid_map
# Expected output:
#          0       1000          1
#          1     100000      65536

# Verify GID mapping
podman unshare cat /proc/self/gid_map

# Test that UID 0 inside the namespace works
podman unshare id
# Expected: uid=0(root) gid=0(root)
```

## Check Storage Configuration

```bash
# Verify storage driver and location
podman info --format '{{.Store.GraphDriverName}}'
# Expected: overlay (preferred) or vfs

podman info --format '{{.Store.GraphRoot}}'
# Expected: /home/<user>/.local/share/containers/storage
# This may differ if XDG_DATA_HOME or storage.conf changes the storage path

# Verify storage is writable
podman run --rm alpine:latest touch /tmp/test && echo "Storage OK"
```

## Test Container Operations

```bash
# Pull an image
podman pull alpine:latest

# Run a basic container
podman run --rm alpine:latest echo "Hello from rootless Podman"

# Test interactive mode
podman run -it --rm alpine:latest sh -c "id && hostname && echo OK"

# Test detached mode
podman run -d --name verify-test alpine:latest sleep 30
podman ps
podman rm -f verify-test
```

## Test Networking

```bash
# Test outbound network connectivity
podman run --rm alpine:latest ping -c 2 8.8.8.8

# Test DNS resolution
podman run --rm alpine:latest nslookup google.com

# Test port publishing
podman run -d --name web-test -p 8888:80 nginx:latest
curl --retry 5 --retry-delay 1 --retry-connrefused -s http://localhost:8888 > /dev/null && echo "Port publishing OK"
podman rm -f web-test
```

## Test Volume Mounts

```bash
# Test bind mount
mkdir -p /tmp/podman-verify-test
echo "test" > /tmp/podman-verify-test/data.txt
podman run --rm -v /tmp/podman-verify-test:/data:ro alpine:latest cat /data/data.txt
rm -rf /tmp/podman-verify-test

# Test named volume
podman volume create verify-vol
podman run --rm -v verify-vol:/data alpine:latest sh -c "echo test > /data/file.txt"
podman run --rm -v verify-vol:/data alpine:latest cat /data/file.txt
podman volume rm verify-vol
```

## Comprehensive Verification Script

```bash
#!/bin/bash
# verify-rootless-podman.sh

PASS=0
FAIL=0

check() {
  if eval "$2" > /dev/null 2>&1; then
    echo "PASS: $1"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $1"
    FAIL=$((FAIL + 1))
  fi
}

check "Running rootless" "podman info --format '{{.Host.Security.Rootless}}' | grep -q true"
check "subuid configured" "grep -q '^${USER}:' /etc/subuid"
check "subgid configured" "grep -q '^${USER}:' /etc/subgid"
check "Pull image" "podman pull alpine:latest"
check "Run container" "podman run --rm alpine:latest true"
check "Network connectivity" "podman run --rm alpine:latest ping -c 1 8.8.8.8"
check "Port publishing" "sh -c 'podman rm -f ptest >/dev/null 2>&1 || true; podman run -d -p 9999:80 --name ptest nginx:latest && curl --retry 5 --retry-delay 1 --retry-connrefused -sf http://localhost:9999; rc=$?; podman rm -f ptest >/dev/null 2>&1 || true; exit $rc'"

echo ""
echo "Results: $PASS passed, $FAIL failed"
```

## Summary

Verifying rootless Podman configuration involves checking rootless mode status, subuid/subgid allocations, user namespace mappings, storage configuration, container operations, networking, and volume mounts. Run these checks after initial setup and after any system updates that might affect Podman. A thorough verification ensures your rootless environment is ready for production workloads.
