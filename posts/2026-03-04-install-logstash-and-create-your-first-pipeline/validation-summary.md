# Validation Summary: How to Install Logstash on RHEL and Create Your First Pipeline

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- DNF/YUM RPM package management
- Logstash
- Elastic RPM repositories
- systemd
- firewalld

## Sources Consulted
- Elastic Logstash installation documentation: https://www.elastic.co/docs/reference/logstash/installing-logstash
- Elastic Logstash directory layout documentation: https://www.elastic.co/docs/reference/logstash/dir-layout
- Elastic Logstash pipeline creation documentation: https://www.elastic.co/docs/reference/logstash/creating-logstash-pipeline
- Elastic Logstash command-line documentation: https://www.elastic.co/docs/reference/logstash/running-logstash-command-line
- Elastic Logstash service documentation: https://www.elastic.co/docs/reference/logstash/running-logstash
- Elastic Logstash file input plugin documentation: https://www.elastic.co/guide/en/logstash/current/plugins-inputs-file.html
- Elastic Logstash file output plugin documentation: https://www.elastic.co/guide/en/logstash/current/plugins-outputs-file.html
- Red Hat DNF documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/managing_software_with_the_dnf_tool/index

## Issues Found
- The original installation steps used generic placeholders such as `<package-name>` and `<service>`, which would not install or manage Logstash. Replaced them with the official Elastic RPM repository setup, `dnf install logstash`, and the `logstash` systemd service name.
- The original dependency step installed `epel-release` and `"Development Tools"`, which are not required for installing Logstash from Elastic's RPM repository and can be incorrect on standard RHEL systems. Replaced this with Elastic's GPG key import and repository file configuration.
- The original configuration path `/etc/<service>/config.conf` was not valid for RPM-installed Logstash. Replaced it with `/etc/logstash/conf.d/first-pipeline.conf`, matching Elastic's RPM directory layout.
- The original verification command `sudo <service> --test` was not a valid Logstash syntax check. Replaced it with `/usr/share/logstash/bin/logstash --path.settings /etc/logstash -f /etc/logstash/conf.d/first-pipeline.conf --config.test_and_exit`.
- The original firewall example used `--add-service=<service>`, but Logstash does not provide a generic firewalld service name. Updated the section to state that the sample local-file pipeline needs no firewall rule and provided `--add-port=5000/tcp` as the correct pattern for a later TCP input.
- The original process monitoring commands referenced a placeholder service process. Updated them to use the `logstash` systemd unit and a Java process match for the running Logstash instance.

## Review Notes
The post is now accurate as a basic RHEL Logstash installation and first-pipeline tutorial. The sample pipeline writes to local files for simple validation; a production pipeline would usually send events to Elasticsearch, OpenSearch, Kafka, or another durable output and should use persistent sincedb state instead of `/dev/null`.
