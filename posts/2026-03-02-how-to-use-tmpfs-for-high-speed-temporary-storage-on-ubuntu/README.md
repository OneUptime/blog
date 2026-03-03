# How to Use tmpfs for High-Speed Temporary Storage on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, Filesystem, Performance

Description: Use tmpfs on Ubuntu to create RAM-backed temporary filesystems for high-speed storage, reducing I/O latency for temporary files, build artifacts, and caches.

---

tmpfs is a memory-backed filesystem in Linux. Files written to a tmpfs mount are stored in RAM (and optionally swap), making reads and writes dramatically faster than any disk-based storage. Ubuntu uses tmpfs by default for `/tmp` and several other system directories, and you can create additional tmpfs mounts for your specific workloads.

## How tmpfs Works

Unlike a ramdisk (which allocates a fixed block of RAM), tmpfs is dynamic. It only consumes the RAM that is actually used, and it can use swap space when RAM is under pressure. The key characteristics:

- Extremely fast: reads/writes happen at memory speed
- Non-persistent: all data is lost when the filesystem is unmounted or the system is shut down
- Dynamic sizing: takes only as much RAM as it needs, up to the configured maximum

## Checking Existing tmpfs Mounts

Ubuntu mounts several tmpfs filesystems by default.

```bash
# List all mounted filesystems, filter for tmpfs
mount | grep tmpfs

# Example output:
# tmpfs on /run type tmpfs (rw,nosuid,nodev,noexec,relatime,size=819200k,mode=755)
# tmpfs on /dev/shm type tmpfs (rw,nosuid,nodev)
# tmpfs on /run/lock type tmpfs (rw,nosuid,nodev,noexec,relatime,size=5120k)
# tmpfs on /tmp type tmpfs (rw,nosuid,nodev)
# tmpfs on /run/user/1000 type tmpfs (rw,nosuid,nodev,relatime,size=819164k,mode=700)

# Check sizes and usage
df -h -t tmpfs
```

## Mounting a tmpfs Filesystem

```bash
# Create a mount point
sudo mkdir -p /mnt/ramdisk

# Mount a 512MB tmpfs
sudo mount -t tmpfs -o size=512m tmpfs /mnt/ramdisk

# Verify
df -h /mnt/ramdisk
# Filesystem      Size  Used Avail Use% Mounted on
# tmpfs           512M     0  512M   0% /mnt/ramdisk

# Check it is writable
echo "test" > /mnt/ramdisk/test.txt
cat /mnt/ramdisk/test.txt
```

## tmpfs Mount Options

The mount options control behavior and limits.

```bash
# size - maximum size (k=KB, m=MB, g=GB, % of RAM)
sudo mount -t tmpfs -o size=25% tmpfs /mnt/scratch   # 25% of RAM

# mode - directory permissions
sudo mount -t tmpfs -o size=256m,mode=1777 tmpfs /mnt/tmp-shared

# uid/gid - ownership
sudo mount -t tmpfs -o size=512m,uid=1000,gid=1000 tmpfs /mnt/user-scratch

# noexec - prevent executing binaries (security hardening)
sudo mount -t tmpfs -o size=256m,noexec,nosuid tmpfs /mnt/safe-tmp

# nr_inodes - limit number of files (0=no limit based on size)
sudo mount -t tmpfs -o size=512m,nr_inodes=100000 tmpfs /mnt/limited
```

## Persistent tmpfs Mounts via /etc/fstab

Add to `/etc/fstab` to recreate the tmpfs on every boot.

```bash
sudo nano /etc/fstab
```

```text
# tmpfs for application scratch space (512MB)
tmpfs  /mnt/scratch  tmpfs  size=512m,mode=1777  0  0

# tmpfs for build artifacts (2GB, no execute)
tmpfs  /mnt/build    tmpfs  size=2g,noexec,nosuid,nodev  0  0

# tmpfs for Nginx cache (1GB)
tmpfs  /var/cache/nginx  tmpfs  size=1g,uid=www-data,gid=www-data,mode=700  0  0
```

```bash
# Test fstab syntax and mount all entries
sudo mount -a

# Verify
df -h -t tmpfs
```

## Performance Benchmarking

Demonstrate the speed difference between tmpfs and disk.

