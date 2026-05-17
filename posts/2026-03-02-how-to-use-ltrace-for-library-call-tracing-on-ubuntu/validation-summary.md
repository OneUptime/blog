# Validation Summary: How to Use ltrace for Library Call Tracing on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ltrace (library call tracer)
- strace (system call tracer, for comparison)
- Ubuntu 22.04+ package management (apt)
- glibc resolver functions (getaddrinfo, getnameinfo, res_query)
- OpenSSL library functions (SSL_connect, SSL_read, SSL_write, EVP_*, RSA_*, X509_*, ERR_*)
- libc memory allocation functions (malloc, calloc, realloc, free, mmap, munmap)
- libc string functions (strcmp, strncmp, strcasecmp, strstr, memcmp)
- Dynamic linker / shared libraries (dlopen, dlsym, dlclose)
- c++filt for C++ symbol demangling
- ldd / file utilities for binary inspection

## Sources Consulted
- ltrace man page (Ubuntu) — option flags `-p`, `-o`, `-t`, `-T`, `-c`, `-e`, `-l`, `-f`, `-C`, `-F`/`--config`
- ltrace(1) documentation — output format, globbing semantics for `-e` patterns
- glibc documentation — resolver and string function signatures
- OpenSSL documentation — SSL/TLS API function names
- Go documentation — confirms Go binaries are statically linked by default (CGO_ENABLED=0)
- POSIX/Linux documentation on PLT (Procedure Linkage Table), which is the mechanism ltrace uses to intercept library calls

## Issues Found
No technical issues found.

All flags, output format examples, function names, and behavioral claims are accurate:
- The `-c` summary column order (% time, seconds, usecs/call, calls, function) matches ltrace's actual output, so the `sort -k4 -rn` (by calls) and `sort -k2 -rn` (by seconds) examples are correct.
- The `-C` (demangle) and `--config` (load config file) long options exist in ltrace.
- The caveat that ltrace cannot intercept the dynamic linker's `openat` calls for `.so` loading (and thus needs `strace` for that case) is accurate — the linker bypasses the PLT.
- The claim that Go binaries are essentially untraceable by ltrace is accurate (Go uses its own runtime and direct syscalls, not libc PLT calls).
- The ltrace configuration file syntax sketch (comments with `;`, `return_type function_name(arg_types);`) matches the documented format.

## Review Notes
- A couple of pipeline examples like `ltrace -c curl https://example.com 2>&1 | sort -k4 -rn | head -20` mix curl's HTML stdout with ltrace's summary output (which goes to stderr). In practice this works because the `-c` summary lines have a distinctive numeric format that survives sort, but a cleaner approach would be `ltrace -c -o /tmp/trace curl https://example.com >/dev/null 2>&1 && sort -k4 -rn /tmp/trace | head -20`. Not a technical error — just a usability note.
- The `ltrace -l libcurl.so*` example in the Quick Reference section uses an unquoted shell glob. If there are no matching files in the current directory the shell will pass it through literally (which is what we want), but quoting `'libcurl.so*'` would be more defensive. Other examples in the post correctly quote the pattern.
- `open()` appearing in ltrace output (e.g. the "Understanding ltrace Output" example) is correct only when the binary calls libc's `open` symbol via the PLT — programs that invoke `syscall(SYS_open, ...)` directly will not appear in ltrace. The post addresses this nuance in the "Common Limitations" section.
- ltrace is no longer under very active upstream development; some users on newer glibc versions report intermittent issues tracing certain binaries (especially with PIE and full RELRO). Not a blog content error, but worth noting if a future revision wants to expand the Limitations section.
