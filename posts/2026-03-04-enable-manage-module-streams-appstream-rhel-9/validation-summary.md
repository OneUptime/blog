# Validation Summary: How to Enable and Manage Module Streams in AppStream on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- AppStream
- DNF module commands
- Module streams and profiles
- PHP module streams
- Node.js module streams

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing versions of Application Stream content: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_managing-versions-of-application-stream-content_managing-software-with-the-dnf-tool
- Red Hat Enterprise Linux 9 documentation: Installing RHEL 9 content: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_installing-rhel-9-content_managing-software-with-the-dnf-tool
- Red Hat Enterprise Linux 9 documentation: Listing available modules and their contents: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_searching-for-rhel-9-content_managing-software-with-the-dnf-tool
- DNF Command Reference: https://dnf.readthedocs.io/en/stable/command_ref.html
- Red Hat Enterprise Linux 9 documentation: Installing and using dynamic programming languages: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/installing_and_using_dynamic_programming_languages/index
- Red Hat Enterprise Linux Application Streams Life Cycle: https://access.redhat.com/support/policy/updates/rhel-app-streams-life-cycle

## Issues Found
- The introduction implied that module streams let different versions of the same software run side by side. Updated it to clarify that different streams are used on different systems across a fleet, because only one stream of a given module can be active on a system at a time.
- The Node.js profile diagram used `devel`, but Red Hat's RHEL 9 examples list the Node.js development profile as `development`. Updated the diagram labels.
- The `dnf module info --profile php:8.2` comment claimed it listed the `common` profile specifically. Updated the wording because the command displays profile package information for the matching module stream.
- The "Why Enable Before Install?" section said that without enabling a stream, DNF uses the default stream. Updated this for RHEL 9, where Red Hat documents that no default module streams are predefined in AppStream.
- The stream-switching workflow used `reset`, `enable`, and `distro-sync`. Replaced it with Red Hat's documented `dnf module switch-to <module:stream>` workflow.
- The module removal examples said they removed the `nodejs:20/common` profile but used `dnf module remove nodejs:20`. Updated the examples to use `dnf module remove nodejs:20/common`.
- The dependency troubleshooting example used `dnf module info --profile` to check dependencies. Updated it to `dnf module info php:8.2`, which displays module metadata including requirements.
- The conflict-resolution example used `dnf distro-sync --allowerasing` after a stream switch. Updated it to apply `--allowerasing` to the documented `dnf module switch-to` command.
- The tips section described `dnf module list --installed` as showing active streams. Updated it to say it shows installed module profiles.

## Review Notes
- RHEL 9 currently documents PHP as available through the `php` RPM package for PHP 8.0 and through the `php:8.1` and `php:8.2` module streams. The Red Hat Application Streams lifecycle page also lists PHP 8.3 for RHEL 9.6, so future refreshes could mention newer streams if the post scope expands.
- The local review environment does not have `dnf` installed, so CLI behavior was verified against Red Hat documentation and the upstream DNF command reference rather than local `dnf --help` output.
