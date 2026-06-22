# Validation Summary: How to Install the ELK Stack on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Elasticsearch 8.x
- Logstash 8.x (logstash-input-beats, logstash-output-elasticsearch plugins)
- Kibana 8.x
- Filebeat 8.x
- Ubuntu 20.04 / 22.04
- OpenJDK 17
- systemd, ufw

## Sources Consulted
- Elasticsearch APT repository install docs — https://www.elastic.co/guide/en/elasticsearch/reference/current/deb.html
- Logstash elasticsearch output plugin — https://www.elastic.co/guide/en/logstash/current/plugins-outputs-elasticsearch.html
- Logstash beats input plugin — https://www.elastic.co/guide/en/logstash/current/plugins-inputs-beats.html
- Shared file system snapshot repository — https://www.elastic.co/docs/deploy-manage/tools/snapshot-and-restore/shared-file-system-repository
- Register a snapshot repository — https://www.elastic.co/guide/en/elasticsearch/reference/current/snapshots-register-repository.html

## Issues Found
1. **Logstash Beats input used the obsolete `ssl` option** (`ssl => false`). As of `logstash-input-beats` v7.0.0 this option was replaced and the plugin **fails to start** if it is present. Changed to `ssl_enabled => false`.
2. **Logstash Elasticsearch output used the obsolete `ssl` and `cacert` options** (`ssl => true`, `cacert => "..."`). As of `logstash-output-elasticsearch` v12.0.0 these were replaced and the plugin **fails to start** if present. Since the post pins the `8.x` APT repo (which serves recent 8.x releases bundling these plugin versions), changed `ssl => true` to `ssl_enabled => true` and `cacert => "/etc/logstash/certs/http_ca.crt"` to `ssl_certificate_authorities => ["/etc/logstash/certs/http_ca.crt"]` (the new option is array-typed).
3. **"Disable Security" Logstash note referenced the old option names.** Updated the comment to refer to `ssl_enabled` and `ssl_certificate_authorities` so it matches the corrected config above.
4. **Snapshot repository registration was missing the required `path.repo` prerequisite.** A shared filesystem (`fs`) repository can only be registered if its location is listed in `path.repo` in `elasticsearch.yml`; otherwise the registration API returns an error ("location ... doesn't match any of the locations specified by path.repo"). Added the `path.repo` config line plus a service restart before the registration step.
5. **Snapshot `curl` commands were missing authentication.** Both `_snapshot` calls target `https://localhost:9200` with security enabled but omitted the `-k -u elastic:...` flags used elsewhere in the post, so they would return HTTP 401. Added `-k -u elastic:YOUR_PASSWORD` to both.

## Review Notes
- **Filebeat `type: log` input:** The Filebeat config uses the `log` input type, which has been deprecated since Filebeat 7.16 in favor of the `filestream` input. It still functions in 8.x (not obsolete), so it was left unchanged, but `filestream` is the forward-looking choice.
- **Java install is optional:** Elasticsearch and Logstash 8.x ship with a bundled JDK, so the explicit `openjdk-17-jre-headless` install is not strictly required. It is harmless and was left in place.
- **ILM phase descriptions** ("Hot phase: 0 days", "Cold phase: 30 days (frozen)") are a simplified conceptual summary rather than exact UI field values; cold and frozen are distinct phases in Elasticsearch ILM, but the description is a reasonable high-level overview for a tutorial.
- Elasticsearch/Kibana config keys (`xpack.security.*`, the three Kibana `encryptionKey` settings, `discovery.type: single-node`), the enrollment/reset-password CLI tools, certificate paths (`certs/http.p12`, `http_ca.crt`), `vm.max_map_count=262144`, and the GPG key / APT repository steps were all verified as correct for the 8.x stack.
