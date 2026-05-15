# Validation Summary: How to Install Elasticsearch 8 on RHEL

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Red Hat Enterprise Linux
- Elasticsearch 8
- Elastic RPM/YUM repository
- systemd
- firewalld
- Linux sysctl tuning
- Elasticsearch JVM heap configuration
- Elasticsearch security auto-configuration and TLS

## Sources Consulted
- Elastic documentation: Install Elasticsearch with RPM, https://www.elastic.co/guide/en/elasticsearch/reference/8.19/rpm.html
- Elastic documentation: Start the Elastic Stack with security enabled automatically, https://www.elastic.co/guide/en/elasticsearch/reference/8.19/configuring-stack-security.html
- Elastic documentation: Starting Elasticsearch, https://www.elastic.co/guide/en/elasticsearch/reference/8.19/starting-elasticsearch.html
- Elastic documentation: JVM settings, https://www.elastic.co/guide/en/elasticsearch/reference/8.19/advanced-configuration.html
- Elastic documentation: elasticsearch-reset-password, https://www.elastic.co/docs/reference/elasticsearch/command-line-tools/reset-password
- Elastic documentation: Virtual memory, https://www.elastic.co/guide/en/elasticsearch/reference/8.19/vm-max-map-count.html
- Elastic documentation: Increase the file descriptor limit, https://www.elastic.co/docs/deploy-manage/deploy/self-managed/file-descriptors

## Issues Found
- The repository snippet used `enabled=1`, while Elastic's RPM repository documentation configures the repository as disabled by default and requires explicit enablement during install. Changed it to `enabled=0`.
- The install command did not explicitly enable the disabled Elasticsearch repository. Changed `sudo dnf install -y elasticsearch` to `sudo dnf install --enablerepo=elasticsearch -y elasticsearch`.
- The install note said the installation outputs an enrollment token. Elastic's RPM documentation specifically says the password and TLS certificate/key information are output, while node enrollment tokens are generated separately when needed. Updated the note to reference the elastic password and TLS certificate information.
- The file descriptor note said the RPM package handles limits in `/etc/security/limits.d/`. Elastic documents that RPM and Debian packages default file descriptors to 65535 through package/service defaults. Updated the note to reference the RPM package's systemd service defaults.

## Review Notes
- The `vm.max_map_count` value of `262144` matches the Elasticsearch 8.19 documentation. Elastic's current documentation for later versions now recommends `1048576`, so this should be revisited if the guide is updated for Elasticsearch 9 or "latest" Elasticsearch.
- Opening TCP port `9300` is only needed when other Elasticsearch nodes need transport-layer access. For a single-node installation, exposing only `9200` is usually sufficient.
