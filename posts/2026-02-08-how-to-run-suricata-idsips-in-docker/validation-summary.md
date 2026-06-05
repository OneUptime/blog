# Validation Summary: How to Run Suricata IDS/IPS in Docker

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Docker
- Docker Compose
- Suricata IDS/IPS
- Suricata rules and suricata-update
- Linux iptables / NFQUEUE
- Elasticsearch
- Kibana
- Filebeat

## Sources Consulted
- Suricata 8.0.1 Rule Management with Suricata-Update: https://docs.suricata.io/en/suricata-8.0.1/rule-management/suricata-update.html
- suricata-update 1.3.7 command reference: https://suricata-update.readthedocs.io/en/latest/update.html
- Suricata 8.0.1 Unix socket commands: https://docs.suricata.io/en/suricata-8.0.1/unix-socket.html
- Suricata 8.0.5 IPS / NFQUEUE setup: https://docs.suricata.io/en/suricata-8.0.5/ips/setting-up-ipsinline-for-linux.html
- Suricata 8.0.1 IPS concept: https://docs.suricata.io/en/suricata-8.0.1/ips/ips-concept.html
- Suricata configuration reference: https://docs.suricata.io/en/latest/configuration/suricata-yaml.html
- Suricata DNS rule keywords: https://docs.suricata.io/en/suricata-8.0.2/rules/dns-keywords.html
- Suricata HTTP rule keywords: https://docs.suricata.io/en/suricata-8.0.1/rules/http-keywords.html
- Suricata threshold and suppression configuration: https://docs.suricata.io/en/latest/configuration/global-thresholds.html
- Elastic Filebeat log input deprecation notice: https://www.elastic.co/guide/en/beats/filebeat/current/filebeat-input-log.html
- Elastic Filebeat filestream input and ndjson parser reference: https://www.elastic.co/docs/reference/beats/filebeat/filebeat-input-filestream
- jasonish Suricata Docker image documentation: https://github.com/jasonish/docker-suricata

## Issues Found
- The Suricata configuration omitted `SSH_SERVERS` while a custom rule referenced `$SSH_SERVERS`. Added `SSH_SERVERS: "$HOME_NET"` to the address groups.
- The suricata-update example used `--disable-sid`, which is not part of the documented suricata-update options. Replaced it with writing SIDs to `/etc/suricata/disable.conf` and rerunning `suricata-update`.
- The "check which rules are loaded" command used `suricata-update --dump-sample-configs`, which prints sample config files rather than loaded rule stats. Replaced it with `suricatasc -c ruleset-stats`.
- The DNS TXT response rule used `dns.query` and raw TXT type bytes, but `dns.query` matches query names in requests. Replaced it with `dns.rrtype:TXT`, reversed the direction to DNS responses, and changed threshold tracking to destination host.
- The HTTP encoded shell command example matched `%2F bin%2F` with an incorrect space. Corrected it to `%2Fbin%2F`.
- The SSH custom rule claimed GeoIP/country detection but did not use any GeoIP condition. Updated the comment to describe repeated unexpected SSH sources instead.
- The Filebeat example used the deprecated `log` input. Updated it to `filestream` with an `ndjson` parser for Suricata EVE JSON.
- Several code fences labeled rule/config content as `bash` or `yaml` even though the snippets were Suricata rules or threshold config. Relabeled them to avoid implying they are shell commands or YAML.

## Review Notes
The Docker, NFQUEUE, Suricata socket, EVE JSON, pcap-log, threshold, and IPS/drop-rule concepts were consistent with the consulted documentation after the fixes. The examples still assume the host interface is `eth0`; users may need to replace that with their actual interface name.
