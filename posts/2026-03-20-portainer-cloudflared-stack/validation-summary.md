# Validation Summary: How to Deploy Cloudflared as a Portainer Stack - Part 3

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Cloudflare Tunnel / `cloudflared`
- Portainer stacks
- Docker Compose
- Cloudflare DNS

## Sources Consulted
- Cloudflare Docs, Configuration: https://developers.cloudflare.com/tunnel/configuration/
- Cloudflare Docs, Routing: https://developers.cloudflare.com/tunnel/routing/
- Cloudflare Docs, Monitoring: https://developers.cloudflare.com/tunnel/monitoring/
- Cloudflare Docs, Tunnel run parameters: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/run-parameters/
- Cloudflare Docs, Useful commands: https://developers.cloudflare.com/tunnel/advanced/local-management/tunnel-useful-commands/
- Cloudflare Docs, Deploy cloudflared replicas: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/tunnel-availability/deploy-replicas/
- Cloudflare Docs, System requirements: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/configure-tunnels/tunnel-availability/system-requirements/
- Cloudflare source, Dockerfile: https://github.com/cloudflare/cloudflared/blob/master/Dockerfile
- Cloudflare source, `cmd/cloudflared/main.go`: https://github.com/cloudflare/cloudflared/blob/master/cmd/cloudflared/main.go

## Issues Found
- The compose healthcheck in config-file mode used `cloudflared tunnel info` with no tunnel argument. Cloudflare documents `cloudflared tunnel info <NAME or UUID>`, so the example healthcheck was invalid. I removed the broken healthcheck block.
- The DNS section treated the CLI route commands as a generic step and used `cloudflared tunnel route list` as verification. Cloudflare documents `route dns` for locally-managed tunnels and does not document a hostname-route listing command. I scoped the step to config mode, removed the invalid verification command, and added the required `cert.pem` prerequisite note for `route dns`.
- The high-availability example omitted `command: tunnel --no-autoupdate run` on both replica containers. The official `cloudflare/cloudflared` image defaults to `CMD ["version"]`, so the containers would otherwise print the version and exit. I added the run command to both services.
- The Step 6 heading described the example as “Multi-Tunnel,” but the snippet actually runs multiple replicas of the same tunnel with the same token. I renamed the section to “Multi-Replica” and clarified that host-level redundancy requires running replicas on different Docker hosts.
- The conclusion implied token mode is for “single-tunnel setups.” Cloudflare’s current model is that token mode is for remotely-managed tunnels whose configuration lives in Cloudflare. I corrected that wording.

## Review Notes
- Cloudflare currently recommends remotely-managed tunnels for most use cases and supports `cloudflared` releases within one year of the most recent release. The post is now technically correct, but readers should still keep the deployed image reasonably current.
