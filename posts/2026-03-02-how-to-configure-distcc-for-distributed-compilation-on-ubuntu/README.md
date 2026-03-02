# How to Configure distcc for Distributed Compilation on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, distcc, Compilation, Build Tool, Development

Description: Learn how to configure distcc on Ubuntu to distribute C and C++ compilation across multiple machines, dramatically reducing build times for large projects.

---

Compiling large C and C++ projects on a single machine can take a long time even with all available cores. distcc distributes compilation across multiple machines over the network - each machine compiles a portion of the source files in parallel, and the results come back to the coordinator machine for linking. If you have a handful of spare machines with compatible compilers, distcc can cut build times by a factor proportional to the number of compile servers you add.

## How distcc Works

distcc splits the compilation pipeline:

1. The **coordinator** (your workstation) preprocesses each source file locally
2. The preprocessed source is sent to a **volunteer** machine over TCP
3. The volunteer runs the actual compiler and sends back the object file
4. The coordinator collects all object files and runs the linker locally

Because preprocessing and linking happen locally, the volunteers only need matching compiler versions - they don't need access to your source tree or headers.

## Network Setup

For this guide:
- **Coordinator**: `192.168.1.10` (your primary build machine)
- **Volunteers**: `192.168.1.20`, `192.168.1.21` (compile farm nodes)

All machines should run the same Ubuntu version and have the same compiler version installed.

## Installing distcc on All Machines

Run this on every machine (coordinator and all volunteers):

```bash
sudo apt update
sudo apt install distcc

# Verify installation
distcc --version
```

## Configuring Volunteer Machines

On each volunteer machine that will receive compilation jobs:

### Edit the distcc Configuration

```bash
sudo nano /etc/default/distcc
```

```bash
# Set to 'true' to start the distcc daemon
STARTDISTCC="true"

# Network addresses allowed to connect (space-separated CIDR or hostnames)
# Be specific - don't allow connections from the entire internet
ALLOWEDNETS="192.168.1.0/24"

# Address to listen on (use 0.0.0.0 for all interfaces)
LISTENER="0.0.0.0"

# Nice level for compile jobs (0 = normal priority, 10 = low priority)
# Setting this lower prevents compilation from impacting interactive use
NICE="10"

# Maximum number of concurrent compile jobs (usually 2x CPU cores)
MAXJOBS="8"

# Log verbosity (0-7, default is 2)
LOGFILE="/var/log/distccd.log"
```

### Start the distcc Daemon

```bash
sudo systemctl enable distcc
sudo systemctl start distcc
sudo systemctl status distcc
```

### Verify the Daemon is Listening

```bash
# Should show distccd listening on port 3632
ss -tlnp | grep 3632

# Test from the coordinator
nc -zv 192.168.1.20 3632
nc -zv 192.168.1.21 3632
```

### Firewall Configuration

```bash
# Allow distcc traffic from the coordinator only
sudo ufw allow from 192.168.1.10 to any port 3632

# Or from the entire build network
sudo ufw allow from 192.168.1.0/24 to any port 3632
```

## Configuring the Coordinator Machine

On your primary build machine, tell distcc which volunteers to use:

### Using DISTCC_HOSTS Environment Variable

```bash
# Set in ~/.bashrc or your build environment
export DISTCC_HOSTS="localhost/4 192.168.1.20/8 192.168.1.21/8"
```

The format is `host/slots` where slots is the maximum number of parallel jobs to send to that host:
- `localhost/4` - Use 4 local CPU cores
- `192.168.1.20/8` - Send up to 8 jobs concurrently to this volunteer

### Using the Hosts Configuration File

```bash
# Edit the distcc hosts file
nano ~/.distcc/hosts

# Or system-wide
sudo nano /etc/distcc/hosts
```

```
# Format: host/maxjobs
# localhost always included for linking and fallback
localhost/4
192.168.1.20/8
192.168.1.21/8
```

### Verify Host Configuration

```bash
# Show the configured hosts
distcc --list-hosts
```

## Using distcc for Your Build

### Method 1: Using the Masquerade Symlinks

distcc installs wrappers in `/usr/lib/distcc/`:

