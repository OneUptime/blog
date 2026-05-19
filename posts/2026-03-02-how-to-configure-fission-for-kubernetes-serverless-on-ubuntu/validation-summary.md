# Validation Summary: How to Configure Fission for Kubernetes Serverless on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Kubernetes
- kubectl
- Helm
- Fission
- Python and Flask
- Node.js
- HTTP triggers
- Timer triggers
- Fission package builder

## Sources Consulted
- Fission installation documentation: https://fission.io/docs/installation/
- Fission environment variables documentation: https://fission.io/docs/installation/env_vars/
- Fission Python functions documentation: https://fission.io/docs/usage/languages/python/
- Fission Node.js functions documentation: https://fission.io/docs/usage/languages/nodejs/
- Fission environment documentation: https://fission.io/docs/usage/function/environments/
- Fission function execution documentation: https://fission.io/docs/usage/function/executor/
- Fission HTTP trigger documentation: https://fission.io/docs/usage/triggers/http-trigger/
- Fission CLI reference for function, package, HTTP trigger, and time trigger commands: https://fission.io/docs/reference/fission-cli/
- Fission v1.23.0 CLI `--help` output from the official GitHub release binary.

## Issues Found
- Updated the Fission install flow from the older v1.19.0 examples to the current v1.23.0 release and added the required CRD installation step before the Helm install.
- Corrected the Helm chart version format from `v1.19.0` to `1.23.0`, matching the Fission chart version syntax.
- Updated Fission runtime and builder images from the older Docker Hub-style `fission/*:1.9.0` names to the documented `ghcr.io/fission/*` images.
- Corrected router environment variable setup so NodePort examples build a usable `host:port` value and curl examples use `http://$FISSION_ROUTER/...`.
- Corrected the Node.js query-string example to parse `context.request.url`, matching the documented Fission Node.js request interface.
- Fixed the Python dependency package example by adding a `build.sh`, creating a zip source archive, passing `--buildcmd`, and using an explicit `user.main` entrypoint.
- Changed the timer trigger schedule from a five-field cron expression to `@hourly`, which matches Fission's documented time trigger cron handling.
- Corrected function log commands to use `fission function log` and changed the monitoring pod check to `fission function pods`.
- Clarified that `fission function test` invokes a function rather than returning execution statistics.
- Added `--executortype newdeploy` to the resource scaling example because min/max scale settings are documented for the newdeploy executor.
- Revised the cold-start explanation to avoid overstating pool behavior and to mention `newdeploy --minscale 1` for always-running replicas.

## Review Notes
The post is now aligned with Fission v1.23.0 documentation as of 2026-05-19. Some examples still assume a simple single-node or directly reachable NodePort setup; production clusters may need LoadBalancer, ingress, firewall, or port-forward configuration depending on the environment.
