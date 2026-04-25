# Validation Summary: How to Configure TLS for Portainer Agent Communication

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Server
- Portainer Agent
- TLS / HTTPS
- Portainer API
- Docker
- Docker Compose
- OpenSSL

## Sources Consulted
- Portainer docs, Install Portainer Agent on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer docs, Add an environment via the Portainer API: https://docs.portainer.io/admin/environments/add/api
- Portainer docs, Using mTLS with Portainer: https://docs.portainer.io/advanced/mtls
- Portainer docs, General settings: https://docs.portainer.io/sts/admin/settings/general
- Portainer Agent source, README: https://github.com/portainer/agent/blob/develop/README.md
- Portainer Agent source, CLI options: https://github.com/portainer/agent/blob/develop/os/options.go
- Portainer Agent source, startup flow: https://github.com/portainer/agent/blob/develop/cmd/agent/main.go
- Portainer Agent source, self-signed cert generation: https://github.com/portainer/agent/blob/develop/crypto/tls.go
- Portainer source, endpoint creation handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_create.go
- Portainer source, agent environment creation defaults: https://github.com/portainer/portainer/blob/develop/app/react/portainer/environments/environment.service/create.ts
- Docker docs, Protect the Docker daemon socket: https://docs.docker.com/engine/security/https/

## Issues Found
- The post’s core claim was incorrect. The standard Portainer Agent on port `9001` does not support installing custom CA-signed certificates or configuring mTLS for that channel. I rewrote the title, description, introduction, and architecture explanation to reflect the supported behavior.
- The certificate-generation walkthrough was invalid for the standard Agent. I removed the OpenSSL CA/server/client certificate steps because the standard Agent generates its own self-signed certificate automatically at startup.
- The `docker run` and Docker Compose examples were wrong. The Agent binary does not support `--tlscacert`, `--tlscert`, or `--tlskey` for port `9001`, so I replaced those commands with the supported standard-Agent deployment and kept `AGENT_SECRET` as the only optional security-related runtime setting.
- The Portainer UI instructions were wrong. Standard Agent environments are added by entering `agent-host:9001` without a protocol, and there is no TLS file upload flow for that environment type. I corrected those steps.
- The API example was wrong. It used `EndpointCreationType=1` and uploaded TLS files, which matches a direct Docker API environment rather than an Agent environment. I corrected it to the Agent environment flow with `EndpointCreationType=2`, `URL=tcp://agent-host:9001`, `TLS=true`, `TLSSkipVerify=true`, and `TLSSkipClientVerify=true`.
- The certificate rotation section was incorrect. There is no supported custom-certificate rotation workflow for the standard Agent, so I replaced it with the accurate note that restarting the Agent regenerates its self-signed certificate.
- The TLS verification example was incorrect. The original `openssl s_client` example claimed a successful CA-validated verification, which is not true for the Agent’s self-signed cert. I replaced it with a `/ping` check over HTTPS using `curl -k`, which matches the Agent’s actual behavior.
- The troubleshooting section included an mTLS client-certificate error path that does not apply to the standard Agent. I replaced it with issues that do apply: self-signed certificate warnings, `AGENT_SECRET` mismatch, and connectivity checks on port `9001`.

## Review Notes
- The standard Portainer Agent still uses HTTPS on `9001`, but Portainer treats it differently from a direct Docker API TLS endpoint on `2376`.
- Portainer’s documented mTLS support is for the Edge Agent and is only available in Portainer Business Edition.
- Direct Docker API TLS remains a supported alternative for custom certificate management, but Portainer documents it as a legacy connection option.
