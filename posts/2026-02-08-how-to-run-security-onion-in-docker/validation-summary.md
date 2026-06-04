# Validation Summary: How to Run Security Onion in Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker Engine
- Docker Compose
- Security Onion
- Suricata
- Zeek
- Elasticsearch
- Kibana
- Filebeat
- Linux packet capture

## Sources Consulted
- Security Onion Docker documentation: https://docs.securityonion.net/en/2.4/docker
- Security Onion architecture documentation: https://docs.securityonion.net/en/2.4/architecture.html
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- jasonish Suricata Docker image documentation: https://github.com/jasonish/docker-suricata
- Suricata rule management documentation: https://docs.suricata.io/en/suricata-8.0.1/rule-management/suricata-update.html
- Suricata EVE JSON output documentation: https://docs.suricata.io/en/suricata-8.0.4/output/eve/eve-json-output.html
- Zeek Docker image/install documentation: https://docs.zeek.org/en/stable/install/
- Zeek invocation documentation: https://docs.zeek.org/en/v8.2.0/tutorial/invoking-zeek.html
- Filebeat Suricata module documentation: https://www.elastic.co/docs/reference/beats/filebeat/filebeat-module-suricata
- Filebeat Zeek module documentation: https://www.elastic.co/docs/reference/beats/filebeat/filebeat-module-zeek
- Filebeat modules documentation: https://www.elastic.co/docs/reference/beats/filebeat/filebeat-modules

## Issues Found
- The Compose examples used the legacy `version: "3.8"` field. Removed it so the examples match the current Compose Specification.
- The Suricata configuration did not declare `default-rule-path` and `rule-files`, so rules downloaded by `suricata-update` would not be loaded. Added the standard `/var/lib/suricata/rules/suricata.rules` configuration.
- The Suricata Compose command used an incorrect `--set` path for the nested EVE output list. Removed it because the provided `suricata.yaml` already sets EVE output to `regular`.
- The Zeek example mounted logs and `local.zeek` under `/opt/zeek`, but the official `zeek/zeek` image installs Zeek under `/usr/local/zeek`. Updated the paths.
- The Zeek example wrote default Zeek logs, while the current Filebeat Zeek module expects Zeek JSON logs. Updated the Zeek command to run with `LogAscii::use_json=T`.
- The Filebeat Zeek paths pointed at `/opt/zeek/logs/current/*.log`, but the command-line Zeek process writes logs in its working directory rather than a ZeekControl `current` directory. Updated the paths to `/usr/local/zeek/logs/*.log`.
- The separate Compose files used named volumes that would not necessarily exist under the literal names referenced by the ELK file. Added explicit volume names for the Suricata and Zeek examples.
- The Suricata rule update commands omitted the image-recommended `--user suricata` and did not refresh rule sources before enabling an additional source. Updated the commands to follow the documented workflow and use `suricata-update -f` for update/reload behavior in the image.

## Review Notes
Filebeat modules are still supported, but Elastic currently recommends Elastic Agent integrations for new deployments. The post remains technically valid as a Docker-based lab or custom deployment guide, but it is not a substitute for a supported full Security Onion installation.
