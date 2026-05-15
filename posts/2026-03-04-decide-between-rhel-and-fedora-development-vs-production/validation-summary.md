# Validation Summary: How to Decide Between RHEL and Fedora for Development vs Production Use

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Fedora Linux
- Red Hat Enterprise Linux
- CentOS Stream
- DNF
- Python on RHEL
- GCC
- Node.js
- Podman
- RHEL UBI containers
- Fedora Toolbox

## Sources Consulted
- Fedora Docs: Fedora Linux Releases - https://docs.fedoraproject.org/en-US/releases/
- Fedora Docs: Fedora and Red Hat Enterprise Linux - https://docs.fedoraproject.org/en-US/quick-docs/fedora-and-red-hat-enterprise-linux/
- Fedora Docs: Toolbx - https://docs.fedoraproject.org/en-US/fedora-silverblue/toolbox/
- Fedora Packages: gcc package versions - https://packages.fedoraproject.org/pkgs/gcc/gcc/
- Fedora Packages: python3 package versions - https://packages.fedoraproject.org/pkgs/python3.14/python3/
- Fedora Packages: nodejs24 package versions - https://packages.fedoraproject.org/pkgs/nodejs24/nodejs24/
- Red Hat Documentation: Installing and using Python on RHEL 9 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/installing_and_using_dynamic_programming_languages/
- Red Hat Documentation: Managing software with DNF on RHEL 9 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/
- Red Hat Customer Portal: Red Hat Enterprise Linux Life Cycle - https://access.redhat.com/support/policy/updates/errata
- Red Hat Ecosystem Catalog: Red Hat Universal Base Image 9 - https://catalog.redhat.com/software/containers/ubi9/ubi

## Issues Found
- The post described Fedora as feeding directly into RHEL and said RHEL branches from Fedora. Updated this to include CentOS Stream as the intermediate upstream for modern RHEL releases, and clarified that CentOS Stream 9 was based on Fedora 34.
- The Fedora version and package examples used Fedora 41-era versions. Updated the examples to Fedora 44-era values for GCC, Python, and Node.js.
- The RHEL Python example used `dnf module enable python3.12`, but Red Hat documents Python 3.12 on RHEL 9.4 and later as a non-modular RPM package installed with `dnf install python3.12`. Removed the module commands and added the RHEL 9.4 caveat.
- The Fedora lifecycle command installed `fedora-release-identity-basic`, which does not check whether a release is supported. Replaced it with checking `/etc/fedora-release` and comparing the release number against Fedora's supported releases.

## Review Notes
The RHEL UBI, Podman, `subscription-manager facts`, and Toolbox examples are technically plausible. The article uses illustrative version commands, so future reviews should refresh Fedora package examples as Fedora 45 and later releases become current.
