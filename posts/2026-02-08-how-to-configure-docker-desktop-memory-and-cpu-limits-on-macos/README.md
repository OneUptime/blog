# How to Configure Docker Desktop Memory and CPU Limits on macOS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Desktop, macOS, Memory, CPU, Performance, Resource Limits

Description: Configure Docker Desktop memory and CPU limits on macOS to balance container performance with host system responsiveness.

---

Docker Desktop on macOS runs all your containers inside a lightweight Linux virtual machine. This VM has a fixed pool of CPU cores and memory allocated from your Mac's total resources. The default settings work for light usage, but they will either starve your containers or starve your Mac when workloads get heavier.

Getting these limits right matters. Set them too low and containers crash with out-of-memory errors, builds take forever, and databases run slow. Set them too high and your Mac becomes sluggish because Docker is consuming resources that macOS, your IDE, and your browser need.

## Default Resource Allocation

Docker Desktop on macOS ships with these defaults (varies by machine):

- **CPU**: Half of your available cores
- **Memory**: 2 GB (older versions) or variable based on total RAM (newer versions)
- **Swap**: 1 GB
- **Disk**: 64 GB virtual disk

For a MacBook Pro with 16 GB RAM and 10 CPU cores, the defaults give Docker 5 cores and somewhere between 2-4 GB of memory. That is fine for running a single web application but not enough for a full development stack.

## Changing Resource Limits via the GUI

Open Docker Desktop and click the gear icon to open Settings. Navigate to "Resources" in the left sidebar.

You will see sliders for:

- **CPUs**: Number of processor cores allocated to Docker
- **Memory**: RAM allocated to the Docker VM
- **Swap**: Additional swap space (overflow memory on disk)
- **Virtual disk limit**: Maximum size of Docker's storage

Adjust the sliders, click "Apply & restart," and Docker Desktop restarts the VM with the new limits. All running containers stop during the restart.

## Recommended Settings by Workload

Here are tested configurations for common macOS development scenarios.

**16 GB Mac - Web Development** (app + database + cache):

```
CPUs: 4
Memory: 6 GB
Swap: 1.5 GB
Disk: 80 GB
```

**16 GB Mac - Microservices** (5-8 containers):

```
CPUs: 6
Memory: 8 GB
Swap: 2 GB
Disk: 120 GB
```

**32 GB Mac - Heavy Development** (Kubernetes, large builds):

```
CPUs: 8
Memory: 16 GB
Swap: 4 GB
Disk: 200 GB
```

**8 GB Mac - Minimal** (single container):

```
CPUs: 2
Memory: 3 GB
Swap: 1 GB
Disk: 40 GB
```

Leave at least 4 GB of memory and 2 CPU cores for macOS itself. Your IDE, browser, and Spotlight indexing all need resources.

## Configuring via the Settings File

For scripted or automated configuration, edit the Docker Desktop settings JSON file directly.

```bash
# Location of Docker Desktop settings on macOS
cat ~/Library/Group\ Containers/group.com.docker/settings.json | python3 -m json.tool
```

The relevant fields:

```json
{
  "cpus": 4,
  "memoryMiB": 8192,
  "swapMiB": 2048,
  "diskSizeMiB": 122880
}
```

```bash
# Backup current settings before modifying
cp ~/Library/Group\ Containers/group.com.docker/settings.json \
   ~/Library/Group\ Containers/group.com.docker/settings.json.backup

# Modify settings using python3 (change memory to 8 GB)
python3 -c "
import json
path = '$HOME/Library/Group Containers/group.com.docker/settings.json'
with open(path, 'r') as f:
    settings = json.load(f)
settings['memoryMiB'] = 8192
settings['cpus'] = 6
with open(path, 'w') as f:
    json.dump(settings, f, indent=2)
print('Settings updated. Restart Docker Desktop to apply.')
"
```

After editing the file, restart Docker Desktop for changes to take effect. You can restart from the menu bar icon or with the command line.

```bash
# Restart Docker Desktop from the command line
osascript -e 'quit app "Docker"'
sleep 5
open -a Docker
```

## Monitoring Current Resource Usage

Before changing settings, understand how your current containers use resources.

