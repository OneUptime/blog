# Validation Summary: How to Monitor File Access with eBPF

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- eBPF
- BCC / bpfcc Python bindings
- Linux syscall tracepoints
- Linux VFS file operations
- BPF helper functions and perf buffers
- bpftool, libbpf, and BTF
- Python syslog, SQLite, and JSON logging

## Sources Consulted
- BCC Reference Guide: https://github.com/iovisor/bcc/blob/master/docs/reference_guide.md
- Linux kernel BPF documentation: https://docs.kernel.org/bpf/
- Linux bpf-helpers(7) manual: https://man7.org/linux/man-pages/man7/bpf-helpers.7.html
- Linux open(2) / openat(2) manual: https://man7.org/linux/man-pages/man2/open.2.html
- Linux syslog(3) manual: https://man7.org/linux/man-pages/man3/syslog.3.html
- Python syslog module documentation: https://docs.python.org/3/library/syslog.html

## Issues Found
- The file-open tracer claimed to trace both `openat` and `openat2`, but the BCC program only attached to `sys_enter_openat`. Updated the description to match the code.
- The file-open tracer claimed to capture a full file path. The `openat` tracepoint provides the pathname argument as supplied by the process, which may be relative and is bounded by the buffer size. Updated the wording accordingly.
- The first Python example used `bpf` inside the perf-buffer callback but assigned it as a local variable in `main()`. Added `global bpf` so the callback can access the loaded BPF object.
- Removed unused Python imports from the first two examples.
- The read/write monitor claimed to implement file descriptor to filename mapping, but the code only tracks descriptors and byte counts. Updated the description to avoid overclaiming.
- The directory monitor text described unlink and rename coverage more broadly than the code implemented. Added `sys_enter_unlink`, `sys_enter_rename`, and `sys_enter_renameat` probes alongside the existing `unlinkat` and `renameat2` probes.
- The sensitive-file monitor declared an unused `alerted` map with a comment claiming duplicate alert suppression. Removed it because duplicate suppression was not implemented.
- The sensitive-file monitor used `syslog.LOG_SECURITY`, which is not a standard Python syslog constant on Linux. Changed it to `syslog.LOG_AUTHPRIV`.
- The audit example declared `euid`, `egid`, and `cwd` fields but never populated them. Removed those fields and the related misleading comment.
- The audit example submitted write events at syscall entry, so the recorded return value was not the number of bytes written. Added entry/exit correlation for writes and captured `args->ret` on `sys_exit_write`.
- The audit example described `fd > 2` as tracking only regular files. File descriptor numbers do not imply file type, so the comment now says it skips standard input, output, and error.
- The prerequisite command used `/proc/kallsyms` while claiming to verify the BPF syscall. Replaced it with `bpftool feature probe kernel`.
- The production filtering example used an invalid LPM trie pattern for string prefix matching. Replaced it with a simple fixed `/etc/` prefix check that is appropriate for an illustrative verifier-friendly snippet.
- The high-availability example referenced `event_count` and `error_count` without initializing them. Added initialization.
- The container support snippet used `os` without importing it. Added the missing import.

## Review Notes
The examples remain BCC-oriented and intentionally educational. For production use, the post could later note that syscall tracepoint argument names are kernel ABI details discoverable from tracefs format files, and that resolving complete paths or file types generally needs additional state or different hook points.
