# Validation Summary: How to Trace Library Calls with ltrace on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- ltrace
- dnf
- rpm
- gcc
- C standard library calls

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Monitoring application's library function calls with ltrace": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/developing_c_and_cpp_applications_in_rhel_9/debugging-applications_developing-applications
- Red Hat Enterprise Linux 9 Package Manifest, confirming the `ltrace` package is included: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/pdf/package_manifest/red_hat_enterprise_linux-9-package_manifest-en-us.pdf
- ltrace(1) Linux manual page: https://man7.org/linux/man-pages/man1/ltrace.1.html

## Issues Found
- The original post used `ltrace ls -la /etc` and `ltrace -e malloc+free ls -la /etc`. Red Hat documents a RHEL 9 known issue that prevents `ltrace` from tracing system executable files, so these examples were changed to trace a small user-built executable.
- The original post described enabling, starting, checking, and troubleshooting a service with `systemctl`, but `ltrace` is a command-line tracing tool, not a service. The service commands and service troubleshooting guidance were replaced with tracing and output-review guidance.
- The original verification command checked unrelated debugging packages with `rpm -q gdb strace ltrace valgrind`. It was narrowed to the packages used by this guide: `ltrace` and `gcc`.

## Review Notes
- The `ltrace -p <PID>` attach example is valid syntax, but attaching to a running process may require appropriate privileges and may be restricted by system security settings.
- `ltrace` was not installed in the local review workspace, so runtime output could not be reproduced locally. Command syntax was verified against the ltrace manual page and RHEL documentation.
