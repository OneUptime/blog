# Validation Summary: How to Run Crowdsec in Docker for Intrusion Detection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- CrowdSec Security Engine
- CrowdSec Local API
- CrowdSec cscli
- CrowdSec firewall bouncer
- Traefik ForwardAuth bouncer
- Nginx and Traefik log acquisition
- YAML configuration

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- CrowdSec Docker installation guide: https://docs.crowdsec.net/u/getting_started/installation/docker/
- CrowdSec firewall bouncer documentation: https://docs.crowdsec.net/u/bouncers/firewall/
- CrowdSec scenario format documentation: https://docs.crowdsec.net/docs/v1.6/log_processor/scenarios/format/
- CrowdSec whitelist documentation: https://docs.crowdsec.net/u/getting_started/post_installation/whitelists/
- CrowdSec whitelist format documentation: https://docs.crowdsec.net/docs/next/log_processor/whitelist/format/
- CrowdSec Console enrollment documentation: https://docs.crowdsec.net/u/getting_started/post_installation/console/
- CrowdSec Hub Traefik collection: https://app.crowdsec.net/hub/author/crowdsecurity/collections/traefik
- CrowdSec Hub fbonalair Traefik bouncer component: https://app.crowdsec.net/hub/author/fbonalair/remediation-components/traefik-crowdsec-bouncer
- fbonalair Traefik CrowdSec bouncer README: https://github.com/fbonalair/traefik-crowdsec-bouncer
- Traefik ForwardAuth middleware documentation: https://doc.traefik.io/traefik/middlewares/http/forwardauth/

## Issues Found
- The Docker Compose example used the obsolete top-level `version: "3.8"` property. Removed it because current Docker Compose uses the Compose Specification and warns that `version` is obsolete.
- The CrowdSec Docker example configured Traefik log acquisition but did not install the `crowdsecurity/traefik` collection. Added it to `COLLECTIONS` so `labels.type: traefik` logs can be parsed.
- The `GID` environment variable comment incorrectly described Central API registration. Changed it to describe the group ID used for reading mounted log files.
- The LAPI port was exposed on all host interfaces. Changed the port binding to `127.0.0.1:8080:8080`, matching CrowdSec's Docker guidance and reducing unintended exposure.
- The firewall bouncer registration command used a positional name. Updated it to `cscli bouncers add --name firewall-bouncer`, matching current CrowdSec documentation.
- The Traefik section described `fbonalair/traefik-crowdsec-bouncer` as a plugin. Corrected the wording to "Traefik ForwardAuth bouncer service" because that image is a separate ForwardAuth service, not the current Traefik plugin.
- The custom scenario filter used `evt.Meta.log_type == 'nginx' || evt.Meta.log_type == 'traefik'`, but CrowdSec HTTP parsers set HTTP access logs as `evt.Meta.service == 'http'` and `evt.Meta.log_type == 'http_access-log'`. Updated the filter accordingly.
- The custom scenario claimed to detect more than 100 requests in 10 seconds but used `leakspeed: 100ms`, which would leak 10 events per second and not match that description. Changed it to `leakspeed: "10s"`.
- The whitelist example placed CIDR ranges under `whitelist.ip`. CrowdSec uses `whitelist.cidr` for CIDR ranges and `whitelist.ip` for individual IPs. Updated the key to `cidr`.

## Review Notes
- The examples use `latest` image tags, which are common in tutorials but not ideal for production. Pinning known-good versions would make the deployment more reproducible.
- The firewall bouncer package should match the host firewall backend. The post uses the iptables package for Debian/Ubuntu; nftables hosts should use the nftables package instead.
- CrowdSec's current Traefik documentation emphasizes the `maxlerebourg/crowdsec-bouncer-traefik-plugin` plugin for Traefik plugin-based deployments. The post's ForwardAuth service approach is still documented by its upstream project and CrowdSec Hub entry, but readers may prefer the newer plugin for AppSec/WAF features.
