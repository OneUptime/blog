# Validation Summary: How to Fix 'Bus Error' Errors in Linux

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Linux signals and core dumps
- SIGBUS, memory alignment, and stack limits
- C memory access, mmap, madvise, sigaction, and POSIX file APIs
- GDB, strace, Valgrind, GCC sanitizers
- Linux /proc process inspection
- Hardware diagnostics with memtest86+, smartctl, rasdaemon, and mcelog

## Sources Consulted
- Linux man-pages: mmap(2) - https://man7.org/linux/man-pages/man2/mmap.2.html
- Linux man-pages: madvise(2) - https://man7.org/linux/man-pages/man2/madvise.2.html
- Linux man-pages: strace(1) - https://man7.org/linux/man-pages/man1/strace.1.html
- Linux man-pages: proc_pid_maps(5) - https://man7.org/linux/man-pages/man5/proc_pid_maps.5.html
- Linux man-pages: proc_pid_fd(5) - https://man7.org/linux/man-pages/man5/proc_pid_fd.5.html
- GNU GDB documentation: Registers - https://sourceware.org/gdb/current/onlinedocs/gdb.html/Registers.html
- GCC documentation: Instrumentation Options - https://gcc.gnu.org/onlinedocs/gcc/Instrumentation-Options.html
- Valgrind manual: SGCheck - https://valgrind.org/docs/manual/sg-manual.html
- Valgrind release news noting removal of exp-sgcheck - https://valgrind.org/docs/manual/dist.news.old.html
- rasdaemon project documentation - https://github.com/mchehab/rasdaemon
- mcelog project documentation - https://www.mcelog.org/README.html

## Issues Found
- The mmap section said SIGBUS commonly occurs when a mapped file is "removed." I changed this to truncation, because unlinking a file does not by itself invalidate an existing mapping, while accessing pages beyond the current end of the mapped file can generate SIGBUS.
- The mmap example lacked open/mmap error checks and claimed any offset beyond file size would cause SIGBUS. I added error handling and clarified that Linux SIGBUS applies to pages beyond the current end of the mapped file; bytes in a partial final page have special handling.
- The strace command used `trace=memory`, which current strace documents as deprecated syntax. I changed it to `trace=%memory`.
- The SIGBUS mmap handler reused a global flag across calls and had an unused signal parameter. I reset the flag at function entry and explicitly marked the parameter used.
- The madvise example ignored return values. I added checks because madvise returns -1 with errno set on failure.
- After adding madvise error checks, I added the missing `<stdio.h>` include required for `perror`.
- The hardware diagnostics section treated mcelog as the default modern option. I added rasdaemon as the preferred option on many current distributions while retaining mcelog for supported systems.
- The memtest86+ command implied it could generally be run directly from a normal Linux shell. I changed it to install the tool and reboot so the test can be selected from the boot menu.
- The Valgrind section recommended `--tool=exp-sgcheck`, which has been removed from modern Valgrind releases. I replaced it with GCC UndefinedBehaviorSanitizer guidance for alignment-related undefined behavior.
- The sanitizer example mentioned only AddressSanitizer. I updated it to use `-fsanitize=address,undefined` because GCC documents alignment checks under undefined behavior sanitization.

## Review Notes
The post is technically useful after the fixes. The SIGBUS signal-handler example remains a defensive demonstration rather than a complete production recovery pattern; production mmap readers should still prefer preventing concurrent truncation, validating file sizes, and using application-level coordination where possible.
