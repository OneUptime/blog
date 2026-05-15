# Validation Summary: How to Deploy InSpec Compliance Profiles for RHEL

## Status
not-technically-relevant

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- systemd services
- journalctl
- Chef InSpec compliance profiles

## Sources Consulted
- Chef InSpec install documentation: https://docs.chef.io/inspec/7.1/install/
- Chef InSpec profiles documentation: https://docs.chef.io/inspec/6.8/profiles/
- Chef InSpec CLI documentation: https://docs.chef.io/inspec/6.8/reference/cli/
- Red Hat Enterprise Linux 9 system service documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-system-services-with-systemctl_configuring-basic-system-settings

## Issues Found
- The post title and description claim to explain how to deploy InSpec compliance profiles on RHEL, but the body contains only generic systemd service placeholder commands.
- The post does not include the required InSpec workflow, such as installing Chef InSpec, obtaining or authoring a profile, validating a profile, or running `inspec exec`.
- The commands use unresolved placeholders such as `/etc/<service>/config.conf` and `<service-name>`, which are not meaningful for Chef InSpec profile deployment.
- The service configuration, enable, start, and restart instructions are not applicable to InSpec compliance profiles as described in the official InSpec documentation.
- Because the content is a generic placeholder and does not provide a salvageable InSpec deployment procedure without a full rewrite, the post was classified as not technically relevant.

## Review Notes
Generic `systemctl` and `journalctl` usage is broadly valid on RHEL 9, but it does not support the article's stated topic. A future replacement article should use the official Chef InSpec installation and CLI workflow for RHEL, including concrete profile paths or URLs and `inspec exec` examples.
