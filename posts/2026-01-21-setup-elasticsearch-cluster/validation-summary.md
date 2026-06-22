# Validation Summary: How to Set Up an Elasticsearch Cluster

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Elasticsearch 8.x
- Elasticsearch node roles and cluster discovery
- Elasticsearch TLS/security tooling
- Elasticsearch REST APIs and cat APIs
- Debian/Ubuntu package installation
- systemd
- HAProxy
- curl

## Sources Consulted
- Elastic Docs: Install Elasticsearch with a Debian package - https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-elasticsearch-with-debian-package
- Elastic Docs: Bootstrapping a cluster - https://www.elastic.co/docs/deploy-manage/distributed-architecture/discovery-cluster-formation/modules-discovery-bootstrap-cluster
- Elastic Docs: elasticsearch-certutil - https://www.elastic.co/docs/reference/elasticsearch/command-line-tools/certutil
- Elastic Docs: elasticsearch-reconfigure-node - https://www.elastic.co/docs/reference/elasticsearch/command-line-tools/reconfigure-node
- Elastic Docs: Node settings - https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/node-settings
- Elastic Docs: Security settings in Elasticsearch - https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/security-settings
- Elastic Docs: General index settings - https://www.elastic.co/docs/reference/elasticsearch/index-settings/index-modules

## Issues Found
- The prerequisites listed Java 11 or later as a requirement. Elasticsearch packages include a bundled OpenJDK, so this was changed to state that no separate Java installation is required.
- The transport TLS configuration referenced `certs/transport.p12`, but the certificate generation command created `elastic-certificates.p12`. The command now writes `transport.p12` to match the configuration.
- The HTTP TLS configuration referenced `certs/http.p12`, but the `elasticsearch-certutil http` command did not show how to create and place that file. The instructions now generate an HTTP certificate ZIP, unzip it, and copy `http.p12` into the configured path.
- The certificate copy commands could fail because files under `/etc/elasticsearch/certs` may not be readable by the SSH user. The instructions now stage readable copies in `/tmp` before using `scp`.
- The cluster bootstrap configuration did not remind readers to remove `cluster.initial_master_nodes` after the first successful cluster formation. Added the required post-bootstrap removal instruction.
- The "Set Default Number of Replicas" section actually changed recovery concurrency settings, not replica counts. The heading was corrected to "Tune Recovery Concurrency".
- The HAProxy health check expected HTTP 200 from a secured Elasticsearch endpoint without credentials, which would normally return an authentication failure. The example now uses a TLS TCP check instead.

## Review Notes
- The guide intentionally targets Elasticsearch 8.x via the `packages/8.x` APT repository. Elastic's current Debian package documentation defaults to 9.x, but the 8.x repository path remains appropriate for an 8.x-specific guide.
- The example uses self-managed TLS material and `curl -k` for demonstration. In production, clients and load balancers should validate Elasticsearch certificates using the generated or organizational CA rather than disabling verification.