```bash
# Show overall Docker disk usage
docker system df

# Show real-time CPU and memory per container
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

# Check total resources available to Docker
docker info --format 'CPUs: {{.NCPU}}, Memory: {{.MemTotal}}'
```

If `docker stats` shows containers consistently using 80%+ of allocated memory, increase the memory limit. If CPU usage stays near 100% during builds, add more cores.

## Diagnosing OOM (Out of Memory) Kills

When a container exceeds available memory, Docker kills it. On macOS, this manifests as containers randomly restarting or exiting with code 137.

```bash
# Check if a container was killed due to OOM
docker inspect --format '{{.State.OOMKilled}}' <container-name>

# Check the exit code (137 = killed by signal 9, often OOM)
docker inspect --format '{{.State.ExitCode}}' <container-name>

# View container events to find OOM occurrences
docker events --since 1h --filter event=oom
```

If you see OOM kills, you have two options: increase Docker Desktop's memory allocation, or set per-container memory limits so one container cannot consume everything.

```bash
# Set a memory limit on a specific container
docker run -d --name mydb --memory=1g --memory-swap=1.5g postgres:16-alpine

# In Docker Compose
# deploy:
#   resources:
#     limits:
#       memory: 1G
```

## Apple Silicon Specific Settings

On M1, M2, M3, and M4 Macs, Docker Desktop runs through Apple's Virtualization framework. Performance is generally better than on Intel Macs, and you can typically allocate fewer resources for the same workload.

```bash
# Check if running on Apple Silicon
uname -m
# Output: arm64 (Apple Silicon) or x86_64 (Intel)

# Verify Docker is running natively (not through Rosetta)
docker version --format '{{.Server.Arch}}'
# Should output: arm64
```

Apple Silicon Macs handle memory pressure more gracefully because of unified memory architecture. If you have a 16 GB M-series Mac, allocating 8 GB to Docker still leaves macOS responsive because the memory is unified. On Intel Macs, the VM memory is fully reserved, so allocating 8 GB of 16 GB truly leaves only 8 GB for the host.

## VirtioFS Performance on macOS

Docker Desktop on macOS uses VirtioFS (on macOS 12.5+) for file sharing between host and containers. This setting interacts with resource limits because file operations use CPU cycles in the VM.

```bash
# Verify VirtioFS is enabled (check Docker Desktop Settings > General)
# Test file I/O performance
docker run --rm -v $(pwd):/test alpine sh -c \
  "time dd if=/dev/zero of=/test/benchfile bs=1M count=256 && rm /test/benchfile"
```

If file-heavy workloads (like npm install with mounted volumes) run slow, the bottleneck might be CPU allocation to the VM rather than the file sharing backend. Try increasing the CPU allocation by 1-2 cores and measure again.

## Swap Configuration

Swap acts as an emergency overflow when containers exceed physical memory. It prevents OOM kills at the cost of severe performance degradation.

```bash
# Check swap usage inside Docker's VM
docker run --rm alpine free -m
```

Keep swap at 1-2 GB for most workloads. If containers regularly use swap, that signals you need more physical memory allocated, not more swap. Swap on macOS ultimately hits the SSD, which adds latency and accelerates SSD wear.

## Resetting to Optimal Defaults

If your Docker Desktop configuration gets into a bad state, you can reset just the resource settings without losing containers and images.

```bash
# Reset to recommended settings for your hardware
python3 -c "
import json, os, multiprocessing

path = os.path.expanduser('~/Library/Group Containers/group.com.docker/settings.json')
with open(path, 'r') as f:
    settings = json.load(f)

total_cpus = multiprocessing.cpu_count()
# Allocate half the CPUs, minimum 2
settings['cpus'] = max(2, total_cpus // 2)
# Default to 4 GB memory
settings['memoryMiB'] = 4096
settings['swapMiB'] = 1024
settings['diskSizeMiB'] = 65536

with open(path, 'w') as f:
    json.dump(settings, f, indent=2)

print(f'Reset to: {settings[\"cpus\"]} CPUs, {settings[\"memoryMiB\"]}MB RAM')
print('Restart Docker Desktop to apply.')
"
```

The right resource allocation depends on your specific workflow. Start with the recommendations above, monitor usage with `docker stats`, and adjust incrementally. The goal is finding the balance point where containers run well without making your Mac feel slow.
