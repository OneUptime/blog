# Validation Summary: How to Migrate from CentOS 7 to RHEL Using the Convert2RHEL Tool

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- CentOS 7
- Red Hat Enterprise Linux 7
- Convert2RHEL
- Red Hat Subscription Manager
- yum repositories
- EPEL
- Leapp

## Sources Consulted
- Red Hat documentation: Converting from a Linux distribution to RHEL using the Convert2RHEL utility: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/converting_from_a_linux_distribution_to_rhel_using_the_convert2rhel_utility/index
- Convert2RHEL upstream man page: https://github.com/oamg/convert2rhel/blob/main/man/convert2rhel.8
- Red Hat RHEL 7 end of maintenance and ELS information: https://www.redhat.com/en/technologies/linux-platforms/enterprise-linux/rhel-7-end-of-maintenance
- Fedora EPEL package information: https://packages.fedoraproject.org/pkgs/epel-release/epel-release
- Fedora EPEL 7 archive: https://archive.fedoraproject.org/pub/archive/epel/7/

## Issues Found
- The prerequisite update command did not account for CentOS 7 mirrorlist URLs being retired after EOL. Added the Red Hat-documented `sed` commands to point CentOS repository base URLs at `vault.centos.org` before running `yum update`.
- The Convert2RHEL repository URL used the older `ftp.redhat.com` path instead of Red Hat's current documented `cdn-public.redhat.com` repository file for RHEL 7 conversions. Updated the URL and added the documented Red Hat GPG key download step.
- The credentials section used `convert2rhel` commands as if they only prepared credentials. Updated it to use `/etc/convert2rhel.ini` with `org` and `activation_key`, matching Red Hat's current documented flow and avoiding activation-key exposure in process listings.
- The conversion section skipped the documented pre-conversion analysis. Added `convert2rhel analyze` before the conversion command.
- The conversion command examples passed activation keys directly on the command line. Updated them to rely on the configuration file and added the `--els` variant for RHEL 7 systems with an Extended Life Cycle Support add-on.
- The EPEL 7 install URL returned 404 because EPEL 7 has been archived. Updated the example to use the Fedora archive URL for `epel-release-7-14.noarch.rpm` and noted that archived EPEL 7 content should be re-enabled only when still needed.
- The final support statement said RHEL 7 enters Maintenance Support. As of 2026, RHEL 7 is in Extended Life Cycle Support, so the text was corrected.

## Review Notes
The guide is technically relevant and salvageable. RHEL 7 conversion remains version-specific: systems that must stay on RHEL 7 should have appropriate ELS coverage, while most users should plan a follow-up Leapp upgrade to RHEL 8 or 9.
