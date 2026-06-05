# How to Use OpenTelemetry eBPF Profiler for Cross-Language Profiling Without

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, eBPF, Profiling, Cross-Language

Description: Learn how to deploy the OpenTelemetry eBPF profiler for cross-language profiling of C++, Rust, Python, and Node.js without any code changes.

One of the most appealing aspects of eBPF-based profiling is that it works at the kernel level. You do not need to instrument your application code, inject agents, or recompile binaries. The OpenTelemetry eBPF profiler leverages this capability to provide unified profiling across C++, Rust, Python, Node.js, and other runtimes running on the same host.

## Why eBPF for Cross-Language Profiling?

Traditional profilers are language-specific. You use `perf` for C++, `py-spy` for Python, `clinic` for Node.js, and so on. Each tool has its own output format, overhead characteristics, and deployment requirements. The eBPF profiler sidesteps all of this by attaching to the kernel's perf subsystem and unwinding stacks from userspace, regardless of the language runtime.

This means a single deployment covers every process on the host. No code changes. No restarts.

## Setting Up the eBPF Profiler

First, pull the OpenTelemetry Collector eBPF profiling distribution. The standalone `ebpf-profiler` binary still exists for development and testing, but the supported deployment path is the Collector receiver.

```bash
# Pull the profiler Collector image

docker pull otel/opentelemetry-collector-ebpf-profiler:0.153.0

# Run the profiler Collector
docker run --rm -d \
  --name otel-ebpf-profiler \
  --privileged \
  --pid=host \
  -v /sys:/sys:ro \
  -v "$(pwd)/otel-ebpf-profiler.yaml:/etc/otelcol/config.yaml:ro" \
  otel/opentelemetry-collector-ebpf-profiler:0.153.0 \
  --feature-gates=+service.profilesSupport \
  --config=/etc/otelcol/config.yaml
```

The `--privileged` flag is the simplest way to grant the Linux capabilities and filesystem access the receiver needs for eBPF and low-level process inspection. The `--pid=host` flag allows the Collector to see all processes on the host, not just those inside its own container namespace.

## Kernel Requirements

Your host kernel must be version 5.10 or later for current releases, unless your distribution has backported the required eBPF features and you intentionally use the `no_kernel_version_check` option. Check your kernel version:

```bash
uname -r
# Expected output: 5.15.0-88-generic or similar
```

You also need eBPF support in the kernel, including `CONFIG_BPF=y`, `CONFIG_BPF_SYSCALL=y`, and `CONFIG_BPF_JIT=y`. Most modern distributions ship with these enabled by default.

## How It Handles Different Languages

The profiler uses different stack unwinding strategies depending on the language runtime it detects.

For **C++ and Rust**, it reads frame pointers or ELF `.eh_frame` unwind information. These compiled languages produce native stack frames, so the profiler can unwind native code without requiring DWARF debug information on the host.

For **Python**, the agent detects the CPython interpreter and reads the PyFrameObject structures from memory. It maps these interpreter frames back to Python function names and file locations.

For **Node.js**, it reads V8's internal code maps. V8 maintains metadata about JIT-compiled functions, and the profiler uses this to resolve JavaScript function names from raw instruction pointers.

```yaml
# otel-ebpf-profiler.yaml
receivers:
  profiling:

processors:
  batch:
    timeout: 10s

exporters:
  otlp_http:
    endpoint: http://pyroscope:4040

service:
  pipelines:
    profiles:
      receivers: [profiling]
      processors: [batch]
      exporters: [otlp_http]
```

## Verifying Cross-Language Stacks

Once the profiler is running, you can verify it is capturing stacks from multiple runtimes. A typical mixed-language stack might look like this in your profiling backend:

```text
[kernel] __schedule
[kernel] schedule
[kernel] do_nanosleep
[native] std::thread::sleep (my-rust-service)
[python] process_request (app.py:42)
[nodejs] handleIncoming (server.js:118)
```

The profiler tags each frame with the language runtime it came from, so you can distinguish native frames from interpreted ones.

## Filtering by Process or Container

In production, remember that this distribution is designed to run as a whole-system node agent. It does not expose a process-name allowlist like some language-specific profilers do. If you need narrower views, filter or aggregate by process, container, pod, or resource attributes in your profiling backend or in downstream Collector processors.

You can still enrich profiles with Kubernetes or container metadata in the Collector pipeline and use those attributes when querying your backend.

## Sampling Rate Configuration

The default sampling rate is 20 Hz (20 samples per second). This keeps overhead low while still providing statistically meaningful profiles. You can adjust it in the `profiling` receiver configuration:

```yaml
receivers:
  profiling:
    samples_per_second: 49
```

Higher rates give more detail but increase CPU overhead. For production, stick with 19-29 Hz.

## Practical Considerations

There are a few things to keep in mind. Debug symbols improve the quality of stack traces significantly. For C++ and Rust, make sure your binaries ship with debug info or that you have separate debuginfo packages installed. For Python and Node.js, the interpreter metadata is usually sufficient, but minified or bundled JavaScript will produce less readable stacks.

Also, some container runtimes strip capabilities that eBPF needs. If you are running in Kubernetes, you may need to run the profiler pod with `hostPID: true` and either privileged mode or explicit capabilities such as `SYS_ADMIN`, `PERFMON`, and `BPF`, plus access to host `/proc` and `/sys`.

The OpenTelemetry eBPF profiler turns what used to be a per-language, per-team effort into a single infrastructure concern. Deploy it once, and you get profiling data for every language on the host, all flowing through the same OpenTelemetry pipeline as your traces, metrics, and logs.
