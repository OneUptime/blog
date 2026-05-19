# Validation Summary: How to Enable and Configure Address Space Layout Randomization (ASLR) on Ubuntu

## Status
validated

## Post Type
Tutorial / security hardening guide

## Technologies Covered
- Ubuntu
- Linux kernel sysctl settings
- ASLR and process memory layout
- ELF binary hardening: PIE, stack canaries, NX, RELRO
- Docker and Kubernetes container sysctl behavior
- C and GCC

## Sources Consulted
- Linux kernel documentation for `kernel.randomize_va_space`, `kptr_restrict`, and `perf_event_paranoid`: https://docs.kernel.org/admin-guide/sysctl/kernel.html
- Linux kernel documentation for `vm.mmap_rnd_bits` and `vm.mmap_rnd_compat_bits`: https://docs.kernel.org/admin-guide/sysctl/vm.html
- Linux kernel documentation for `net.core.bpf_jit_harden`: https://docs.kernel.org/admin-guide/sysctl/net.html
- Linux kernel documentation for `fs.suid_dumpable`: https://docs.kernel.org/admin-guide/sysctl/fs.html
- Ubuntu security documentation for PIE defaults and compiler hardening flags: https://documentation.ubuntu.com/security/security-features/process-memory/compiler-flags/
- Docker CLI documentation for `docker run --sysctl` and namespaced sysctls: https://docs.docker.com/reference/cli/docker/container/run/
- Kubernetes documentation for namespaced, safe, unsafe, and node-level sysctls: https://kubernetes.io/docs/tasks/administer-cluster/sysctl-cluster/
- Local command help/man pages: `sysctl --help`, `setarch --help`, `readelf --help`, `file --help`, and `man 2 personality`

## Issues Found
- The RELRO check implied that `GNU_RELRO` alone identified the RELRO status. I changed the example to explain that `GNU_RELRO` indicates at least partial RELRO and added a `readelf -d` check for `BIND_NOW` / `FLAGS.*NOW`, which is needed for full RELRO.
- The ASLR entropy section described `vm.mmap_rnd_bits` as "should be 28". I changed this to note that higher values mean more randomization and supported values vary by architecture.
- The ASLR entropy section described `vm.mmap_rnd_compat_bits` as stack randomization entropy. I corrected it to mmap randomization entropy for 32-bit compatibility-mode processes.
- The `kernel.perf_event_paranoid` comment said it hides kernel pointers in `/proc` and `/sys`. I corrected it to describe restricting unprivileged perf events, which can expose kernel addresses or data.
- The container section said containers could disable ASLR for their namespace with `--security-opt systctl=kernel.randomize_va_space=0`. This was both a typo and technically incorrect because `kernel.randomize_va_space` is a node-level sysctl, not a Docker namespaced sysctl. I changed it to say containers cannot change it with Docker `--sysctl` and should only disable ASLR per process with `setarch -R` where permitted.

## Review Notes
The C ASLR demonstration compiles and runs successfully with GCC. Some examples depend on packages or paths being present, such as `/usr/sbin/sshd`, `checksec`, and Docker, but the commands and concepts are valid for Ubuntu systems with those components installed.