```bash
# Install fio for I/O benchmarking
sudo apt install fio -y

# Benchmark tmpfs sequential write speed
fio --name=tmpfs-test \
    --directory=/mnt/scratch \
    --rw=write \
    --bs=4M \
    --numjobs=1 \
    --size=256M \
    --time_based \
    --runtime=10 \
    --group_reporting

# Benchmark disk (for comparison)
mkdir -p /tmp/disk-test
fio --name=disk-test \
    --directory=/tmp/disk-test \
    --rw=write \
    --bs=4M \
    --numjobs=1 \
    --size=256M \
    --time_based \
    --runtime=10 \
    --group_reporting

# Simple dd benchmark
echo "tmpfs write speed:"
dd if=/dev/zero of=/mnt/scratch/test bs=4M count=256 conv=fdatasync 2>&1 | tail -1

echo "Disk write speed:"
dd if=/dev/zero of=/tmp/disk-test/test bs=4M count=256 conv=fdatasync 2>&1 | tail -1
```

## Practical Use Cases

### Speeding Up Docker Builds

Docker build context and intermediate layers can be placed on tmpfs.

```bash
# Mount tmpfs for Docker's temporary directory
sudo mkdir -p /mnt/docker-tmp
sudo mount -t tmpfs -o size=8g tmpfs /mnt/docker-tmp

# Tell Docker to use it for temp files
echo '{
    "tmp-dir": "/mnt/docker-tmp"
}' | sudo tee /etc/docker/daemon.json

sudo systemctl restart docker
```

### Speeding Up Compilation

Large build directories with many small files benefit greatly from tmpfs.

```bash
# Mount a large tmpfs for build artifacts
sudo mount -t tmpfs -o size=4g tmpfs /mnt/build

# Build in the tmpfs directory
cd /mnt/build
git clone https://github.com/example/project.git
cd project
./configure
make -j$(nproc)

# Copy final artifacts to persistent storage
cp build/myapp /usr/local/bin/
```

### Web Server Cache on tmpfs

Put Nginx's proxy cache on tmpfs for maximum cache performance.

```bash
# Add to /etc/fstab
sudo bash -c 'echo "tmpfs /var/cache/nginx tmpfs size=1g,uid=www-data,gid=www-data,mode=700 0 0" >> /etc/fstab'

sudo mkdir -p /var/cache/nginx
sudo chown www-data:www-data /var/cache/nginx
sudo mount -a
```

### Python/Node.js Package Cache

Speed up CI/CD pipelines by putting package caches on tmpfs.

```bash
# Create tmpfs for pip cache
sudo mount -t tmpfs -o size=2g tmpfs /mnt/pip-cache

# Use it with pip
pip install --cache-dir /mnt/pip-cache -r requirements.txt

# For npm
npm install --cache /mnt/npm-cache
```

## Monitoring tmpfs Usage

```bash
# Check usage
df -h -t tmpfs

# Watch usage in real-time
watch -n 2 'df -h -t tmpfs'

# Alert when tmpfs is nearly full
check_tmpfs() {
    local mount="$1"
    local threshold="${2:-80}"

    local usage
    usage=$(df -h "$mount" | awk 'NR==2 {gsub(/%/,""); print $5}')

    if [ "$usage" -ge "$threshold" ]; then
        echo "WARNING: tmpfs $mount is ${usage}% full"
    else
        echo "OK: tmpfs $mount is ${usage}% full"
    fi
}

check_tmpfs /mnt/scratch 80
check_tmpfs /var/cache/nginx 90
```

## Handling Data Persistence with tmpfs

Since tmpfs is volatile, any data you need after a reboot must be saved elsewhere.

```bash
#!/bin/bash
# Save important tmpfs contents to disk before shutdown
# Add to /etc/systemd/system/save-tmpfs.service

cat > /etc/systemd/system/save-tmpfs.service << 'EOF'
[Unit]
Description=Save tmpfs contents before shutdown
DefaultDependencies=no
Before=shutdown.target reboot.target halt.target
Requires=local-fs.target
After=local-fs.target

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStop=/bin/bash -c 'rsync -a /mnt/scratch/important/ /var/lib/myapp-data/'

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable save-tmpfs.service
```

## Size Limits and OOM Risk

Be careful not to over-allocate tmpfs. If a tmpfs fills up completely, writes fail. If the system runs out of combined RAM + swap backing the tmpfs, the OOM killer will start terminating processes.

```bash
# Calculate safe tmpfs allocation
# Check total RAM
free -h

# Check current swap
swapon --show

# Rule of thumb: keep total tmpfs allocations below 50% of RAM + swap
# unless the workloads using them are short-lived and predictable
```

tmpfs is one of the simplest performance improvements available on Linux. For any workload that produces large amounts of temporary data - log processing, builds, tests, caches - moving that data to tmpfs can cut I/O-related wall-clock time dramatically, often by 5-10x or more.
