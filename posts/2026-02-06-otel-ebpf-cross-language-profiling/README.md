# How to Use OpenTelemetry eBPF Profiler for Cross-Language Profiling Without Code Changes (C++, Rust, Python, Node.js)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, eBPF, Profiling, Cross-Language

Description: Learn how to deploy the OpenTelemetry eBPF profiler for cross-language profiling of C++, Rust, Python, and Node.js without any code changes.

One of the most appealing aspects of eBPF-based profiling is that it works at the kernel level. You do not need to instrument your application code, inject agents, or recompile binaries. The OpenTelemetry eBPF profiler leverages this capability to provide unified profiling across C++, Rust, Python, Node.js, and other runtimes running on the same host.

## Why eBPF for Cross-Language Profiling?

Traditional profilers are language-specific. You use `perf` for C++, `py-spy` for Python, `clinic` for Node.js, and so on. Each tool has its own output format, overhead characteristics, and deployment requirements. The eBPF profiler sidesteps all of this by attaching to the kernel's perf subsystem and unwinding stacks from userspace, regardless of the language runtime.

This means a single deployment covers every process on the host. No code changes. No restarts.

## Setting Up the eBPF Profiler

First, pull the OpenTelemetry eBPF profiler agent. It ships as a container image or a standalone binary.

```bash
# Pull the profiler agent image
docker pull ghcr.io/open-telemetry/opentelemetry-ebpf-profiler:v0.8.0

# Run the profiler agent
docker run --rm -d \
  --name otel-ebpf-profiler \
  --privileged \
  --pid=host \
  -v /sys/kernel:/sys/kernel:ro \
  -v /lib/modules:/lib/modules:ro \
  -e OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4317 \
  ghcr.io/open-telemetry/opentelemetry-ebpf-profiler:v0.8.0
```

The `--privileged` flag is required because eBPF programs need elevated permissions to attach to kernel probes. The `--pid=host` flag allows the agent to see all processes on the host, not just those inside its own container namespace.

## Kernel Requirements

Your host kernel must be version 4.19 or later. For best results, use 5.8+ which has better BPF trampoline support. Check your kernel version:

```bash
uname -r
# Expected output: 5.15.0-88-generic or similar
```

You also need `CONFIG_BPF=y`, `CONFIG_BPF_SYSCALL=y`, and `CONFIG_BPF_JIT=y` enabled in the kernel config. Most modern distributions ship with these enabled by default.

## How It Handles Different Languages

The profiler uses different stack unwinding strategies depending on the language runtime it detects.

For **C++ and Rust**, it reads frame pointers or DWARF unwind info directly. These compiled languages produce native stack frames, so the profiler walks the stack using standard kernel-level unwinding.

For **Python**, the agent detects the CPython interpreter and reads the PyFrameObject structures from memory. It maps these interpreter frames back to Python function names and file locations.

For **Node.js**, it reads V8's internal code maps. V8 maintains metadata about JIT-compiled functions, and the profiler uses this to resolve JavaScript function names from raw instruction pointers.

```yaml
# Collector config to receive profiles
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s

exporters:
  otlphttp:
    endpoint: http://pyroscope:4040

service:
  pipelines:
    profiles:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
```

## Verifying Cross-Language Stacks

Once the profiler is running, you can verify it is capturing stacks from multiple runtimes. A typical mixed-language stack might look like this in your profiling backend:

```
[kernel] __schedule
[kernel] schedule
[kernel] do_nanosleep
[native] std::thread::sleep (my-rust-service)
[python] process_request (app.py:42)
[nodejs] handleIncoming (server.js:118)
```

The profiler tags each frame with the language runtime it came from, so you can distinguish native frames from interpreted ones.

## Filtering by Process or Container

In production, you probably do not want to profile every single process. The profiler supports filtering:

```bash
# Only profile specific processes by name
docker run --rm -d \
  --name otel-ebpf-profiler \
  --privileged \
  --pid=host \
  -v /sys/kernel:/sys/kernel:ro \
  -e OTEL_PROFILER_FILTER_PROCESS_NAMES="my-rust-service,python3,node" \
  -e OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4317 \
  ghcr.io/open-telemetry/opentelemetry-ebpf-profiler:v0.8.0
```

You can also filter by container ID or Kubernetes pod labels if running in a Kubernetes environment.

## Sampling Rate Configuration

The default sampling rate is typically 19 Hz (19 samples per second per CPU). This keeps overhead well under 1% while still providing statistically meaningful profiles. You can adjust it:

```bash
# Set sampling frequency to 49 Hz for more detail
-e OTEL_PROFILER_SAMPLING_FREQUENCY=49
```

Higher rates give more detail but increase CPU overhead. For production, stick with 19-29 Hz.

## Practical Considerations

There are a few things to keep in mind. Debug symbols improve the quality of stack traces significantly. For C++ and Rust, make sure your binaries ship with debug info or that you have separate debuginfo packages installed. For Python and Node.js, the interpreter metadata is usually sufficient, but minified or bundled JavaScript will produce less readable stacks.

Also, some container runtimes strip capabilities that eBPF needs. If you are running in Kubernetes, you may need to add `SYS_ADMIN` and `SYS_PTRACE` capabilities to your profiler pod's security context instead of running fully privileged.

The OpenTelemetry eBPF profiler turns what used to be a per-language, per-team effort into a single infrastructure concern. Deploy it once, and you get profiling data for every language on the host, all flowing through the same OpenTelemetry pipeline as your traces, metrics, and logs.
