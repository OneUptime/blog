# Validation Summary: How to Run Rust Binaries Without Root Using Sandboxing

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Rust
- Linux capabilities
- seccomp BPF
- Landlock LSM
- Linux privilege dropping
- Rust crates: `seccompiler`, `landlock`, `caps`, `nix`, `tokio`, `serde`, `bincode`

## Sources Consulted
- Rust `seccompiler` crate documentation: https://docs.rs/seccompiler
- Rust `landlock` crate documentation: https://landlock.io/rust-landlock/landlock/struct.Ruleset.html
- Rust `landlock` `RulesetCreatedAttr` documentation: https://landlock.io/rust-landlock/landlock/trait.RulesetCreatedAttr.html
- Rust `caps` crate documentation: https://docs.rs/caps
- Linux kernel seccomp BPF documentation: https://docs.kernel.org/userspace-api/seccomp_filter.html
- Linux kernel Landlock documentation: https://docs.kernel.org/userspace-api/landlock.html
- Linux `landlock_restrict_self(2)` manual page: https://man7.org/linux/man-pages/man2/landlock_restrict_self.2.html
- Linux `capabilities(7)` manual page: https://man7.org/linux/man-pages/man7/capabilities.7.html
- Local compile check with the crate versions shown in the post.

## Issues Found
- The dependency snippet omitted crates used by later examples: `libc`, `tokio`, `serde`, and `bincode`. Added these dependencies so the examples resolve.
- The seccomp example returned `BpfMap`, but `SeccompFilter::try_into()` compiles to `BpfProgram` for use with `seccompiler::apply_filter()`. Changed the import and return type to `BpfProgram`.
- The Landlock example used `Ruleset::new()`, which is deprecated in the crate documentation. Changed it to `Ruleset::default()`.
- The Landlock example did not explicitly set `no_new_privs`, which is required for unprivileged `landlock_restrict_self()` unless the process has `CAP_SYS_ADMIN`. Added `set_no_new_privs(true)` for the `landlock 0.3` API used by the post.
- The combined sandbox setup applied seccomp before dropping UID/GID, but the shown seccomp profiles do not allow `setgroups`, `setgid`, or `setuid`. Reordered setup to apply filesystem restrictions, drop privileges, drop capabilities, and apply seccomp last.
- The capability test assumed binding to TCP port 80 always fails after dropping `CAP_NET_BIND_SERVICE`. That can be false on systems where unprivileged low-port binding is enabled. Changed the test to verify the effective capability set directly with `caps::has_cap`.

## Review Notes
The seccomp profiles are intentionally illustrative and may need additional syscalls for specific async runtimes, libc versions, DNS resolution paths, logging backends, and deployment environments. The post now avoids the concrete compile-time and setup-order errors found during validation.
