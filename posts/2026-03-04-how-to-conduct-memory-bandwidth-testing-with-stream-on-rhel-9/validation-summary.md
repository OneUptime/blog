# Validation Summary: How to Conduct Memory Bandwidth Testing with STREAM on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- DNF package management
- GCC
- OpenMP
- STREAM benchmark
- numactl and NUMA CPU/memory binding

## Sources Consulted
- STREAM official site: https://www.cs.virginia.edu/stream/
- STREAM reference information: https://www.cs.virginia.edu/stream/ref.html
- STREAM source code: https://www.cs.virginia.edu/stream/FTP/Code/stream.c
- Red Hat Enterprise Linux 9 DNF package installation documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_installing-rhel-9-content_managing-software-with-the-dnf-tool
- Red Hat Enterprise Linux 9 C/C++ development documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/developing_c_and_cpp_applications_in_rhel_9/developing_c_and_cpp_applications_in_rhel_9
- Local `numactl` manual page and `numactl` usage output
- Local GCC and curl command-line behavior

## Issues Found
- The guide used `numactl` in the NUMA-aware testing section but only installed `gcc`. I changed the package installation command to `sudo dnf install -y gcc numactl` so the NUMA commands have the required CLI available on RHEL 9 systems.

## Review Notes
The STREAM source URL is valid, the GCC command compiles the current STREAM C source with OpenMP support, and the `STREAM_ARRAY_SIZE` and `NTIMES` preprocessor overrides are supported by the official source. The benchmark output reports `Best Rate MB/s` for Copy, Scale, Add, and Triad as described. The NUMA examples are valid for systems with NUMA nodes 0 and 1; on single-node systems or systems with different node numbering, users should first check available nodes with `numactl --hardware`.
