# Validation Summary: How to Migrate from AlmaLinux to RHEL for Full Red Hat Support

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- AlmaLinux
- Red Hat Enterprise Linux
- Convert2RHEL
- Red Hat Subscription Manager
- Red Hat Insights / Red Hat Lightspeed
- EPEL
- DNF and systemd CLI tools

## Sources Consulted
- Red Hat Documentation: Converting from a Linux distribution to RHEL using the Convert2RHEL utility: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/converting_from_a_linux_distribution_to_rhel_using_the_convert2rhel_utility/index
- Red Hat Documentation: Convert2RHEL command-line conversion procedure: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/converting_from_a_linux_distribution_to_rhel_using_the_convert2rhel_utility/converting-using-the-command-line_converting-from-a-linux-distribution-to-rhel
- AlmaLinux 9.7 Release Notes: https://wiki.almalinux.org/release-notes/9.7.html
- Red Hat Enterprise Linux Release Dates: https://access.redhat.com/articles/red-hat-enterprise-linux-release-dates
- Red Hat Documentation: Client configuration guide for Red Hat Insights / Red Hat Lightspeed: https://docs.redhat.com/en/documentation/red_hat_insights/1-latest/epub/client_configuration_guide_for_red_hat_insights/assembly-insights-cli-options
- Red Hat Documentation: Assessing and monitoring security policy compliance of RHEL systems: https://docs.redhat.com/en/documentation/red_hat_insights/1-latest/epub/assessing_and_monitoring_security_policy_compliance_of_rhel_systems/compliance-viewing-rules_compliance-managing-policies
- Red Hat Blog: How to install EPEL on RHEL and CentOS Stream: https://www.redhat.com/en/blog/install-epel-linux
- AlmaLinux FAQ: https://wiki.almalinux.org/FAQ

## Issues Found
- The example used AlmaLinux 9.3 to RHEL 9.3. Current Red Hat Convert2RHEL documentation lists AlmaLinux 9.7 to RHEL 9.7 as the supported AlmaLinux 9 conversion path, so the example release outputs were updated to 9.7.
- The Convert2RHEL repository URL used `ftp.redhat.com`, but current Red Hat documentation uses `cdn-public.redhat.com/content/public/repofiles/convert2rhel-for-rhel-9-x86_64.repo`. Updated the URL and added the documented Red Hat GPG key download.
- The RHSM credentials were passed directly to `convert2rhel analyze` and `convert2rhel`. Current Red Hat documentation describes configuring `/etc/convert2rhel.ini` with the organization ID and activation key before running `convert2rhel analyze` and `convert2rhel`, so the commands were updated.
- The EPEL section installed the EPEL release RPM without first enabling CodeReady Linux Builder. Red Hat's EPEL installation guidance for RHEL 9 enables `codeready-builder-for-rhel-9-$(arch)-rpms` first, so that prerequisite was added.
- The closing statement implied all software on the converted host is fully supported. Red Hat documents that third-party packages left unchanged by Convert2RHEL are not supported by Red Hat, so the wording was narrowed to Red Hat support for Red Hat packages.

## Review Notes
- Red Hat documentation recommends verifying supported conversion paths, backing up and testing restore, stopping important data-writing services, disabling antivirus, and checking known limitations before conversion. The post covers the backup/update basics, but a future revision could call out more of those prerequisites explicitly.
- Red Hat Insights compliance scans require supported SCAP Security Guide content and policy assignment in the compliance service before useful compliance results are available.
