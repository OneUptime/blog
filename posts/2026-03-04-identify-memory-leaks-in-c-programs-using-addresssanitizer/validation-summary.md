# Validation Summary: How to Identify Memory Leaks in C Programs Using AddressSanitizer on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- GCC
- AddressSanitizer
- LeakSanitizer
- C
- Linux command line

## Sources Consulted
- GCC instrumentation options: https://gcc.gnu.org/onlinedocs/gcc/Instrumentation-Options.html
- Clang AddressSanitizer documentation: https://clang.llvm.org/docs/AddressSanitizer.html
- Red Hat Enterprise Linux 9 Developing C and C++ applications documentation: https://docs.redhat.com/en-us/documentation/red_hat_enterprise_linux/9/html/developing_c_and_cpp_applications_in_rhel_9/
- Red Hat Developer, "Compare tools for C and C++ error checking": https://developers.redhat.com/blog/2021/05/05/memory-error-checking-in-c-and-c-comparing-sanitizers-and-valgrind
- Local GCC 13.3.0 command verification for `-fsanitize=address`, `-fsanitize=leak`, and LeakSanitizer output.

## Issues Found
- The introduction said AddressSanitizer detects memory leaks directly. Updated it to distinguish AddressSanitizer from LeakSanitizer, which is the leak detector used with ASan.
- The introduction said no additional software was needed on RHEL. Updated it because GCC or Clang compiler packages must be installed if they are not already present.
- The main section was titled "Configure the Service" and later sections used `systemctl` and `journalctl` commands for a placeholder service. Replaced those service commands with sanitizer compile, run, verification, and troubleshooting commands because AddressSanitizer is used by building and running an instrumented executable, not by enabling a systemd service.
- Added `-fno-omit-frame-pointer` to the compile commands to improve sanitizer stack traces, consistent with compiler documentation recommendations.
- Clarified leak detection by showing `-fsanitize=address,leak` and `ASAN_OPTIONS=detect_leaks=1`.
- Replaced service-oriented conclusion text with sanitizer-oriented guidance and noted that sanitizer flags are intended for development and diagnostic testing rather than normal production builds.

## Review Notes
The post is now technically accurate as a concise RHEL/GCC sanitizer guide. Future improvements could include a small intentionally leaking C example, but one was not added because the review instructions requested only technical corrections without adding new sections.
