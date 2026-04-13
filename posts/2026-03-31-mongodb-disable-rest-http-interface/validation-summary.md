# Validation Summary: How to Disable MongoDB REST Interface and HTTP Interface

## Status
validated

## Post Type
Security hardening guide / Tutorial

## Technologies Covered
- MongoDB (versions 2.x through 3.6+)
- MongoDB HTTP status interface (port 28017)
- MongoDB REST API
- mongod configuration (mongod.conf YAML format)
- Linux firewall tools (ufw, iptables, firewalld)
- nmap port scanning

## Sources Consulted
- MongoDB Default Ports documentation: https://www.mongodb.com/docs/manual/reference/default-mongodb-port/
- MongoDB 3.6 Compatibility Changes (removed HTTP interface options): https://www.mongodb.com/docs/rapid/release-notes/3.6-compatibility/
- MongoDB v2.6 Configuration Options (httpInterface, nohttpinterface deprecation): https://www.mongodb.com/docs/v2.6/reference/configuration-options/
- MongoDB Configuration File Options (current): https://www.mongodb.com/docs/manual/reference/configuration-options/
- MongoDB JIRA DOCS-6882: HTTP Interface deprecated in 3.2
- YAML 1.2.2 Specification (duplicate key rules): https://yaml.org/spec/1.2.2/
- firewalld documentation (--remove-port vs rich rules): https://firewalld.org/documentation/zone/options.html

## Issues Found

1. **`--norest` flag does not exist**: The post included `--norest` in the command-line example. MongoDB never had a `--norest` flag. The REST API was disabled by default; it was enabled via the `--rest` flag. Removed `--norest` from the example and updated the explanation.

2. **Version table incorrectly stated HTTP interface was "enabled by default" for MongoDB 2.x–3.4**: The HTTP status page was only enabled by default before MongoDB 2.6. From 2.6 onward it was disabled by default, and deprecated in 3.2. Updated the table to split into 2.0–2.4 (enabled by default) and 2.6–3.4 (disabled by default, deprecated in 3.2).

3. **Duplicate `security:` YAML key in "Additional MongoDB Network Hardening" section**: The config snippet had two top-level `security:` keys. This is invalid YAML per the YAML 1.2 specification. Most parsers silently use the last value, which would have dropped `authorization: enabled` — a serious security misconfiguration. Merged into a single `security:` block.

4. **Inconsistent version references**: The YAML comment said "MongoDB 3.2 and below" but the prose correctly said "3.4 and earlier." The `net.http.*` config options worked through 3.4 (deprecated in 3.2, removed in 3.6). Fixed the comment to say "3.4 and earlier."

5. **`firewall-cmd --remove-port` is misleading**: The `--remove-port` flag only removes a port from the allowed list, which only works if the port was previously explicitly opened. In default firewalld configurations, port 28017 was never added, so `--remove-port` would be a no-op. Replaced with a `--add-rich-rule` that explicitly rejects traffic on port 28017.

6. **Overview section inaccuracy**: Updated the overview to accurately reflect the version-specific default behavior (enabled by default before 2.6, disabled by default from 2.6, deprecated in 3.2, removed in 3.6).

## Review Notes
- The post is primarily relevant to legacy MongoDB deployments (pre-3.6). MongoDB 3.6+ users do not need any of these settings since the HTTP/REST interfaces were removed entirely. The post correctly notes this.
- The `getCmdLineOpts` admin command usage is correct for verifying applied configuration.
- The `security.javascriptEnabled` field name is correct. As of MongoDB 8.0, server-side JavaScript is disabled by default.
- The firewall examples for ufw and iptables are correct.
- The nmap verification step is a sound security practice.
