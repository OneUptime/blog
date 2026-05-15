# Validation Summary: How to Install GCC and Development Tools on RHEL

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- DNF package management
- GCC and G++
- GCC Toolset / Software Collections
- GNU make
- C and C++17 compilation
- Linux development libraries and kernel headers

## Sources Consulted
- Red Hat documentation, "Developing C and C++ applications in RHEL 9": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/developing_c_and_cpp_applications_in_rhel_9/developing_c_and_cpp_applications_in_rhel_9
- Red Hat documentation, RHEL 9 "Managing software with the DNF tool": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/managing_software_with_the_dnf_tool/Red_Hat_Enterprise_Linux-9-Managing_software_with_the_DNF_tool-en-US.pdf
- Red Hat documentation, RHEL 9.5 release notes for GCC Toolset 14: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/9.5_release_notes/9.5_release_notes
- DNF command reference: https://dnf.readthedocs.io/en/stable/command_ref.html
- GCC online documentation, option summary and warning options: https://gcc.gnu.org/onlinedocs/gcc/Option-Summary.html and https://gcc.gnu.org/onlinedocs/gcc/Warning-Options.html
- GCC online documentation, developer options for `-dumpversion` and `-dumpmachine`: https://gcc.gnu.org/onlinedocs/gcc-13.1.0/gcc/Developer-Options.html
- GNU make manual: https://www.gnu.org/software/make/manual/make.html
- C++ standard library reference for `std::make_pair` header requirements: https://en.cppreference.com/w/cpp/utility/pair/make_pair

## Issues Found
- The Development Tools installation command used `dnf groupinstall`. Red Hat documents the supported form as `dnf group install`, so the command was updated to `sudo dnf group install -y "Development Tools"`.
- The C++ example used `std::make_pair` without including `<utility>`. Some compilers may accept this through transitive includes, but the function is declared in `<utility>`, so `#include <utility>` was added.
- The additional libraries command placed inline comments after line-continuation backslashes. In POSIX shells, that prevents the backslash from escaping the newline and makes the snippet execute incorrectly. The inline package comments were removed so the multi-line `dnf install` command is valid.

## Review Notes
- The core RHEL guidance is consistent with Red Hat documentation: the Development Tools group is the documented way to install GCC, GDB, and related tools for C/C++ development.
- GCC Toolset 13 remains a valid documented example for RHEL 9, but current RHEL 9 documentation also covers GCC Toolset 14, introduced with RHEL 9.5. A future content refresh could mention GCC Toolset 14 as the newer option where available.
- The C and C++ examples were compiled locally after the header fix, and the shell syntax of the corrected multi-line package installation command was checked.
