# Validation Summary: How to Write eBPF Programs in Go with cilium/ebpf

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- eBPF
- Go
- cilium/ebpf
- bpf2go
- Linux BPF maps, tracepoints, kprobes, XDP, cgroups
- CO-RE and BTF
- bpftool

## Sources Consulted
- cilium/ebpf package documentation: https://pkg.go.dev/github.com/cilium/ebpf
- cilium/ebpf getting started guide: https://ebpf-go.dev/guides/getting-started/
- cilium/ebpf ringbuf package documentation: https://pkg.go.dev/github.com/cilium/ebpf/ringbuf
- cilium/ebpf perf package documentation: https://pkg.go.dev/github.com/cilium/ebpf/perf
- cilium/ebpf link package documentation: https://pkg.go.dev/github.com/cilium/ebpf/link
- cilium/ebpf features package documentation: https://pkg.go.dev/github.com/cilium/ebpf/features
- Linux kernel libbpf overview and CO-RE documentation: https://www.kernel.org/doc/html/v6.6/bpf/libbpf/libbpf_overview.html
- Linux kernel BPF ring buffer documentation: https://www.kernel.org/doc/html/latest/bpf/ringbuf.html
- eBPF Docs CO-RE reference: https://docs.ebpf.io/concepts/core/
- eBPF Docs bpf_core_field_exists reference: https://docs.ebpf.io/ebpf-library/libbpf/ebpf/bpf_core_field_exists/

## Issues Found
- The setup commands used `bpftool` later but did not install it. Added `bpftool` to the Ubuntu/Debian package list.
- The project structure listed a local `bpf_helpers.h`, but the examples include libbpf headers from `<bpf/...>`. Removed that misleading local header entry.
- The first example said it attached to the `execve` tracepoint, while the code attaches to `sched:sched_process_exec`. Updated the description to match the actual tracepoint.
- The `go:generate` directive used paths that were wrong for a file located in `internal/ebpf`. Changed paths from `../bpf/...` to `../../bpf/...`.
- The bpf2go generated-code example returned `*programObjects` from `loadProgram`, but current bpf2go generates a loader returning `*ebpf.CollectionSpec`. Updated the example, added the generated `programPrograms` struct, and corrected the generated event type name to `programEvent`.
- The map operations example imported `unsafe` without using it and used the wrong `Map.BatchLookup` signature. Removed the unused import and rewrote `BatchLookup` to use `MapBatchCursor`.
- The ring buffer example referenced `ebpf.Map` and `unsafe.Sizeof` without importing the required packages. Added the missing imports.
- The loader example omitted required `errors` and `net` imports, imported unused `runtime`, and used the obsolete `ProgramOptions.LogSize` field. Fixed imports and changed the option to `LogSizeStart`.
- The pinning comments implied all BPF objects would be pinned by `MapOptions.PinPath`. Clarified that this applies to maps marked `PinByName`.
- The cgroup attachment example opened a cgroup path and leaked the file descriptor on success. Simplified it to pass the path directly to `link.AttachCgroup`.
- The CO-RE diagram described the runtime relocation component as `libbpf CO-RE`, which is misleading in a cilium/ebpf loader tutorial. Updated it to `cilium/ebpf CO-RE Loader`.
- The CO-RE `do_sys_openat2` example treated the second argument as a user-space string. Corrected it to read the kernel `struct filename` via `BPF_CORE_READ` and `bpf_probe_read_kernel_str`.
- The CO-RE example assigned values that were never used. Added explicit casts to void to avoid unused-variable warnings in stricter builds.
- The tail-call XDP example used `bpf_htons` without including `bpf_endian.h`. Added the missing include.
- The perf reader example used a non-existent `perf.IsClosed` helper. Replaced it with `errors.Is(err, perf.ErrClosed)` and added the missing import.
- The test examples used `os.Geteuid` without importing `os`. Added the missing import.
- The main application's verifier log flag text and `LoaderOptions` assignment were adjusted to match the loader's current `uint32` log-level field.
- The production resource snippet included an unused and misleading CPU-pinning field and called `runtime.LockOSThread` as a general resource-limit step. Removed those pieces and replaced the kernel support check with BTF and `features.HaveMapType(ebpf.RingBuf)` checks.

## Review Notes
- The post is technically relevant and remains useful after corrections.
- The local environment did not have the Go toolchain installed, so snippets were reviewed against official documentation rather than compiled locally.
