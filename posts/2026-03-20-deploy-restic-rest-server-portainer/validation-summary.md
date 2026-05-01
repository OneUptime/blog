# Validation Summary: How to Deploy Restic with REST Server via Portainer - Rest Server

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Restic
- rest-server
- Docker / Docker Compose
- TLS certificates

## Sources Consulted
- Rest Server official README: https://github.com/restic/rest-server
- Restic documentation, Preparing a new repository / REST Server: https://restic.readthedocs.io/en/stable/030_preparing_a_new_repo.html
- Restic documentation, Restoring from backup: https://restic.readthedocs.io/en/stable/050_restore.html
- Restic documentation, Docker Container: https://restic.readthedocs.io/en/stable/020_installation.html
- Portainer documentation, Edge Jobs: https://docs.portainer.io/2.33-lts/user/edge/jobs
- Rest Server Docker entrypoint (official source): https://raw.githubusercontent.com/restic/rest-server/master/docker/entrypoint.sh
- Restic Docker entrypoint (official source): https://raw.githubusercontent.com/restic/restic/master/docker/entrypoint.sh
- Restic Dockerfile (official source): https://raw.githubusercontent.com/restic/restic/master/docker/Dockerfile

## Issues Found
- The stack enabled `--tls` but did not provide a certificate or key. I updated the stack to mount certificate files and pass `--tls-cert`, `--tls-key`, and `--tls-min-ver 1.3`, which matches the official `rest-server` flags.
- The post used `htpasswd` inside the container to create users. I replaced this with the documented `create_user` helper that ships with the official `restic/rest-server` image.
- The client examples used HTTPS but omitted certificate validation guidance. I updated the commands to use `--cacert /path/to/ca.crt` and noted that it can be omitted when the certificate is already trusted on the client, matching restic's documented TLS behavior.
- The automation section claimed a Portainer stack snippet was a cron job, but the YAML shown had no scheduler and the `restic/restic` image entrypoint runs `restic`, so `sh -c ...` would not execute as written. I replaced that section with a wrapper script intended for Portainer Edge Jobs, which Portainer documents as the scheduling feature for Edge-managed Docker Standalone hosts.

## Review Notes
- Portainer Edge Jobs are documented as an Edge Compute feature for Docker Standalone environments that use `/etc/cron.d`; they are not a generic scheduler for all Portainer stack deployments.
- The post still uses `:latest` image tags. That is workable, but pinning a tested image tag would make the deployment more reproducible in the future.
