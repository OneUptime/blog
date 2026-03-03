# How to Schedule Kernel Updates on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kernel Updates, Linux Kernel, Security, Cluster Management

Description: Learn how to schedule and apply kernel updates on Talos Linux clusters using the immutable upgrade model for reliable and predictable patching.

---

Kernel updates are one of those things that every system administrator deals with, but they can feel particularly tricky in a Kubernetes environment. You need to patch the kernel for security and stability, but you also need to avoid disrupting the workloads running on top of it. Talos Linux handles this differently from traditional distributions. Since the OS is immutable, you do not install individual kernel packages. Instead, kernel updates arrive as part of a new Talos image. This guide explains how to schedule and apply kernel updates effectively.

## How Kernel Updates Work in Talos Linux

In traditional Linux distributions, you might run `apt upgrade` or `yum update` to install a new kernel package. Talos Linux takes a completely different approach. The kernel is baked into the Talos system image, and updates happen by upgrading the entire image to a new version.

When Siderolabs releases a new version of Talos Linux, it includes an updated kernel along with any other system-level changes. You can check the release notes to see what kernel version is included in each release.

```bash
# Check the current kernel version on a node
talosctl dmesg -n <node-ip> | head -5

# Or use the read command to check kernel info
talosctl read /proc/version -n <node-ip>
```

This model has a big advantage: you never end up in a situation where the kernel was updated but some userspace component was not. Everything moves together as a single unit.

## Tracking Kernel Versions

Before you can schedule updates, you need to know what versions you are running and what is available.

```bash
# Check the current Talos version, which includes the kernel
talosctl version -n <node-ip>

# Compare with the latest available version
# Check the Talos releases page for the latest version
# https://github.com/siderolabs/talos/releases
```

You should also track CVEs that affect the Linux kernel. Subscribe to security mailing lists or use a vulnerability scanner to know when a kernel update is urgent versus routine.

## Setting Up a Kernel Update Schedule

Since kernel updates come bundled with Talos image upgrades, your kernel update schedule is really your Talos upgrade schedule. Here is a practical approach:

### Tier 1: Security-Critical Updates

When a kernel CVE with high severity (CVSS 7.0+) is published, you should plan to apply the fix within your next available maintenance window, or sooner if the vulnerability is actively being exploited.

### Tier 2: Regular Monthly Updates

Plan a monthly upgrade cycle where you apply the latest stable Talos release. This keeps you current with kernel patches and other improvements.

### Tier 3: Quarterly Major Updates

For major version changes (such as a new kernel major version), plan for a quarterly cycle with more extensive testing.

```yaml
# update-schedule.yaml
# Document your kernel update schedule
kernel_update_policy:
  critical_cve:
    sla: "48 hours"
    testing: "minimal - smoke tests only"
    approval: "security team lead"
  monthly_updates:
    schedule: "second Tuesday of each month"
    window: "02:00 - 06:00 UTC"
    testing: "full regression suite"
    approval: "ops team lead"
  quarterly_major:
    schedule: "first Saturday after quarter end"
    window: "00:00 - 12:00 UTC"
    testing: "full regression + performance benchmarks"
    approval: "engineering director"
```

## Testing Kernel Updates Before Production

Never apply a kernel update directly to production. Set up a testing pipeline:

1. **Development cluster** - Apply the update here first and run basic smoke tests
2. **Staging cluster** - Mirror production workloads and run regression tests
3. **Production canary** - Apply to one or two production worker nodes and monitor
4. **Full production rollout** - Roll out to all nodes

```bash
# Upgrade a staging node to test the new kernel
talosctl upgrade \
  --image ghcr.io/siderolabs/installer:v1.9.1 \
  -n <staging-node-ip>

# After reboot, verify the kernel version
talosctl read /proc/version -n <staging-node-ip>

# Run your test suite against the staging cluster
./run-integration-tests.sh --cluster staging
```

## Performing the Kernel Update

