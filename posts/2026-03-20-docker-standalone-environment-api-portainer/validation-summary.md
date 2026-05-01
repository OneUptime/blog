# Validation Summary: How to Add a Docker Standalone Environment to Portainer via API

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer API
- Docker Engine Remote API
- Bash
- cURL
- Python 3

## Sources Consulted
- Portainer Docs: Add an environment via the Portainer API - https://docs.portainer.io/admin/environments/add/api
- Portainer Docs: Connect to the Docker API - https://docs.portainer.io/admin/environments/add/docker/api
- Portainer API Documentation (CE 2.39.1 OpenAPI) - https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Docker Docs: Configure remote access for Docker daemon - https://docs.docker.com/engine/daemon/remote-access/
- Docker Docs: Protect the Docker daemon socket - https://docs.docker.com/engine/security/protect-access/

## Issues Found
- The `POST /api/endpoints` example used a JSON body and a local `unix:///var/run/docker.sock` URL. I changed it to the documented `multipart/form-data` request format and a remote `tcp://10.0.7.10:2375` URL, which matches both the Portainer API contract and the post's stated goal of adding a remote Docker standalone environment.
- The type reference table mixed up `EndpointCreationType` values with environment `Type` values returned in API responses. I corrected the table to the current `EndpointCreationType` values documented by Portainer.
- The verification snippet treated every non-`1` status as offline. I updated it to map `1` to online, `2` to offline, and any other value to unknown, which matches the current Portainer endpoint status enum.

## Review Notes
- Portainer's current documentation labels direct Docker API connections as a legacy option and recommends the Edge Agent for most use cases.
- Docker's current documentation warns that exposing the Docker API without TLS is insecure. Port `2375` should be limited to trusted networks, and `2376` with TLS is the safer default when exposing the daemon remotely.
