# Validation Summary: How to Migrate from Rocky Linux to RHEL Using Convert2RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Rocky Linux
- Convert2RHEL
- Red Hat Subscription Manager
- DNF/YUM repositories
- EPEL

## Sources Consulted
- Red Hat documentation: Converting using the command-line, Convert2RHEL utility: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/converting_from_a_linux_distribution_to_rhel_using_the_convert2rhel_utility/converting-using-the-command-line_converting-from-a-linux-distribution-to-rhel
- Red Hat documentation: Supported conversion paths: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/converting_from_a_linux_distribution_to_rhel_using_the_convert2rhel_utility/con_supported-conversion-paths_converting-from-a-linux-distribution-to-rhel
- Red Hat documentation: Planning a RHEL conversion: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/converting_from_a_linux_distribution_to_rhel_using_the_convert2rhel_utility/con_planning-a-rhel-conversion_converting-from-a-linux-distribution-to-rhel
- Fedora EPEL documentation: Getting started with EPEL: https://docs.fedoraproject.org/en-US/epel/getting-started/
- Red Hat Blog: How to install EPEL on RHEL and CentOS Stream: https://www.redhat.com/en/blog/install-epel-linux

## Issues Found
- The post used an outdated Convert2RHEL repository URL under `ftp.redhat.com`. Updated it to the current Red Hat public CDN repository file URL for RHEL 9 conversions and added the Red Hat release GPG key download step from the official procedure.
- The post passed `--org` and `--activationkey` directly to `convert2rhel analyze` and `convert2rhel`. Current Red Hat documentation configures these values in `/etc/convert2rhel.ini` for RHSM-based conversions, so the commands were updated to use `convert2rhel analyze` and `convert2rhel`.
- The example used Rocky Linux 9.3 to RHEL 9.3. Red Hat's current supported conversion table lists Rocky Linux 9.7 to RHEL 9.7 for RHEL 9 command-line conversions, so the example release output was updated.
- The post advised removing remaining Rocky packages directly. Red Hat documentation notes that third-party or source-distribution-only packages may remain after conversion, so the instruction was changed to review remaining packages before removal.
- The EPEL instructions omitted enabling CodeReady Builder for RHEL 9. Added the `subscription-manager repos --enable codeready-builder-for-rhel-9-$(arch)-rpms` step before installing `epel-release`.
- The post stated that other third-party repositories should work unchanged. This was too broad after conversion to RHEL, so it was changed to reinstall or reconfigure third-party repositories for RHEL where needed.

## Review Notes
The post is now technically aligned with the current Red Hat Convert2RHEL command-line workflow for Rocky Linux 9 to RHEL 9. The exact supported minor versions can change over time, so this post should be rechecked against Red Hat's supported conversion paths table before future publication or reuse.
