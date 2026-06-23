# Validation Summary: How to Debug and Troubleshoot eBPF Programs

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- eBPF
- Linux kernel verifier
- libbpf
- bpftool
- BPF maps, BTF, ring buffers, and trace buffers
- ftrace, perf, GDB, clang sanitizers
- XDP, kprobes, and tracepoints

## Sources Consulted
- Linux kernel eBPF verifier documentation: https://docs.kernel.org/bpf/verifier.html
- Linux kernel libbpf overview: https://docs.kernel.org/bpf/libbpf/libbpf_overview.html
- libbpf API documentation: https://libbpf.readthedocs.io/en/latest/api.html
- eBPF Docs, libbpf `bpf_program__set_log_buf`: https://docs.ebpf.io/ebpf-library/libbpf/userspace/bpf_program__set_log_buf/
- eBPF Docs, libbpf `bpf_program__set_log_level`: https://docs.ebpf.io/ebpf-library/libbpf/userspace/bpf_program__set_log_level/
- eBPF Docs, loops and `bpf_loop`: https://docs.ebpf.io/linux/concepts/loops/
- eBPF Docs, `bpf_printk`: https://docs.ebpf.io/ebpf-library/libbpf/ebpf/bpf_printk/
- eBPF Docs, `bpf_trace_printk`: https://docs.ebpf.io/linux/helper-function/bpf_trace_printk/
- eBPF Docs, BPF ring buffer map and helpers: https://docs.ebpf.io/linux/map-type/BPF_MAP_TYPE_RINGBUF/
- eBPF Docs, `bpf_ringbuf_reserve`: https://docs.ebpf.io/linux/helper-function/bpf_ringbuf_reserve/
- eBPF Docs, `ring_buffer__new`: https://docs.ebpf.io/ebpf-library/libbpf/userspace/ring_buffer__new/
- Local bpftool man pages: `bpftool-prog(8)`, `bpftool-feature(8)`, and `bpftool-btf(8)`
- Linux trace event documentation: https://docs.kernel.org/trace/events.html
- Linux tracepoint documentation: https://docs.kernel.org/trace/tracepoints.html
- bpftool manual page: https://man7.org/linux/man-pages/man8/bpftool.8.html

## Issues Found
- Corrected loop wording that implied only compile-time loop bounds are acceptable. Modern eBPF supports verifier-bounded loops, while `bpf_loop` is available from Linux 5.17 for larger iteration counts.
- Corrected the tracepoint context example to avoid `%zu` with `bpf_printk` and use an `unsigned long` argument with `%lu`.
- Fixed bpftool JSON option placement by moving `--json` / `--pretty` before the `prog` object, matching bpftool's documented global option syntax.
- Fixed the BTF dump command for a loaded program from `bpftool btf dump id 42` to `bpftool btf dump prog id 42`; `id` refers to a BTF object ID, not a program ID.
- Replaced invalid `bpftool feature probe helpers` with `bpftool feature list_builtins helpers`. Helper availability is shown by `feature probe kernel`; helper names known to bpftool are listed with `list_builtins helpers`.
- Updated the `bpf_printk` comment: libbpf's macro uses `bpf_trace_printk` for up to three format arguments and `bpf_trace_vprintk` for more arguments on kernels that support it.
- Fixed the ring-buffer eBPF example to copy messages with `bpf_probe_read_kernel_str()` instead of copying a fixed 64 bytes from a string literal.
- Added missing userspace includes for the ring-buffer reader (`stdbool.h`, `errno.h`, and `bpf/bpf.h`) and replaced the GNU `?:` fallback with explicit bounds checking of the event type table.
- Added `stdbool.h` to the debug-map example because it uses `bool`.
- Changed the ftrace snippet to list available BPF trace events before enabling `bpf_prog_load`, avoiding a hardcoded non-portable event name.
- Fixed bpftool JSON option placement in the performance debugging example.
- Replaced the non-portable `perf record -e 'bpf:bpf_prog_run'` example with a generic system-wide perf recording command.

## Review Notes
Several code blocks remain illustrative snippets rather than complete standalone programs; they may still require architecture-specific probe names, kernel headers, privileges, mounted tracefs/debugfs, and matching kernel configuration. The technical guidance is accurate after the corrections above.
