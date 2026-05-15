# Validation Summary: How to Install SWIG and Build Python C Extensions on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- DNF
- CodeReady Linux Builder repository
- SWIG
- Python 3
- Python C extensions
- setuptools

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Installing and using dynamic programming languages, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/installing_and_using_dynamic_programming_languages/index
- Red Hat Enterprise Linux 9 documentation: Managing software with the DNF tool, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/index
- Red Hat Enterprise Linux 9 documentation: Developing C and C++ applications in RHEL 9, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/developing_c_and_cpp_applications_in_rhel_9/developing_c_and_cpp_applications_in_rhel_9
- Red Hat Enterprise Linux 9 Package manifest, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/package_manifest/index
- SWIG 4.3 Python documentation, https://www.swig.org/Doc4.3/Python.html
- Python documentation: Building C and C++ Extensions, https://docs.python.org/3/extending/building.html
- setuptools documentation: Building Extension Modules, https://setuptools.pypa.io/en/stable/userguide/ext_modules.html

## Issues Found
- The original post used placeholder package names such as `<package-name>`, which would not install SWIG or Python development headers. Replaced them with `swig`, `python3-devel`, and `python3-setuptools`.
- The original post recommended installing `epel-release`, but SWIG is available through RHEL content, and the RHEL 9 package manifest places SWIG in CodeReady Linux Builder. Replaced this with a `subscription-manager repos --enable codeready-builder-for-rhel-9-$(arch)-rpms` command.
- The original post treated SWIG as a systemd service, including service configuration, startup, logging, firewall, and process monitoring commands. SWIG is a build tool, not a daemon. Replaced those sections with source files, a SWIG interface file, a setuptools build, verification, and generated-file checks.
- The original verification command used `sudo <service> --test`, which is not applicable to SWIG. Replaced it with a Python import test that calls the compiled extension function.
- The original troubleshooting section described service startup, SELinux service permissions, and port conflicts. Replaced it with SWIG and Python extension build issues such as missing `Python.h`, missing `swig`, and import errors.

## Review Notes
The corrected post targets RHEL 9 specifically because the repository names and default Python packaging behavior are version-specific. The example uses `setup.py build_ext --inplace` for a simple local build; a future packaging-focused article could cover modern `pyproject.toml` builds and wheel generation.
