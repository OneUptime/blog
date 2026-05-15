# Validation Summary: How to Forward Logs to Elasticsearch or Splunk from RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd-journald
- rsyslog
- firewalld
- Elasticsearch ingestion tools
- Splunk Universal Forwarder and syslog ingestion

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring a remote logging solution": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/assembly_configuring-a-remote-logging-solution_security-hardening
- Red Hat Enterprise Linux 9 documentation, "Configuring basic system settings": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_basic_system_settings/index
- Red Hat Enterprise Linux 9 documentation, "Using and configuring firewalld": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- rsyslog documentation, "Forwarding Logs": https://docs.rsyslog.com/doc/getting_started/forwarding_logs.html
- rsyslog documentation, "omelasticsearch: Elasticsearch Output Module": https://docs.rsyslog.com/doc/configuration/modules/omelasticsearch.html
- Elastic documentation, "Filebeat quick start: installation and configuration": https://www.elastic.co/docs/reference/beats/filebeat/filebeat-installation-configuration
- Splunk documentation, "Install a *nix universal forwarder": https://help.splunk.com/en/splunk-enterprise/forward-and-process-data/universal-forwarder-manual/10.2/install-the-universal-forwarder/install-a-nix-universal-forwarder
- Splunk documentation, "Monitor files and directories": https://docs.splunk.com/Documentation/Splunk/9.4.2/Data/Monitorfilesanddirectories

## Issues Found
- The original post described editing rsyslog and journald configuration files but did not provide a working forwarding configuration for the RHEL 9 host. I added a minimal rsyslog `omfwd` action using TCP, a retry queue, and shutdown persistence, matching Red Hat and rsyslog guidance for remote log forwarding.
- The original post implied rsyslog could forward directly to Elasticsearch or Splunk by only editing local RHEL logging files. I clarified that rsyslog needs a compatible receiving endpoint, such as a Splunk syslog input, Logstash syslog input, or another rsyslog receiver in the ingestion path, while vendor agents are a separate ingestion path.
- The verification step only checked local logs, which does not prove forwarding to Elasticsearch or Splunk. I added a `logger` test message and a note to confirm the event in the receiving pipeline.
- The firewall step did not specify that port opening applies to the receiving syslog listener, not necessarily the RHEL client sending outbound logs. I clarified that the firewall rule should be applied on the receiving server and should match the configured protocol and port.
- The troubleshooting section mentioned target directory permissions without context. I narrowed that note to receivers that write logs to local files and added a check that the receiver is listening on the configured host, port, and protocol.

## Review Notes
The article is now technically accurate for a syslog-forwarding architecture from RHEL 9 into a Splunk or Elasticsearch ingestion path. A future improvement would be to add separate end-to-end examples for Splunk Universal Forwarder and Elastic Agent/Filebeat, because those are the vendor-preferred approaches in many deployments.
