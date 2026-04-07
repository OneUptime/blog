# How to Enable UADK Acceleration for RGW Compression

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, UADK, Compression, Performance, Hardware Acceleration, ARM

Description: Enable Unified Acceleration Development Kit (UADK) hardware acceleration for Ceph RGW compression on ARM-based servers to reduce CPU usage.

---

UADK (Unified Acceleration Development Kit) is a framework developed for ARM-based accelerators (like HiSilicon Kunpeng) that offloads compute-intensive operations such as compression and cryptography from the CPU. Ceph RGW supports UADK for accelerating ZLIB compression of objects.

## What is UADK

UADK provides a unified interface to hardware accelerator engines on ARM SoCs. For Ceph RGW, it accelerates the ZLIB compressor used when the `rgw_compression_type` is set to `zlib`, offloading deflate/inflate operations to dedicated hardware.

## Prerequisites

- ARM server with UADK-compatible accelerator (HiSilicon Kunpeng 920 or similar)
- UADK library installed (`libwd`, `libhisi_zip`, etc.)
- Ceph built with UADK support

## Checking UADK Availability

```bash
# Check if UADK compression engine is available
ls /dev/uacce/
# Should show accelerator device files like hisi_zip-0

# Verify the UADK library is installed
ldconfig -p | grep libwd
ldconfig -p | grep libhisi_zip
```

## Enabling UADK Compression in RGW

```bash
ceph config set client.rgw rgw_compression_type zlib
```

When Ceph is built with UADK support and the UADK libraries and hardware accelerator are available, the zlib compressor plugin automatically offloads compression to the UADK hardware engine. No additional configuration flag is needed.

Apply compression to a placement target:

```bash
radosgw-admin zone placement modify \
  --rgw-zone default \
  --placement-id default-placement \
  --compression zlib
```

Restart RGW to pick up the new configuration:

```bash
sudo systemctl restart ceph-radosgw@rgw.$(hostname -s)
```

## Verifying UADK Is Active

Check RGW performance counters for UADK-specific metrics:

```bash
ceph daemon client.rgw.$(hostname -s) perf dump | grep -i uadk
ceph daemon client.rgw.$(hostname -s) perf dump | grep compress
```

Monitor CPU usage before and after enabling UADK:

```bash
# Generate a large compressible file and monitor CPU
yes "The quick brown fox jumps over the lazy dog" | head -c 100M > test.txt
time aws s3 cp test.txt s3://mybucket/ --endpoint-url http://your-rgw-host:7480

# Compare top output with and without UADK
```

## Benchmarking Compression Performance

Use a simple benchmark to compare throughput:

```bash
# Without UADK (run on a node without UADK hardware or libraries)
time aws s3 cp large-file.csv s3://mybucket/test-no-uadk.csv \
  --endpoint-url http://your-rgw-host:7480

# With UADK (run on a node with UADK hardware and libraries available)
time aws s3 cp large-file.csv s3://mybucket/test-with-uadk.csv \
  --endpoint-url http://your-rgw-host:7480
```

## Rook Deployment Notes

When running in Rook on ARM Kubernetes nodes, ensure the UADK device plugin is running to expose accelerator devices to pods:

```yaml
# In DaemonSet for UADK device plugin
volumes:
  - name: uadk-dev
    hostPath:
      path: /dev/uacce
```

Also ensure RGW pods are scheduled on ARM nodes:

```yaml
nodeSelector:
  kubernetes.io/arch: arm64
```

## Summary

UADK acceleration in Ceph RGW offloads ZLIB compression to ARM hardware accelerators, reducing CPU overhead during object uploads and downloads. Ensure Ceph is built with UADK support and that the UADK libraries and device drivers are present on RGW nodes. The zlib compressor plugin automatically uses UADK hardware when available. This is particularly effective on HiSilicon Kunpeng servers with dedicated compression engines.
