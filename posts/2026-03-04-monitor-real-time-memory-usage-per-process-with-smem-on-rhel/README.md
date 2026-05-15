# How to Monitor Real-Time Memory Usage per Process with smem on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Memory, Monitoring, Linux

Description: Step-by-step guide on monitor real-time memory usage per process with smem using Red Hat Enterprise Linux 9.

---

Traditional tools like `top` and `ps` report memory usage numbers that can be misleading because they include shared memory multiple times. smem provides proportional set size (PSS) metrics that give a more accurate picture of per-process memory consumption.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Enable EPEL and Install smem

Install and use smem. Use the repository setup commands that match your operating system:

```bash
# On RHEL 9, enable CodeReady Linux Builder and EPEL first
sudo subscription-manager repos --enable codeready-builder-for-rhel-9-$(arch)-rpms
sudo dnf install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm

# On CentOS Stream 9, enable CRB and EPEL first
sudo dnf config-manager --set-enabled crb
sudo dnf install -y epel-release epel-next-release

# Install smem
sudo dnf install -y smem python3-matplotlib

# Show memory usage for all processes
smem -tk

# Sort by PSS (Proportional Set Size)
smem -tk --sort pss

# Show memory summarized by user
smem -u

# Show memory for a specific user
smem -U nginx

# Show per-mapping breakdown for a process
smem -m -P nginx

# Generate a bar chart (requires matplotlib)
smem --bar pid -c "pss uss rss"
```

Key metrics:

- **USS** (Unique Set Size): Memory unique to this process
- **PSS** (Proportional Set Size): USS + proportional share of shared memory
- **RSS** (Resident Set Size): Total physical memory (overcounts shared pages)

## Step 2: Monitor in Real Time

```bash
# Refresh the PSS-sorted smem output every 2 seconds
watch -n 2 'smem -tk --sort pss'
```


## Verification

Confirm everything is working by running smem and checking that it can read process memory data:

```bash
# Check the installed version
rpm -q smem

# Confirm smem can read /proc memory data
smem -tk | head
```

## Troubleshooting

- If `dnf` cannot find `smem`, confirm that EPEL is enabled with `dnf repolist`.
- If you see only a subset of processes, run `smem` with `sudo` so it can read the relevant `/proc/<pid>/smaps` files.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor memory usage regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