```bash
# Add to PATH (before /usr/bin)
export PATH="/usr/lib/distcc:$PATH"

# Now gcc/g++ calls go through distcc
which gcc
# /usr/lib/distcc/gcc
```

Build normally and distcc distributes the work:

```bash
# The -j value should be the total available slots across all hosts
# (local slots + all volunteer slots)
make -j20   # 4 local + 8 + 8 volunteer slots
```

### Method 2: DISTCC_FALLBACK with CMAKE

```bash
export CC="distcc gcc"
export CXX="distcc g++"

cmake -B build .
cmake --build build -j20
```

### Method 3: Explicit distcc Call

```bash
# Compile a single file through distcc
distcc gcc -c myfile.c -o myfile.o

# Use in a Makefile
CC = distcc gcc
CXX = distcc g++
```

## Monitoring distcc Progress

### distccmon-text

```bash
# Monitor compilation progress in text mode
# Run on the coordinator while the build is running
distccmon-text 1   # Update every 1 second
```

Sample output:

```
 Job  Host                  State     File
  0   localhost             Compiling src/main.cpp
  1   192.168.1.20          Compiling src/util.cpp
  2   192.168.1.21          Compiling src/parser.cpp
  3   192.168.1.20          Compiling src/lexer.cpp
  4   localhost             Compiling src/codegen.cpp
```

### distccmon-gnome

For a graphical monitor on desktop systems:

```bash
sudo apt install distccmon-gnome
distccmon-gnome
```

## Checking distcc Statistics

```bash
# View distcc job statistics
cat ~/.distcc/stats

# View the daemon log on volunteer machines
sudo tail -f /var/log/distccd.log
```

## Combining distcc with ccache

The most effective setup combines ccache (for caching) with distcc (for distribution). When ccache hits, the result is returned locally without using distcc at all. When ccache misses, distcc handles the actual compilation:

```bash
# Set ccache to use distcc as its underlying compiler
export CCACHE_PREFIX=distcc
export CC="ccache gcc"
export CXX="ccache g++"

# Or via PATH masquerade
export PATH="/usr/lib/ccache:/usr/lib/distcc:$PATH"
```

The ordering matters: ccache should come before distcc in the PATH so local cache hits bypass network calls entirely.

## Troubleshooting

### Jobs Not Being Distributed

```bash
# Check that distccd is running on volunteers
sudo systemctl status distcc

# Test connectivity
distcc --test 192.168.1.20

# Enable verbose output during build
export DISTCC_VERBOSE=1
make -j4 2>&1 | grep -E "distcc|compile"
```

### Compiler Version Mismatch

distcc is strict about compiler versions - the volunteer must have the exact same compiler version as the coordinator:

```bash
# Check version on coordinator
gcc --version

# Check version on volunteer
ssh 192.168.1.20 gcc --version
```

If versions differ, either install matching compilers or use the `--allow-version-mismatch` option (only for testing - this can cause subtle bugs):

```bash
# On volunteers, in /etc/default/distcc
DISTCC_OPTS="--allow-version-mismatch"
```

### Network Performance Issues

If the network is slower than local compilation, distribution may not help:

```bash
# Test network throughput between coordinator and volunteer
iperf3 -s   # On volunteer
iperf3 -c 192.168.1.20   # On coordinator

# For compilation distribution to help, you typically need
# at least 100Mbps between machines
```

### Build Failures from Race Conditions

If using `-j` with a value much higher than your CPU count causes failures:

```bash
# Calculate a safe -j value
# (coordinator_cores + sum_of_volunteer_slots)
# Don't go much above this value
```

## Using distcc Over SSH (Encrypted)

For builds across untrusted networks, distcc supports SSH tunneling:

```bash
# Configure SSH volunteer
export DISTCC_HOSTS="@192.168.1.20/8"
# The @ prefix tells distcc to tunnel through SSH

# SSH key authentication must be set up for this to work non-interactively
ssh-copy-id builduser@192.168.1.20
```

distcc over SSH has more overhead than the native protocol, so it's only worthwhile when the network is untrusted and the compile jobs are large enough that the SSH overhead is negligible.

distcc is most valuable during intensive development phases when you're rebuilding large C/C++ projects frequently. Combined with ccache, the combination turns multi-minute rebuilds into near-instant operations after the initial cold build.
