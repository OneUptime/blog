# Validation Summary: How to Run Rspamd in Docker for Spam Filtering

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- Rspamd
- Redis
- ClamAV
- Postfix milter integration
- DKIM signing
- Rspamd Bayesian filtering, greylisting, rate limiting, antivirus integration, and CLI tools

## Sources Consulted
- Rspamd Docker downloads documentation: https://docs.rspamd.com/downloads/
- Rspamd Redis configuration documentation: https://docs.rspamd.com/configuration/redis/
- Rspamd statistics and Bayes configuration documentation: https://docs.rspamd.com/configuration/statistic/
- Rspamd DKIM signing module documentation: https://docs.rspamd.com/modules/dkim_signing/
- Rspamd greylisting module documentation: https://docs.rspamd.com/modules/greylisting/
- Rspamd ratelimit module documentation: https://docs.rspamd.com/modules/ratelimit/
- Rspamd antivirus module documentation: https://docs.rspamd.com/modules/antivirus/
- Rspamd controller worker documentation: https://docs.rspamd.com/workers/controller/
- Rspamd FAQ and rspamc/rspamadm command references: https://docs.rspamd.com/faq/ and https://docs.rspamd.com/other/rspamadm/
- Postfix Milter README: https://www.postfix.org/MILTER_README.html
- Docker CLI documentation for `docker exec` stdin behavior: https://docs.docker.com/engine/reference/commandline/exec/

## Issues Found
- The DKIM key generation commands created keys under `config/rspamd/dkim`, but the Compose file did not mount that directory into the container. Added a read-only mount to `/var/lib/rspamd/dkim`.
- The DKIM key filename and `dkim_signing.conf` path did not match Rspamd's documented `$domain.$selector.key` convention. Updated key generation and the configured path to use `yourdomain.com.dkim.key`.
- The DKIM example used raw OpenSSL commands and did not produce the DNS TXT record needed by DKIM verifiers. Replaced it with `rspamadm dkim_keygen`, which creates the private key and prints the DNS record.
- The DKIM config comment described `sign_headers` as relaxed canonicalization. Rspamd documents relaxed/relaxed canonicalization as the default and `sign_headers` as a header selection setting, so the misleading override was removed.
- The setup said `docker compose ps` verifies containers are healthy, but the Compose file defines no healthchecks. Changed the wording to verify that containers are running.
- Several `docker exec ... rspamc ... < file.eml` examples omitted `-i`, so redirected stdin from the host would not be kept open for the command. Added `-i` to those examples.

## Review Notes
- Docker image pulling could not be tested locally because Docker Hub returned an unauthenticated pull rate limit, so command behavior was verified from official Rspamd and Docker documentation instead.
- The article uses `rspamd/rspamd:latest`, which Rspamd documents as the latest stable image tag. Pinning a specific `3.x.y` tag would improve repeatability in production, but `latest` is not technically incorrect.
