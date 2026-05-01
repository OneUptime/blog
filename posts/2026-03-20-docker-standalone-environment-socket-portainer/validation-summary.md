# Validation Summary: How to Add a Docker Standalone Environment to Portainer via Socket

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Portainer HTTP API
- `curl`
- Python 3

## Sources Consulted
- Portainer docs: Add an environment via the Portainer API - https://docs.portainer.io/admin/environments/add/api
- Portainer docs: Connect to the Docker Socket - https://docs.portainer.io/admin/environments/add/docker/socket
- Portainer docs: API documentation - https://docs.portainer.io/api/docs
- Portainer source: `endpoint_create.go` - https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_create.go
- Portainer source: `authenticate.go` - https://github.com/portainer/portainer/blob/develop/api/http/handler/auth/authenticate.go
- Portainer source: `portainer.go` - https://github.com/portainer/portainer/blob/develop/api/portainer.go

## Issues Found
- The post described socket connections too generically. Portainer documents socket connections as local-host only and requiring the Portainer Server container to have Docker socket access. I updated the introduction and prerequisites to reflect that.
- The UI procedure was too generic for a socket-based Docker Standalone environment. I corrected it to the documented flow: `Docker Standalone` -> `Start Wizard` -> `Socket`, including the socket-path override and bind-mount requirement.
- The API example used a JSON request body for `POST /api/endpoints`. Current Portainer expects `multipart/form-data` fields for this endpoint. I changed the example to use `curl -F` with `Name` and `EndpointCreationType`.
- The authentication example used lowercase JSON keys. Portainer accepts case-insensitive JSON field matching, but the official API shape uses `Username` and `Password`, so I aligned the example with the documented payload.
- The environment type table had incorrect numeric mappings. It mixed creation types and environment types, and incorrectly labeled value `4` as Docker API and value `7` as generic Kubernetes. I corrected the table to the current Portainer creation-type values.
- The verification snippet treated every non-`1` status as offline. Portainer defines `1` as up and `2` as down, so I updated the script to distinguish `Online`, `Offline`, and unknown values precisely.

## Review Notes
- Portainer currently labels direct Docker socket connections as a legacy option and recommends the Edge Agent for most use cases. The post remains technically valid for socket-based setup.
