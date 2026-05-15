# Validation Summary: How to Use Application Streams and Module Streams on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Application Streams
- Module streams
- DNF module commands
- Node.js, PHP, PostgreSQL, and Python packages on RHEL

## Sources Consulted
- Red Hat Enterprise Linux 9: Managing software with the DNF tool - Managing versions of Application Stream content: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_managing-versions-of-application-stream-content_managing-software-with-the-dnf-tool
- Red Hat Enterprise Linux 9: Managing software with the DNF tool - Installing modular content and command reference examples: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool
- DNF Command Reference - Module command: https://dnf.readthedocs.io/en/stable/command_ref.html#module-command
- Red Hat Enterprise Linux 9: Installing and using dynamic programming languages - Python versions: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/installing_and_using_dynamic_programming_languages/index
- Red Hat Enterprise Linux 9: Configuring and using database servers - PostgreSQL installation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/configuring_and_using_database_servers/using-postgresql_configuring-and-using-database-servers
- Red Hat Enterprise Linux Application Streams Life Cycle: https://access.redhat.com/support/policy/updates/rhel-app-streams-life-cycle

## Issues Found
- RHEL 9 default stream behavior was inaccurate. The post implied that RHEL 9 AppStream has default module streams and that a plain `dnf install nodejs` enables the default stream. Red Hat documents that RHEL 9 does not define default module streams by default and that initial Application Stream versions are provided as regular RPMs. Updated the default-stream definition and the default install section.
- Node.js and PHP examples used retired or soon-outdated streams. Replaced Node.js 18/20 examples with Node.js 22/24 and PHP 8.1/8.2 diagram examples with PHP 8.2/8.3 based on the RHEL Application Streams life cycle.
- Stream switching guidance used the older reset/enable/distro-sync workflow and claimed direct switching was impossible without resetting first. RHEL 9 documentation recommends `dnf module switch-to <module:stream>`. Updated the commands, explanation, and summary to use `switch-to`.
- Module removal wording was too broad. `dnf module remove` removes installed profiles and their packages, while `dnf module remove --all` removes all packages whose names are provided by a specified stream. Updated the example and comments.
- Python version discovery used `dnf module list python*`, but additional Python versions in RHEL 9 are non-modular RPM package suites. Updated the example to list and install Python RPM packages.
- The troubleshooting section described `dnf module list --installed` as listing installed modular packages. DNF documents that it lists module streams with installed profiles. Updated the heading and description.

## Review Notes
The local environment did not include `dnf`, so command behavior was verified against official Red Hat and DNF documentation rather than local execution. The post is technically relevant and remains valid after the corrections.
