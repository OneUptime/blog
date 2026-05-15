# Validation Summary: How to Install Multiple Python Versions on RHEL Using Software Collections

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Python 3.9, 3.11, and 3.12
- DNF
- AppStream RPM repositories
- Python virtual environments

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Installing and using dynamic programming languages, Python versions and installation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/installing_and_using_dynamic_programming_languages/
- Red Hat Enterprise Linux 9 documentation: Major differences in the Python ecosystem since RHEL 8, including unversioned Python command guidance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/installing_and_using_dynamic_programming_languages/assembly_introduction-to-python_installing-and-using-dynamic-programming-languages
- Red Hat Enterprise Linux 9 documentation: Managing software with the DNF tool, DNF commands list: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/managing_software_with_the_dnf_tool/assembly_distribution-of-content-in-rhel-9_managing-software-with-the-dnf-tool

## Issues Found
- The title, tags, description, and introduction framed the RHEL 9 approach as Software Collections and AppStream modules. Red Hat documents Python 3.11 and Python 3.12 on RHEL 9 as non-modular RPM package suites from AppStream, so the wording was changed to AppStream RPM packages.
- The "Understanding RHEL AppStream Modules" section incorrectly described the additional Python versions as modules. It now describes them as AppStream packages, and the diagram label was updated accordingly.
- The package discovery command used `dnf module list python*`, which is not the right check for these non-modular RHEL 9 Python RPM packages. It was changed to `dnf list --available 'python3*'`.
- The default Python installation command used `dnf install python3`. Current Red Hat documentation lists `python3.9` for installing the RHEL 9 Python 3.9 package suite, so the command and verification example were updated to `python3.9`.
- The Python 3.12 section said "RHEL.4 and later." This typo was corrected to "RHEL 9.4 and later."
- The `alternatives` section recommended registering `/usr/bin/python3` with multiple interpreters. Red Hat recommends explicit versioned commands, virtual environments, or custom symlinks in `/usr/local/bin` or `~/.local/bin` when a different `python` or `python3` command is needed. The section was replaced with explicit command and user-local shortcut guidance.

## Review Notes
- The remaining `dnf install`, `python --version`, `python -m pip`, and `python -m venv` examples are consistent with the Red Hat Python documentation for RHEL 9.
- Red Hat warns against using `pip` as root at the system level. The post's virtual environment guidance is the preferred path for project dependencies.
