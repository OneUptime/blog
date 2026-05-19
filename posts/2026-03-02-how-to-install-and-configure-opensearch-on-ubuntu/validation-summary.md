# Validation Summary: How to Install and Configure OpenSearch on Ubuntu

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Ubuntu
- OpenSearch
- OpenSearch Security plugin
- OpenSearch Dashboards
- OpenSearch index and search APIs
- OpenSearch index templates
- OpenSearch Index State Management (ISM)
- systemd
- APT
- curl

## Sources Consulted
- OpenSearch Debian installation documentation: https://docs.opensearch.org/latest/install-and-configure/install-opensearch/debian/
- OpenSearch Dashboards Debian installation documentation: https://docs.opensearch.org/latest/install-and-configure/install-dashboards/debian/
- OpenSearch Security demo configuration documentation: https://docs.opensearch.org/latest/security/configuration/demo-configuration/
- OpenSearch Security getting started documentation: https://docs.opensearch.org/latest/security/getting-started/
- OpenSearch configuration documentation: https://docs.opensearch.org/latest/install-and-configure/configuring-opensearch/index/
- OpenSearch discovery and cluster formation settings: https://docs.opensearch.org/latest/tuning-your-cluster/discovery-cluster-formation/settings/
- OpenSearch index templates documentation: https://docs.opensearch.org/latest/im-plugin/index-templates/
- OpenSearch ISM policy documentation: https://docs.opensearch.org/latest/im-plugin/ism/policies/
- OpenSearch FAQ: https://opensearch.org/faq/
- OpenSearch client compatibility documentation: https://docs.opensearch.org/latest/clients/

## Issues Found
- The post described OpenSearch as fully API-compatible with Elasticsearch 7.10. Current OpenSearch documentation is more nuanced: OpenSearch was derived from Elasticsearch 7.10.2, and compatibility depends on OpenSearch and client versions. I changed the wording to avoid an overbroad compatibility claim.
- The OpenSearch APT setup used the older `opensearch.pgp` key URL, `/usr/share/keyrings` path, and `2.x` repository stream. I updated the commands to the current official `opensearch-release.pgp` key, `/etc/apt/keyrings/opensearch-release-keyring`, and `3.x` repository.
- The OpenSearch install command set `OPENSEARCH_INITIAL_ADMIN_PASSWORD` directly after `sudo`. I changed it to the official `sudo env OPENSEARCH_INITIAL_ADMIN_PASSWORD=... apt-get install ...` form.
- The security configuration referenced certificate files under `certs/` that were not the paths used by the official Debian TLS setup. I updated them to `/etc/opensearch/node1.pem`, `/etc/opensearch/node1-key.pem`, and `/etc/opensearch/root-ca.pem`, and aligned the node DN example with the official certificate example.
- The index template used `index.lifecycle.name`, which is an Elasticsearch ILM setting, not the correct OpenSearch ISM policy attachment mechanism. I removed that setting and added an `ism_template` block to the ISM policy.
- The OpenSearch Dashboards repository also used the older key path and `2.x` stream. I updated it to the current `3.x` APT repository and shared keyring path.
- The Dashboards configuration used the custom admin password for the `kibanaserver` service user. The OpenSearch Security getting-started documentation uses `kibanaserver` / `kibanaserver` for that service account in the demo setup, while users log into Dashboards with `admin` and the configured initial admin password. I corrected the Dashboards service password.

## Review Notes
- The article still uses `curl -k` and `opensearch.ssl.verificationMode: none` for quick local testing. The post already warns that `-k` is not for production; a production guide should replace demo certificates and configure certificate verification end to end.
- The `kibanaserver` default password and demo certificates should not be used in production.
