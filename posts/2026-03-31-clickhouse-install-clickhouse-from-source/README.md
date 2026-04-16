# How to Install ClickHouse from Source

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Installation, Source Build, CMake, Linux

Description: Step-by-step guide to building and installing ClickHouse from source code on Linux using CMake and Ninja.

---

Building ClickHouse from source gives you full control over compilation flags, patches, and custom features. This is useful for testing unreleased changes, applying custom patches, or building for an unsupported platform.

## Prerequisites

You need a Linux system with at least 16 GB of RAM (32 GB recommended) and 50 GB of free disk space. Install the required build tools:

```bash
sudo apt-get update
sudo apt-get install -y build-essential git cmake ccache python3 ninja-build \
  nasm yasm gawk lsb-release wget software-properties-common gnupg
```

ClickHouse requires Clang 21 or newer (as of 2026). Install it using LLVM's apt script:

```bash
wget https://apt.llvm.org/llvm.sh
chmod +x llvm.sh
sudo ./llvm.sh 21
```

## Clone the Repository

```bash
git clone --recursive https://github.com/ClickHouse/ClickHouse.git
cd ClickHouse
```

Use `--recursive` to fetch all submodules. For a specific release tag (pick one from `git tag --list`):

```bash
git checkout v24.3.12.75-lts
git submodule update --init --recursive
```

## Configure with CMake

Create a build directory and configure:

```bash
mkdir build
cd build
cmake .. -G Ninja \
  -DCMAKE_C_COMPILER=clang-21 \
  -DCMAKE_CXX_COMPILER=clang++-21 \
  -DCMAKE_BUILD_TYPE=RelWithDebInfo
```

For a minimal debug build with faster compile times:

```bash
cmake .. -G Ninja \
  -DCMAKE_BUILD_TYPE=Debug \
  -DENABLE_TESTS=OFF \
  -DENABLE_UTILS=OFF
```

## Build ClickHouse

```bash
ninja clickhouse
```

This compiles the single `clickhouse` binary that bundles server, client, and all utilities. On a 16-core machine this typically takes 30-60 minutes.

To speed up the build, limit parallelism to avoid OOM:

```bash
ninja -j 8 clickhouse
```

## Install the Binary

The built binary is located at `build/programs/clickhouse`:

```bash
sudo cp programs/clickhouse /usr/local/bin/
sudo chmod +x /usr/local/bin/clickhouse
clickhouse --version
```

## Create the Service

Set up directories and a systemd service:

```bash
sudo mkdir -p /var/lib/clickhouse /var/log/clickhouse-server /etc/clickhouse-server
sudo useradd --system --home /var/lib/clickhouse clickhouse
sudo chown clickhouse:clickhouse /var/lib/clickhouse /var/log/clickhouse-server
```

Copy a sample config from the source tree:

```bash
sudo cp ../programs/server/config.xml /etc/clickhouse-server/
sudo cp ../programs/server/users.xml /etc/clickhouse-server/
```

Start the server:

```bash
sudo clickhouse server --config-file=/etc/clickhouse-server/config.xml &
clickhouse client
```

## Summary

Building ClickHouse from source requires a capable Linux machine, Clang, CMake, and Ninja. Clone the repo with submodules, configure with CMake pointing to Clang, run `ninja clickhouse`, and deploy the resulting binary. While the build is time-consuming, it gives you full control over the binary and is the best approach for custom patches or unsupported platforms.
