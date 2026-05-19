# Validation Summary: How to Conduct Disk Forensics with Autopsy on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Autopsy
- The Sleuth Kit
- Java 17 / OpenJDK
- Linux command-line hashing utilities
- Digital forensics disk-image workflows

## Sources Consulted
- Autopsy official download page: https://www.autopsy.com/download/
- Autopsy 4.21.0 installation documentation: https://www.sleuthkit.org/autopsy/docs/user-docs/4.21.0/installation_page.html
- Autopsy Linux/macOS upstream installation guide: https://github.com/sleuthkit/autopsy/blob/develop/Running_Linux_OSX.md
- Autopsy install helper script: https://raw.githubusercontent.com/sleuthkit/autopsy/develop/linux_macos_install_scripts/install_application.sh
- The Sleuth Kit source-build helper script: https://raw.githubusercontent.com/sleuthkit/autopsy/develop/linux_macos_install_scripts/install_tsk_from_src.sh
- Autopsy prerequisites script for Ubuntu: https://raw.githubusercontent.com/sleuthkit/autopsy/develop/linux_macos_install_scripts/install_prereqs_ubuntu.sh
- Autopsy GitHub releases: https://github.com/sleuthkit/autopsy/releases
- The Sleuth Kit GitHub releases: https://github.com/sleuthkit/sleuthkit/releases
- Ubuntu Launchpad package page for autopsy in Ubuntu 24.04: https://launchpad.net/ubuntu/noble/+package/autopsy
- Autopsy cases documentation: https://www.sleuthkit.org/autopsy/docs/user-docs/4.21.0/cases_page.html
- Autopsy data sources documentation: https://www.sleuthkit.org/autopsy/docs/user-docs/4.2/ds_page.html
- Autopsy hash lookup documentation: https://www.sleuthkit.org/autopsy/docs/user-docs/4.22.0/hash_db_page.html
- Autopsy reporting documentation: https://sleuthkit.org/autopsy/docs/user-docs/4.11.0/reporting_page.html
- Autopsy timeline documentation: https://www.sleuthkit.org/autopsy/docs/user-docs/4.21.0/timeline_page.html
- GNU coreutils local man pages for `md5sum` and `sha256sum`

## Issues Found
- The post described official Autopsy packages as targeting Windows and macOS. The official download page provides a Windows installer and Linux/macOS ZIP file, so the wording was corrected.
- The post said Ubuntu repository Autopsy is often 3.x. Ubuntu 24.04 packages Autopsy 2.24, so the repository-version description was corrected to older 2.x web interface.
- The post used `default-jdk` for Java 17. On current Ubuntu, `default-jdk` may install a newer Java version, so the command was changed to `openjdk-17-jdk`.
- The manual Autopsy 4.x installation flow omitted upstream Linux helper-script guidance and the need for The Sleuth Kit Java bindings. The commands were updated to install the bindings with the upstream source-build helper and to match current release naming.
- The post hardcoded Autopsy 4.21.0 as the latest release. As of this review date, the latest GitHub release is 4.23.1, so the example was updated.
- The file-browser and deleted-file recovery language overstated that all deleted files are visible and automatically recoverable. The wording was corrected to note that deleted entries depend on available file-system metadata and recovery depends on overwritten content.
- The keyword-search steps implied a direct "Tools" > "Run Ingest Modules" > "Keyword Search" menu path. The post now describes enabling or rerunning the Keyword Search ingest module and configuring keyword lists.
- The report-generation navigation was imprecise. It was corrected to "Tools" > "Generate Report" or the toolbar button.

## Review Notes
- The remaining workflow guidance is broadly accurate for a basic Autopsy investigation. Linux/macOS support has upstream caveats: the official Linux/macOS guide notes that not all current Autopsy features are functional on Linux/macOS.
- The post still uses MD5 alongside SHA-256 for forensic identification. That is common in forensic tooling and Autopsy hash-set lookup is MD5-oriented, but SHA-256 should remain the stronger integrity hash for modern documentation.
