# Validation Summary: How to Secure Elasticsearch with TLS/SSL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch
- TLS/SSL
- `elasticsearch-certutil`
- `elasticsearch-keystore`
- `elasticsearch-setup-passwords` / `elasticsearch-reset-password`
- OpenSSL
- cURL
- Python Elasticsearch client
- Node.js Elasticsearch client
- Java Elasticsearch client

## Sources Consulted
- Elastic Docs: `elasticsearch-certutil` command reference: https://www.elastic.co/docs/reference/elasticsearch/command-line-tools/certutil
- Elastic Docs: Set up transport TLS: https://www.elastic.co/docs/deploy-manage/security/set-up-basic-security
- Elastic Docs: Set up HTTPS: https://www.elastic.co/docs/deploy-manage/security/set-up-basic-security-plus-https
- Elastic Docs: Elasticsearch security settings: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/security-settings
- Elastic Docs: `elasticsearch-setup-passwords` command reference: https://www.elastic.co/docs/reference/elasticsearch/command-line-tools/setup-passwords
- Elastic Docs: Python client configuration: https://www.elastic.co/docs/reference/elasticsearch/clients/python/configuration
- Elastic Docs: JavaScript client connecting: https://www.elastic.co/docs/reference/elasticsearch/clients/javascript/connecting
- Elastic Docs: Java client secure connection: https://www.elastic.co/docs/reference/elasticsearch/clients/java/setup/connecting
- Elastic Docs: Legacy Java REST client TLS configuration: https://www.elastic.co/docs/reference/elasticsearch/clients/java/transport/rest-client/config/encrypted_communication

## Issues Found
- The password-protected transport TLS example used deprecated `xpack.security.transport.ssl.*.password` settings in `elasticsearch.yml` while also instructing readers to add `*.secure_password` values to the Elasticsearch keystore. Removed the deprecated YAML password settings and kept the secure keystore approach.
- The per-node certificate examples used `certs/node-1.p12`, but `elasticsearch-certutil cert --in instances.yml` extracts each certificate under a per-node directory. Updated examples to use `certs/node-1/node-1.p12` and noted the extracted path.
- The HTTP TLS examples configured `xpack.security.http.ssl.truststore.path` as if it were required for normal HTTPS server setup. Removed it from the basic server configuration. Added `certificate_authorities` only in the optional client-certificate-authentication example.
- The HTTP examples used `xpack.security.http.ssl.verification_mode: certificate`. Elastic documents that `verification_mode` in the HTTP TLS server context is discouraged, so it was removed from the examples.
- The built-in user setup section presented `elasticsearch-setup-passwords` without an Elasticsearch 8.x caveat. Added a note that the command is deprecated in 8.x and included `elasticsearch-reset-password -u elastic`.
- The Java client example used the deprecated `RestHighLevelClient`. Replaced it with the current Java API Client pattern using `TransportUtils.sslContextFromHttpCaCrt`, HTTPS, and basic authentication.
- The best-practices section labeled TLS protocol settings as cipher-suite configuration. Renamed the item to refer to modern TLS protocols.

## Review Notes
The guide is now technically valid as a manual TLS setup guide for self-managed Elasticsearch. Elasticsearch 8.x and later also includes security auto-configuration on first startup, so future revisions could clarify when manual certificate generation is needed versus relying on auto-generated HTTP TLS assets.
