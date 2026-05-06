# Validation Summary: How to Configure Elasticsearch Cluster with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Elasticsearch
- Kibana
- IPv6 networking
- Java JVM networking properties
- TLS certificate generation with `elasticsearch-certutil`
- Linux firewall configuration with `ip6tables`

## Sources Consulted
- Elasticsearch networking settings: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/networking-settings
- Discovery and cluster formation settings: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/discovery-cluster-formation-settings
- Security settings in Elasticsearch: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/security-settings
- `elasticsearch-certutil` reference: https://www.elastic.co/docs/reference/elasticsearch/command-line-tools/certutil
- Set up transport TLS: https://www.elastic.co/docs/deploy-manage/security/set-up-basic-security
- Set up HTTPS: https://www.elastic.co/docs/deploy-manage/security/set-up-basic-security-plus-https/
- Kibana general settings: https://www.elastic.co/docs/reference/kibana/configuration-reference/general-settings
- Java networking properties: https://docs.oracle.com/en/java/javase/24/docs/api/java.base/java/net/doc-files/net-properties.html

## Issues Found
- The commented `network.host` special values were unquoted even though values containing `:` must be quoted in YAML. I quoted the IPv6 special-value examples so they are valid as written.
- The opening explanation implied the JVM IPv6 properties were required. I corrected the wording so they are presented as optional when hostnames resolve to both IPv4 and IPv6.
- The `cluster.initial_master_nodes` example omitted the one-time bootstrap caveat. I added a comment noting that this setting must be removed after the cluster forms for the first time.
- The TLS configuration used PEM-style `key` and `certificate` settings, but the `elasticsearch-certutil` commands shown generate `.p12` files by default. I changed the Elasticsearch TLS snippet to use `keystore.path` and `truststore.path` with `.p12` files and added a note about storing matching `secure_password` values in the Elasticsearch keystore when passwords are set.
- The firewall persistence command used `sudo` incorrectly with shell redirection. I changed it to `sudo sh -c 'ip6tables-save > /etc/ip6tables/rules.v6'` so it works as written.

## Review Notes
- Current Elastic guidance treats transport TLS and HTTP TLS/Kibana HTTPS as separate setup flows. The post's Kibana example remains a plain-HTTP connectivity example; if this post is expanded into a fully secured deployment walkthrough later, Kibana should use `https`, trust the Elasticsearch CA, and provide appropriate credentials for the Elasticsearch connection.
