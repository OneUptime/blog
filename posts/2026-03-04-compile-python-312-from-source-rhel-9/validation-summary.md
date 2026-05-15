# Validation Summary: How to Compile Python 3.12 from Source on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- DNF
- CPython 3.12 source builds
- GNU Make
- GnuPG/OpenPGP release verification
- Linux dynamic linker configuration
- Python virtual environments

## Sources Consulted
- Python 3.12 documentation: Using Python on Unix platforms - https://docs.python.org/3.12/using/unix.html
- Python 3.12 documentation: Configure Python - https://docs.python.org/3.12/using/configure.html
- Python.org OpenPGP Verification - https://www.python.org/downloads/metadata/pgp/
- Red Hat Enterprise Linux 9 documentation: Managing software with the DNF tool - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/
- Red Hat Enterprise Linux 9 documentation: Developing C and C++ applications in RHEL 9 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/developing_c_and_cpp_applications_in_rhel_9/
- GNU Make command help output for `-j` / `--jobs`
- GnuPG command version/help output

## Issues Found
- The download verification step only downloaded the detached `.asc` signature and did not verify it. Added `gnupg2` to the dependency list and added `gpg --recv-keys` plus `gpg --verify` commands using the Python 3.12 release signing key listed by Python.org.
- The `./configure` example used `--with-system-ffi`, which is not listed as a Python 3.12 configure option in the official Python 3.12 configure documentation. Removed the unsupported flag.
- The build comment said bare `make -j` uses all cores, but GNU Make documents `-j` without an argument as allowing unlimited jobs. Updated the comment to describe the actual `make -j "$(nproc)"` command.
- The Mermaid build-flow diagram showed source download before dependency installation, while the tutorial performs dependency installation first. Updated the diagram to match the documented sequence.
- After adding the detached signature download, the cleanup section did not remove the `.tgz.asc` file. Added cleanup for the signature file.

## Review Notes
The remaining commands and claims are technically consistent with the referenced documentation. `make altinstall` is correctly recommended because the Python Unix documentation warns that `make install` can overwrite or masquerade the `python3` binary. The selected `PYTHON_VERSION=3.12.4` is an older Python 3.12 patch release, so future maintenance could update the example to the latest 3.12.x patch release if the post is meant to stay current.
