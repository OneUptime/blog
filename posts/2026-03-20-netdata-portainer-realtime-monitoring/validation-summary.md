# Validation Summary: How to Set Up Netdata via Portainer for Real-Time Monitoring

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Netdata (agent + Netdata Cloud)
- Portainer (Docker stack management)
- Docker / Docker Compose
- YAML stack definition
- Netdata health alerts (`health.d/*.conf`)
- Netdata streaming (`stream.conf`)

## Sources Consulted
- Netdata Docker installation docs: https://learn.netdata.cloud/docs/netdata-agent/installation/docker
- Netdata Docker entrypoint script (`packaging/docker/run.sh`): https://raw.githubusercontent.com/netdata/netdata/master/packaging/docker/run.sh
- Netdata Docker Dockerfile: https://raw.githubusercontent.com/netdata/netdata/master/packaging/docker/Dockerfile
- Netdata claim documentation (`src/claim/README.md`): https://raw.githubusercontent.com/netdata/netdata/master/src/claim/README.md
- Netdata Connect Agent to Cloud: https://learn.netdata.cloud/docs/netdata-cloud/connect-agent-to-cloud
- Netdata Parent-Child Configuration Reference: https://learn.netdata.cloud/docs/netdata-parents/parent-child-configuration-reference
- Netdata health configuration reference: https://learn.netdata.cloud/docs/alerts-&-notifications/alert-configuration-reference
- Default `health_alarm_notify.conf`: https://raw.githubusercontent.com/netdata/netdata/master/src/health/notifications/health_alarm_notify.conf

## Issues Found

1. **Streaming via environment variables was incorrect.**
   - Original: the "Monitoring Multiple Hosts" section instructed readers to set `NETDATA_STREAM_DESTINATION` and `NETDATA_STREAM_API_KEY` in the child container's `environment:` block.
   - Why it was wrong: the official `netdata/netdata` Docker entrypoint (`run.sh`) and `Dockerfile` do not reference these variables, and the official Parent-Child Configuration Reference configures streaming exclusively through `stream.conf`. Setting these env vars on the official image has no effect.
   - Fix: replaced the env-var snippet with instructions to edit `stream.conf` inside the container (`./edit-config stream.conf`) and add the destination and API key under `[stream]`, plus a note about enabling the matching `[API_KEY]` section on the parent.

2. **Email notification configuration referenced non-existent SMTP keys.**
   - Original: Step 6 told readers to set `SMTP_SERVER`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_STARTTLS` directly in `health_alarm_notify.conf`.
   - Why it was wrong: the upstream `health_alarm_notify.conf` ships only `SEND_EMAIL`, `EMAIL_SENDER`, `DEFAULT_RECIPIENT_EMAIL`, and a `sendmail` path option. Netdata sends mail by invoking the local `sendmail` binary; SMTP credentials are configured in the local MTA (msmtp, ssmtp, postfix, etc.), not in Netdata.
   - Fix: removed the invented SMTP keys, kept the valid options (`SEND_EMAIL`, `EMAIL_SENDER`, `DEFAULT_RECIPIENT_EMAIL`, `sendmail`), and added a short note that an MTA must be installed/configured inside the container (e.g. via `NETDATA_EXTRA_DEB_PACKAGES`) and pointed at the user's SMTP relay.

## Review Notes
- The Compose stack (image, volumes, capabilities — `SYS_PTRACE`, `SYS_ADMIN`, `apparmor:unconfined` — `pid: host`, `network_mode: host`, `DO_NOT_TRACK=1`) matches the recommended Netdata Docker setup.
- The `netdata-claim.sh` script with single-dash flags (`-token=`, `-rooms=`, `-url=`) is still functional; the `NETDATA_CLAIM_TOKEN` / `NETDATA_CLAIM_URL` / `NETDATA_CLAIM_ROOMS` env-var path is the modern recommended approach for containers and is documented in `src/claim/README.md`. Both remain valid.
- The example custom alert (`alarm:`, `on:`, `class:`, `lookup: average -5m unaligned of …`, `delay: down 15m multiplier 1.5 max 1h`) uses syntax consistent with the current health configuration reference.
- `version: "3.8"` in the Compose file is ignored by modern Docker Compose v2 but is still accepted; not technically wrong.
- Future improvement: consider recommending a Docker socket proxy in front of `/var/run/docker.sock` rather than mounting it directly into the container, which the upstream Docker docs now suggest for tighter security.
