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

## Step 2: Trace Kernel Functions

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

## Step 3: Review the Trace

```bash
# Check the active tracer
cat /sys/kernel/debug/tracing/current_tracer

# Check the active function filter
cat /sys/kernel/debug/tracing/set_ftrace_filter

# Review captured trace output
cat /sys/kernel/debug/tracing/trace | head -50
```


## Verification

Confirm tracing has stopped and reset ftrace when you are finished:

```bash
# Confirm tracing is stopped
cat /sys/kernel/debug/tracing/tracing_on

# Return to the default tracer
echo nop | sudo tee /sys/kernel/debug/tracing/current_tracer

# Clear the function filter
echo | sudo tee /sys/kernel/debug/tracing/set_ftrace_filter

# Clear the trace buffer
echo | sudo tee /sys/kernel/debug/tracing/trace
```

## Troubleshooting

- If `/sys/kernel/debug/tracing` is missing, mount debugfs with `sudo mount -t debugfs none /sys/kernel/debug`.
- If no functions are traced, confirm the function names exist in `/sys/kernel/debug/tracing/available_filter_functions`.
- If a wildcard filter does not match as expected, quote the pattern so the shell does not expand it before writing to `set_ftrace_filter`.

## Conclusion

You have successfully completed the tracing described in this guide. Remember to disable tracing and reset filters when you are done to avoid unnecessary overhead. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
