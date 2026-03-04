# How to Trace Kernel Functions with ftrace on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Kernel, Linux

Description: Step-by-step guide on trace kernel functions with ftrace using Red Hat Enterprise Linux 9.

---

ftrace is a kernel tracing framework built directly into the Linux kernel. It lets you trace kernel function calls, measure latencies, and understand what the kernel is doing in response to your workloads, all without installing additional tools.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 2: Configure the Service

Use ftrace to trace kernel functions:

```bash
# Mount debugfs if not already mounted
sudo mount -t debugfs none /sys/kernel/debug

# List available tracers
cat /sys/kernel/debug/tracing/available_tracers

# Enable function tracer
echo function | sudo tee /sys/kernel/debug/tracing/current_tracer

# Filter to specific functions
echo 'tcp_*' | sudo tee /sys/kernel/debug/tracing/set_ftrace_filter

# Start tracing
echo 1 | sudo tee /sys/kernel/debug/tracing/tracing_on

# Read the trace
cat /sys/kernel/debug/tracing/trace | head -50

# Stop tracing
echo 0 | sudo tee /sys/kernel/debug/tracing/tracing_on
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable <service-name>

# Start the service
sudo systemctl start <service-name>

# Check the status
sudo systemctl status <service-name>
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status <service-name>

# Review recent logs
journalctl -u <service-name> --no-pager -n 20
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u <service-name> -e --no-pager`.
- Ensure all required packages are installed: `rpm -qa | grep <package-name>`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
