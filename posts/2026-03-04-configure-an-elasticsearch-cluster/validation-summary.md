# Validation Summary: How to Configure an Elasticsearch Cluster on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Elasticsearch
- Elastic RPM repository
- systemd
- firewalld
- Linux shell commands

## Sources Consulted
- Elastic Docs: Install Elasticsearch with RPM, https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-elasticsearch-with-rpm
- Elastic Docs: Discovery and cluster formation settings, https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-discovery-settings.html
- Elastic Docs: Bootstrapping a cluster, https://www.elastic.co/docs/deploy-manage/distributed-architecture/discovery-cluster-formation/modules-discovery-bootstrap-cluster
- Elastic Docs: Important system configuration, https://www.elastic.co/docs/deploy-manage/deploy/self-managed/important-system-configuration
- Elastic Docs: Increase virtual memory, https://www.elastic.co/docs/deploy-manage/deploy/self-managed/vm-max-map-count
- Red Hat Documentation: Using and configuring firewalld, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters

## Issues Found
- The installation commands used placeholders such as `<package-name>` instead of valid Elasticsearch package installation steps. Replaced them with the official Elastic RPM signing key import, repository definition, `dnf` installation command, and `rpm -qi elasticsearch` verification.
- The service configuration path used `/etc/<service>/config.conf`, which is not an Elasticsearch configuration path. Replaced it with `/etc/elasticsearch/elasticsearch.yml`, first-node settings, the documented enrollment-token commands for additional nodes, and a valid `discovery.seed_hosts` example.
- The systemd commands used `<service>` placeholders. Replaced them with the real `elasticsearch` unit and included `systemctl daemon-reload`.
- The verification command used `sudo <service> --test`, which is not a valid Elasticsearch service test. Replaced it with the documented password reset command and HTTPS `curl` verification using the generated CA certificate.
- The firewall command used `--add-service=<service>`, but Elasticsearch is not a standard predefined firewalld service on RHEL. Replaced it with source-restricted rich rules for TCP ports `9300` and `9200`.
- The performance and troubleshooting commands used generic placeholders. Replaced them with Elasticsearch-relevant commands for systemd memory, the Elasticsearch JVM process, `vm.max_map_count`, log files, and ports.
- The security notes implied manually choosing a non-root service user. Clarified that the RPM package creates and uses the dedicated `elasticsearch` service user and that TLS should remain enabled.
- The conclusion contained duplicated and incorrectly capitalized wording. Corrected it to state that an Elasticsearch cluster was configured on RHEL.

## Review Notes
The post is now technically valid as a general RHEL RPM-based Elasticsearch cluster setup. For a production-grade guide, future improvements could add version pinning, SELinux-specific considerations, and stronger guidance on limiting port `9200` to trusted client networks.
