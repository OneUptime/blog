# Validation Summary: How to Install Elasticsearch 8 on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Elasticsearch 8
- Elastic RPM/YUM repository
- systemd
- firewalld
- Elasticsearch JVM heap configuration
- Elasticsearch security auto-configuration

## Sources Consulted
- Elastic documentation: Install Elasticsearch with RPM, https://www.elastic.co/guide/en/elasticsearch/reference/8.18/rpm.html
- Elastic documentation: Set JVM options, https://www.elastic.co/guide/en/elasticsearch/reference/8.18/advanced-configuration.html
- Elastic documentation: Discovery and cluster formation settings, https://www.elastic.co/guide/en/elasticsearch/reference/8.18/modules-discovery-settings.html
- Elastic documentation: elasticsearch-reset-password, https://www.elastic.co/docs/reference/elasticsearch/command-line-tools/reset-password
- Elastic Support Matrix, https://www.elastic.co/support/matrix

## Issues Found
- The repository snippet enabled the Elasticsearch repository by default and the install command used `dnf install elasticsearch`. Elastic's RPM documentation shows `enabled=0` and installs with `--enablerepo=elasticsearch` to avoid unintended upgrades during regular system updates. Updated the repository snippet and install command accordingly.
- The JVM heap guidance said to set heap to 50% of RAM but no more than 31 GB. Elastic documents 50% as an upper bound, not an exact target, and says the compressed ordinary object pointer threshold is safely 26 GB on most systems and can be as large as 30 GB on some systems. Updated the wording.

## Review Notes
The remaining commands and settings are technically valid for a single-node Elasticsearch 8 installation on RPM-based Red Hat distributions. The `curl -k` verification command works, but Elastic's documentation recommends validating the generated CA certificate with `--cacert /etc/elasticsearch/certs/http_ca.crt` instead of skipping certificate verification.
