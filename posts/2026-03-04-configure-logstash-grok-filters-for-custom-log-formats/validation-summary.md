# Validation Summary: How to Configure Logstash Grok Filters for Custom Log Formats on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Logstash
- Grok filter plugin
- Elastic YUM/RPM package repository
- systemd
- firewalld

## Sources Consulted
- Elastic Logstash installation documentation: https://www.elastic.co/docs/reference/logstash/installing-logstash
- Elastic Logstash directory layout documentation: https://www.elastic.co/docs/reference/logstash/dir-layout
- Elastic Logstash service documentation for Debian/RPM packages: https://www.elastic.co/docs/reference/logstash/running-logstash
- Elastic Logstash command-line documentation: https://www.elastic.co/docs/reference/logstash/running-logstash-command-line
- Elastic Grok filter plugin documentation: https://www.elastic.co/docs/reference/logstash/plugins/plugins-filters-grok
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The original dependency installation commands installed EPEL and Development Tools, which are not required for installing Logstash from Elastic's RPM repository. Replaced them with Elastic's official signing key import and YUM repository configuration.
- The original package installation commands used `<package-name>` placeholders. Replaced them with `logstash` and added the official Logstash binary version check.
- The original configuration path `/etc/<service>/config.conf` was not valid for RPM-installed Logstash pipeline configuration. Replaced it with `/etc/logstash/conf.d/custom-grok.conf`.
- The original post did not include an actual Grok filter despite the title and description. Added a minimal valid Logstash pipeline using the file input, Grok filter, and stdout output.
- The original systemd commands used `<service>` placeholders. Replaced them with the `logstash` service name.
- The original test command `sudo <service> --test` was not a valid Logstash validation command. Replaced it with `logstash --config.test_and_exit` using the RPM package settings path.
- The original firewall command used `--add-service=<service>`, but firewalld does not provide a built-in Logstash service. Replaced it with `--add-port=5044/tcp` for the common Beats input port when network input is configured.
- The original performance command used `pidof <service>`, which would not reliably identify the Java-based Logstash process. Replaced it with the systemd `MainPID` for the `logstash` service.

## Review Notes
- The `--config.test_and_exit` flag validates Logstash configuration syntax, but Elastic notes that it does not fully validate Grok pattern correctness. A future improvement could add a short stdin-based local parse test to demonstrate expected parsed fields.
