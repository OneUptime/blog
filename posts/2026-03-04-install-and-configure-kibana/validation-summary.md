# Validation Summary: How to Install and Configure Kibana on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Kibana
- Elastic Stack RPM repositories
- systemd
- firewalld

## Sources Consulted
- Elastic Docs: Install Kibana with RPM - https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-kibana-with-rpm
- Elastic Docs: Install Kibana - https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-kibana
- Elastic Docs: Configure Kibana - https://www.elastic.co/docs/deploy-manage/deploy/self-managed/configure-kibana
- Elastic Docs: Start and stop Kibana - https://www.elastic.co/docs/deploy-manage/maintenance/start-stop-services/start-stop-kibana
- Elastic Docs: Kibana general settings - https://www.elastic.co/docs/reference/kibana/configuration-reference/general-settings
- firewalld Documentation: firewall-cmd manual page - https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The installation section used placeholder package names instead of Kibana installation commands. Replaced it with the official Elastic RPM signing key import, repository definition, `dnf install kibana`, and `rpm -qi kibana` verification.
- The configuration section referenced `/etc/<service>/config.conf`, which is not the Kibana RPM configuration path. Updated it to `/etc/kibana/kibana.yml` and added valid `server.host` and `server.port` settings.
- The service commands used `<service>` placeholders. Updated them to the actual `kibana.service` systemd unit and included `systemctl daemon-reload`, as shown in Elastic's systemd instructions.
- The verification command used a nonexistent generic `--test` command. Replaced it with an HTTP check against Kibana's default port, `http://localhost:5601`.
- The firewall command used `--add-service=<service>`, but Kibana is exposed on TCP port 5601 and firewalld does not provide a generic Kibana service in the post. Replaced it with `--add-port=5601/tcp`.
- The performance and troubleshooting examples used placeholders. Updated them to use `kibana.service`, the service MainPID, and Kibana-specific journal commands.
- The prerequisites omitted the Elasticsearch dependency and version compatibility requirement. Added a prerequisite for a running Elasticsearch node with the same Elastic Stack version.

## Review Notes
The post now uses current Elastic 9.x repository examples. In the future, the repository path should be updated if the tutorial targets a specific Elastic major version other than 9.x.
