# Validation Summary: How to Install Elasticsearch on Ubuntu Server

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Ubuntu Server
- Elasticsearch 8.x
- Elastic APT repository
- systemd
- JVM heap configuration
- Linux kernel and process limits
- Elasticsearch security and TLS
- Elasticsearch REST APIs

## Sources Consulted
- Elastic Docs: Install Elasticsearch with Debian Package, https://www.elastic.co/guide/en/elasticsearch/reference/8.19/deb.html
- Elastic Docs: JVM options and heap sizing, https://www.elastic.co/guide/en/elasticsearch/reference/8.19/advanced-configuration.html
- Elastic Docs: Disable swapping, https://www.elastic.co/guide/en/elasticsearch/reference/8.19/setup-configuration-memory.html
- Elastic Docs: File descriptors, https://www.elastic.co/guide/en/elasticsearch/reference/8.19/file-descriptors.html
- Elastic Docs: Virtual memory / vm.max_map_count, https://www.elastic.co/guide/en/elasticsearch/reference/8.19/vm-max-map-count.html
- Elastic Docs: Configuring system settings, https://www.elastic.co/guide/en/elasticsearch/reference/8.19/setting-system-settings.html
- Elastic Docs: Bootstrap checks, https://www.elastic.co/guide/en/elasticsearch/reference/8.19/bootstrap-checks.html
- Elastic Docs: Security auto-configuration, https://www.elastic.co/docs/deploy-manage/security/self-setup
- Elastic Docs: Security settings, https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/security-settings
- Elastic Docs: elasticsearch-create-enrollment-token, https://www.elastic.co/guide/en/elasticsearch/reference/current/create-enrollment-token.html

## Issues Found
- The virtual memory setting used `vm.max_map_count=262144`. Elastic's Elasticsearch 8.19 documentation now specifies `1048576`, so the command and persistent sysctl setting were updated.
- The JVM section recommended manually enabling and tuning G1 GC. Elastic recommends default JVM options for most deployments and warns against unnecessary custom JVM options, so the GC flags were removed and replaced with guidance to avoid custom GC tuning unless Elastic documentation or support recommends it.
- The heap guidance used a 31GB maximum. Elastic documents the compressed ordinary object pointer threshold as variable, with 26GB safe on most systems and up to 30GB on some systems, so the wording was corrected.
- The multi-node discovery comments did not say to remove `discovery.type: single-node` or that `cluster.initial_master_nodes` is only for bootstrapping a new cluster. The comments were corrected to avoid an invalid or misleading cluster configuration.
- The file descriptor section implied Debian package installs always need manual limit changes. Elastic documents that RPM and Debian packages already default to 65535 file descriptors, so the wording now frames systemd overrides as optional and `limits.conf` as relevant to archive installs.
- The monitoring commands used plain HTTP even though the default Elasticsearch 8.x setup enables HTTPS. The commands were changed to use `https://localhost:9200` with the generated CA certificate.

## Review Notes
The article intentionally targets Elasticsearch 8.x. Elastic's current documentation defaults to 9.x, but the 8.19 documentation remains the appropriate reference for this version-specific guide.