Since the kernel is part of the Talos image, the update process is the same as a Talos upgrade. Here is the step-by-step process:

```bash
# Step 1: Take an etcd backup
talosctl etcd snapshot /backup/etcd-pre-upgrade.db -n <control-plane-ip>

# Step 2: Drain the first node
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# Step 3: Upgrade the node (this includes the new kernel)
talosctl upgrade \
  --image ghcr.io/siderolabs/installer:v1.9.1 \
  -n <node-ip>

# Step 4: Wait for the node to come back
talosctl health -n <node-ip> --wait-timeout 10m

# Step 5: Verify the new kernel version
talosctl read /proc/version -n <node-ip>

# Step 6: Uncordon the node
kubectl uncordon <node-name>
```

Repeat this for each node in the cluster, one at a time.

## Automating the Schedule with CronJobs

You can create a system that automatically checks for new Talos releases and notifies you when updates are available.

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: kernel-update-checker
  namespace: maintenance
spec:
  schedule: "0 8 * * 1"  # Every Monday at 8 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: checker
            image: curlimages/curl:latest
            command:
            - /bin/sh
            - -c
            - |
              # Fetch the latest Talos release
              LATEST=$(curl -s https://api.github.com/repos/siderolabs/talos/releases/latest | grep tag_name | cut -d '"' -f 4)
              CURRENT="v1.9.0"  # Set your current version

              if [ "$LATEST" != "$CURRENT" ]; then
                echo "New Talos release available: $LATEST (current: $CURRENT)"
                # Send notification to your alert channel
                curl -X POST "$SLACK_WEBHOOK" \
                  -H 'Content-Type: application/json' \
                  -d "{\"text\": \"New Talos release $LATEST available. Current: $CURRENT. Plan kernel update.\"}"
              fi
          restartPolicy: OnFailure
```

## Handling Kernel Parameters

Sometimes you need specific kernel parameters for your workloads. In Talos Linux, you configure kernel parameters through the machine configuration:

```yaml
# machine config patch for kernel parameters
machine:
  sysctls:
    net.core.somaxconn: "65535"
    net.ipv4.ip_forward: "1"
    vm.max_map_count: "262144"
  kernel:
    modules:
      - name: br_netfilter
      - name: overlay
```

When you upgrade to a new kernel, verify that your custom kernel parameters are still applied:

```bash
# Check sysctl values after upgrade
talosctl read /proc/sys/net/core/somaxconn -n <node-ip>
talosctl read /proc/sys/vm/max_map_count -n <node-ip>

# Check loaded kernel modules
talosctl read /proc/modules -n <node-ip> | grep br_netfilter
```

## Rollback Plan

If a kernel update causes problems, you can roll back to the previous Talos image:

```bash
# Rollback to the previous version
talosctl rollback -n <node-ip>

# Verify the rollback was successful
talosctl version -n <node-ip>
talosctl read /proc/version -n <node-ip>
```

Talos keeps the previous image on disk, so rollbacks are fast and do not require downloading anything.

## Monitoring After Kernel Updates

After applying a kernel update, monitor your cluster closely for at least 24 hours. Watch for:

- Node instability or unexpected reboots
- Performance regression in workloads
- Networking issues (especially if the kernel includes network stack changes)
- Storage I/O problems
- Container runtime issues

```bash
# Monitor node conditions
kubectl get nodes -w

# Check for kernel errors in dmesg
talosctl dmesg -n <node-ip> | grep -i error

# Monitor resource usage
kubectl top nodes
```

## Conclusion

Scheduling kernel updates on Talos Linux is fundamentally simpler than on traditional distributions because the kernel is bundled with the OS image. You do not need to worry about package dependencies, partial updates, or mismatched components. The trade-off is that you cannot update the kernel independently. You get the kernel that comes with the Talos release. In practice, this is a good trade-off because it guarantees consistency across your cluster. Stick to a regular upgrade schedule, test updates before production, and always have a rollback plan ready.
