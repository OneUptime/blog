# Validation Summary: How to Conduct Memory Bandwidth Testing with STREAM on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- DNF package management
- GCC
- OpenMP
- STREAM memory bandwidth benchmark
- numactl and NUMA binding
- lscpu

## Sources Consulted
- STREAM official source code and run rules: https://www.cs.virginia.edu/stream/FTP/Code/stream.c and https://www.cs.virginia.edu/stream/ref.html
- Red Hat Enterprise Linux 9 DNF documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool
- GCC OpenMP documentation: https://gcc.gnu.org/onlinedocs/gcc/OpenMP.html
- GCC x86 options documentation for -march=native: https://gcc.sourceware.org/onlinedocs/gcc-14.1.0/gcc/x86-Options.html
- lscpu manual page: https://man7.org/linux/man-pages/man1/lscpu.1.html
- numactl manual page: https://linuxman7.org/linux/man-pages/man8/numactl.8.html
- Red Hat Performance Tuning Guide numactl reference: https://docs.redhat.com/de/documentation/red_hat_enterprise_linux/7/html/performance_tuning_guide/sect-red_hat_enterprise_linux-performance_tuning_guide-tool_reference-numactl

## Issues Found
- The download command used `wget`, but the setup command only installed `gcc`. I changed the package install command to `sudo dnf install -y gcc wget` so the following download command works on minimal RHEL installations.
- The `OMP_NUM_THREADS` command used `lscpu | grep "^Core(s)"`, which returns cores per socket, not total physical cores. I changed it to count unique online `CORE,SOCKET` pairs from `lscpu -p=CORE,SOCKET,ONLINE`, which matches the comment's intent on multi-socket systems.

## Review Notes
The STREAM compile flags, `STREAM_ARRAY_SIZE`/`NTIMES` definitions, OpenMP usage, output explanation, and `numactl --cpunodebind`/`--membind` examples are consistent with the referenced documentation. The selected array size requires roughly 1.9 GB for the three default double arrays, so systems with less available memory should choose a smaller value that still satisfies STREAM's cache-size guidance.
