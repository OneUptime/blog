# How to Install ClickHouse on ARM Architecture

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ARM, Installation, AArch64, Linux

Description: Guide to installing and running ClickHouse on ARM64 (AArch64) servers including AWS Graviton and Apple Silicon Linux VMs.

---

ClickHouse provides official ARM64 packages and binaries, making it straightforward to deploy on AWS Graviton, Ampere Altra, Raspberry Pi 4, and other AArch64 platforms. ARM deployments often deliver better price-to-performance ratios for analytics workloads.

## Check Your Architecture

```bash
uname -m
# Expected: aarch64
```

## Install via Official Repository (Ubuntu/Debian ARM64)

Add the ClickHouse repository and install:

```bash
sudo apt-get install -y apt-transport-https ca-certificates curl gnupg
curl -fsSL 'https://packages.clickhouse.com/rpm/lts/repodata/repomd.xml.key' | sudo gpg --dearmor -o /usr/share/keyrings/clickhouse-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/clickhouse-keyring.gpg] https://packages.clickhouse.com/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/clickhouse.list

sudo apt-get update
sudo apt-get install -y clickhouse-server clickhouse-client
```

The repository automatically serves the `arm64` variant when run on an AArch64 host.

## Install via Single Binary Download

For environments without package managers, download the ARM64 binary directly:

```bash
curl -fsSL "https://builds.clickhouse.com/master/aarch64/clickhouse" \
  -o clickhouse
chmod +x clickhouse
sudo mv clickhouse /usr/local/bin/
clickhouse --version
```

Alternatively, use the official install script, which auto-detects the architecture (including the `aarch64v80compat` build for older ARMv8.0 cores):

```bash
curl https://clickhouse.com/ | sh
```

## Docker on ARM

ClickHouse's official Docker image supports ARM64 via multi-arch manifests:

```bash
docker run -d \
  --name clickhouse-server \
  --ulimit nofile=262144:262144 \
  -p 8123:8123 -p 9000:9000 \
  clickhouse/clickhouse-server:24.3
```

Docker automatically pulls the `linux/arm64` image on ARM hosts.

## Tune for ARM Performance

ARM processors handle SIMD differently. Enable ARM-specific optimizations in `config.xml`:

```bash
sudo clickhouse-client -q "SELECT * FROM system.build_options WHERE name LIKE '%ARCH%';"
```

For AWS Graviton3, set the CPU frequency scaling governor to performance:

```bash
echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor
```

## Verify Installation

```bash
sudo systemctl start clickhouse-server
clickhouse-client --query "SELECT version(), hostName(), toUInt64(1 + 1)"
```

## Summary

Installing ClickHouse on ARM64 is straightforward using official packages or pre-built binaries. The repository serves the correct architecture automatically, and the official Docker image uses multi-arch manifests. ARM deployments on platforms like AWS Graviton offer compelling cost efficiency for ClickHouse analytics workloads.
