# Validation Summary: How to Perform Filesystem Benchmarks with bonnie++ on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL
- EPEL
- bonnie++
- bon_csv2html
- Filesystem benchmarking

## Sources Consulted
- bonnie++ manual page: https://manpages.debian.org/trixie/bonnie%2B%2B/bonnie%2B%2B.8.en.html
- bon_csv2html manual page: https://manpages.debian.org/unstable/bonnie%2B%2B/bon_csv2html.1.en.html
- Bonnie++ upstream readme from Debian source package: https://sources.debian.org/src/bonnie%2B%2B/2.00a%2Bnmu3/readme.html
- Fedora EPEL package listing for bonnie++ on EPEL 8: https://packages.fedoraproject.org/pkgs/bonnie%2B%2B/bonnie%2B%2B/epel-8.html
- Fedora EPEL FAQ: https://fedoraproject.org/wiki/EPEL/FAQ

## Issues Found
- The EPEL install command used `sudo dnf install -y epel-release`, which is not the normal direct install path for RHEL systems without EPEL already configured. Changed it to install the EPEL release RPM from Fedora and added a note to replace `9` with the target RHEL major version.
- The `-n` explanation described the value as the number of files. The bonnie++ manual defines it as the number of 1024-file groups. Updated the comment to avoid understating the metadata test size.
- The `-b` example was introduced as a block-size test. The bonnie++ manual defines `-b` as no write buffering, implemented with `fsync()` after writes. Updated the comment and explanation.
- The CSV report examples redirected `stderr` into the CSV files. Bonnie++ documents `-q` as the mode that keeps CSV on stdout and human-readable output on stderr. Updated the report commands to use `-q` and keep CSV files clean for `bon_csv2html`.

## Review Notes
The benchmark guidance to use a test size at least twice system RAM is consistent with bonnie++ behavior and documentation intent for reducing page-cache distortion. For a future improvement, the installation section could include separate RHEL 8, 9, and 10 EPEL setup commands, including CodeReady Builder/CRB enablement where required.
