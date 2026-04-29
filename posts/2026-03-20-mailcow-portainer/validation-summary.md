# Validation Summary: How to Deploy Mailcow via Portainer

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Mailcow
- Docker Engine
- Docker Compose
- Portainer
- DNS
- Postfix
- Dovecot
- SOGo
- Rspamd
- MariaDB

## Sources Consulted
- mailcow installation docs: https://docs.mailcow.email/getstarted/install/
- mailcow DNS setup docs: https://docs.mailcow.email/getstarted/prerequisite-dns/
- mailcow system requirements docs: https://docs.mailcow.email/getstarted/prerequisite-system/
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add
- mailcow compose source: https://github.com/mailcow/mailcow-dockerized/blob/master/docker-compose.yml
- mailcow config generator source: https://github.com/mailcow/mailcow-dockerized/blob/master/generate_config.sh
- mailcow domain creation logic: https://github.com/mailcow/mailcow-dockerized/blob/master/data/web/inc/functions.mailbox.inc.php
- mailcow DKIM logic: https://github.com/mailcow/mailcow-dockerized/blob/master/data/web/inc/functions.dkim.inc.php

## Issues Found
- The prerequisites understated current Mailcow requirements. I added Docker Engine 24+, Docker Compose v2, the missing IMAP/POP ports 110 and 143, and corrected the RAM guidance to match current upstream recommendations.
- The DNS example omitted `autodiscover` and `autoconfig` CNAME records from Mailcow's documented minimal DNS configuration. I added both records.
- The post incorrectly said Mailcow generates `docker-compose.yml`. Upstream ships `docker-compose.yml` in the repository; `generate_config.sh` creates `mailcow.conf`. I corrected that explanation.
- The compose excerpt used stale image registries and old tags. I updated the example to the current upstream images and versions published in the Mailcow repository on 2026-04-29.
- The Portainer import section was incomplete for a real Mailcow deployment because the upstream Git repository does not contain the generated `mailcow.conf` values required by the compose file. I corrected the instructions to use the local compose file plus the generated environment values, and clarified the limitation of Git Repository mode.
- The admin URL was too generic. I updated it to `https://mail.yourdomain.com/admin`, which matches the current Mailcow install docs.
- The DKIM section implied that a new key always needs to be generated manually. Current Mailcow domain creation logic creates a DKIM key by default when adding a domain, so I changed the step to copy the existing TXT record and only generate a key if one is missing.
- The conclusion's container count was outdated. I updated it from `~15` to `~18` to match the current default stack.

## Review Notes
- Image tags and the exact container count are release-specific. The post was validated against the current Mailcow upstream repository and documentation as of 2026-04-29.
- Mailcow's system requirements docs also call out firewall caveats for `ufw` and `firewalld`, but I did not add new operational guidance beyond the direct technical corrections required for this review.
