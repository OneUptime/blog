# Validation Summary: How to Write eBPF Programs in Rust with Aya

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- eBPF
- Rust
- Aya and aya_ebpf
- aya-log and aya-log-ebpf
- XDP
- eBPF maps, hash maps, and ring buffers
- Kprobes and tracepoints
- Tokio async Rust
- Linux bpftool and bpf-linker

## Sources Consulted
- Aya Book: Development Environment: https://aya-rs.dev/book/start/development.html
- Aya Book: Hello XDP: https://aya-rs.dev/book/start/hello-xdp.html
- Aya Book: XDP: https://aya-rs.dev/book/programs/xdp
- Aya Book: Probes: https://aya-rs.dev/book/programs/probes.html
- Aya Book: Tracepoints: https://aya-rs.dev/book/programs/tracepoints.html
- Aya template repository: https://github.com/aya-rs/aya-template
- Aya crate documentation: https://docs.rs/aya/latest/aya/
- Aya RingBuf documentation: https://docs.rs/aya/latest/aya/maps/ring_buf/struct.RingBuf.html
- aya_ebpf RingBuf documentation: https://docs.rs/aya-ebpf/latest/aya_ebpf/maps/ring_buf/struct.RingBuf.html
- aya_ebpf HashMap documentation: https://docs.rs/aya-ebpf/latest/aya_ebpf/maps/hash_map/struct.HashMap.html
- aya_ebpf helper source documentation: https://docs.rs/aya-ebpf/latest/src/aya_ebpf/helpers.rs.html

## Issues Found
- The architecture diagram used the old `aya-bpf` name. Changed it to `aya_ebpf`, matching the current Rust crate/module name used elsewhere in the post.
- The setup instructions incorrectly used `rustup target add bpf --toolchain nightly`. Current Aya setup uses stable Rust plus nightly with the `rust-src` component. Updated the commands accordingly.
- The system dependency section implied Aya needs libbpf development packages. Aya does not rely on libbpf or bcc, so the libbpf/pkg-config guidance was removed and `bpftool` was added for kernel type binding workflows.
- Several user-space snippets embedded `../../target/bpfel-unknown-none/release/my-project`, which does not match the current Aya template build-script output. Updated the examples to use `include_bytes_aligned!(concat!(env!("OUT_DIR"), "/my-project"))`.
- The XDP counter example described `*count += 1` as atomic from the eBPF program perspective. Replaced that claim with guidance to use per-CPU maps or atomic helpers for contended counters.
- The ring buffer async example used a non-existent `RingBufAsync` API. Replaced it with `tokio::io::unix::AsyncFd` around `aya::maps::RingBuf`, and used `RingBuf::next()` to drain available events.
- The ring buffer event parsing used `ptr::read` on byte data. Updated it to `ptr::read_unaligned` to avoid assuming alignment of the received byte slice.
- The kprobe example imported unused `bpf_probe_read_kernel` and `HashMap`, and bound an unused `sock` variable. Removed the unused imports and renamed the binding to `_sock`.
- The tracepoint example called `bpf_get_current_comm(&mut comm)`, but current `aya_ebpf` returns the command array directly from `bpf_get_current_comm()`. Updated the call.
- The advanced async example moved a borrowed map into a spawned task. Updated it to take ownership of the map with `ebpf.take_map(...)` and adjusted the task parameter type to `HashMap<aya::maps::MapData, u8, u64>`.
- The build instructions manually built the eBPF crate for a BPF target. Updated them to describe the current template build-script flow, where building the user-space package compiles and embeds the eBPF object.

## Review Notes
- The post is technically relevant and remains a useful Aya/eBPF tutorial after the corrections.
- The examples are still illustrative snippets rather than a single copy-paste complete project; readers must ensure the generated template dependencies and feature flags match the code they assemble.
- Ring buffers require Linux 5.8 or newer, according to Aya's `RingBuf` documentation.
