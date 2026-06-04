# Validation Summary: How to Run Postal Mail Server in Docker

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Postal v3
- Docker Engine
- Docker Compose
- MariaDB
- SMTP
- DNS records for SPF, DKIM, return path, routing, and tracking
- Postal HTTP API
- Postal webhooks
- Python `smtplib`

## Sources Consulted
- Postal installation documentation: https://docs.postalserver.io/getting-started/installation/
- Postal prerequisites documentation: https://docs.postalserver.io/getting-started/prerequisites/
- Postal container image documentation: https://docs.postalserver.io/other/containers/
- Postal configuration documentation: https://docs.postalserver.io/getting-started/configuration/
- Postal full configuration example: https://github.com/postalserver/postal/blob/main/doc/config/yaml.yml
- Postal v3 example configuration: https://github.com/postalserver/install/blob/main/examples/postal.v3.yml
- Postal DNS configuration documentation: https://docs.postalserver.io/getting-started/dns-configuration/
- Postal API v1 documentation: https://docs.postalserver.io/developer/api/
- Postal send message API documentation: http://apiv1.postalserver.io/controllers/send/message
- Postal SMTP authentication documentation: https://docs.postalserver.io/features/smtp-authentication/
- Postal SMTP TLS documentation: https://docs.postalserver.io/features/smtp-tls/
- Postal webhooks documentation: https://docs.postalserver.io/developer/webhooks/
- Postal v3 upgrade documentation: https://docs.postalserver.io/getting-started/upgrade-to-v3/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version element documentation: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The post described Postal as requiring MySQL, RabbitMQ, and Redis. Current Postal v3 documentation requires MariaDB 10.6+ and says RabbitMQ is no longer needed, so the article and Compose file were changed to use MariaDB and remove RabbitMQ/Redis references.
- The prerequisites listed 2GB RAM. Postal's current prerequisites specify at least 4GB RAM and 2 CPU cores, so this was corrected.
- The Compose example used `ghcr.io/postalserver/postal:latest`, which Postal does not recommend for production. It was changed to the current tagged release, `3.3.7`.
- The Compose file used an obsolete top-level `version` field. It was removed to match the current Compose Specification.
- The Postal configuration used legacy option names such as `web_server.port`, `web_server.bind_address`, `smtp_server.port`, `message_db.prefix`, and `dns.smtp_server_hostname`. These were updated to the current v2 configuration format.
- The Postal configuration omitted `version: 2` and the explicit signing key path. Both were added.
- The DNS table did not match Postal's current recommended installation DNS records. It was updated for the Postal hostname, SPF include domain, return path, default DKIM record, route domain, and tracking domain.
- The SMTP example advertised port 587 even though the Compose file only ran one SMTP server on port 25. The example now lists port 25 only.
- The API URL used `https://postal.yourdomain.com:5000`, which is misleading when Postal's web server is normally plain HTTP behind a TLS reverse proxy. The API example now uses the external HTTPS hostname without port 5000.
- Monitoring, backup, and restore commands referenced MySQL and RabbitMQ. These were changed to MariaDB commands and RabbitMQ monitoring was removed.
- The summary claimed DMARC support as part of the shown setup, but the article did not configure DMARC. It now refers to SPF, DKIM, and return-path alignment.

## Review Notes
The post is now technically aligned with Postal v3 as of 2026-06-04. For a future production hardening pass, the article could add a reverse proxy/TLS section and recommend secrets management instead of inline database passwords, but those additions were outside the requested scope of correcting technical errors.
