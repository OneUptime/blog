# Validation Summary: How to Configure Artifact Storage for CI/CD on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Sonatype Nexus Repository Manager
- systemd
- Nginx reverse proxy
- Maven repositories
- npm registry configuration
- Docker registry
- Jenkins Pipeline
- Woodpecker CI
- Nexus Repository cleanup policies and REST API

## Sources Consulted
- Sonatype Nexus Repository Download: https://help.sonatype.com/en/download.html
- Sonatype Install Self-Hosted Nexus Repository: https://help.sonatype.com/en/install-nexus-repository.html
- Sonatype Run as a Service: https://help.sonatype.com/en/run-as-a-service.html
- Sonatype Configuring the Runtime Environment: https://help.sonatype.com/en/configuring-the-runtime-environment.html
- Sonatype Nexus Repository System Requirements: https://help.sonatype.com/en/sonatype-nexus-repository-system-requirements.html
- Sonatype Repository Types: https://help.sonatype.com/en/repository-types.html
- Sonatype Maven Repositories: https://help.sonatype.com/en/maven-repositories.html
- Sonatype Docker Registry / Port Connectors: https://help.sonatype.com/en/docker-registry.html
- Sonatype Docker Reverse Proxy Strategies: https://help.sonatype.com/en/docker-repository-reverse-proxy-strategies.html
- Sonatype Configuring npm: https://help.sonatype.com/en/configuring-npm.html
- Sonatype npm Security: https://help.sonatype.com/en/npm-security.html
- Sonatype Publishing npm Packages: https://help.sonatype.com/en/publishing-npm-packages.html
- Sonatype Cleanup Policies: https://help.sonatype.com/en/cleanup-policies.html
- Sonatype Cleanup Policies API: https://help.sonatype.com/en/cleanup-policies-api.html
- npm CLI configuration docs: https://docs.npmjs.com/cli/v10/using-npm/config/
- Woodpecker CI Secrets: https://woodpecker-ci.org/docs/next/usage/secrets
- Woodpecker CI Volumes: https://woodpecker-ci.org/docs/next/usage/volumes

## Issues Found
- The Nexus installation section used the outdated 3.76.1 Unix archive and stated Java 11/17 was required. Updated the example to Nexus Repository 3.92.2 for Linux x86-64 and noted that current distributions include a bundled Java runtime.
- The stated 4GB RAM requirement was too low for current small deployments. Updated it to about 8GB RAM.
- The created `/opt/nexus-data` directory did not match the JVM options, which still pointed at the default `../sonatype-work/nexus3` path. Updated the JVM paths, log paths, heap dump path, monitoring commands, and admin password path to consistently use `/opt/nexus-data/sonatype-work/nexus3`.
- The systemd unit included `PIDFile=/opt/nexus/bin/nexus.pid`, which is no longer applicable for Nexus Repository 3.78.0 and later. Removed it and aligned the timeout setting with Sonatype's current systemd guidance.
- The initial admin password command omitted `sudo`, which may fail because the data directory is owned by the `nexus` user. Updated the command to use `sudo cat`.
- The Maven section said to create three repositories but listed four. Corrected the count.
- The npm authentication example used unscoped `_auth` and `always-auth`; npm and Sonatype recommend repository-scoped auth entries or `npm adduser --auth-type=legacy` for Nexus. Updated the snippet accordingly.
- The Woodpecker example used an obsolete/incorrect `secrets` mapping for a `.woodpecker.yml` file. Updated it to use `from_secret` under `environment`.
- The cleanup policy REST API payload used invalid fields (`mode`, nested `criteria`, `lastBlobUpdated`, and `isPrerelease`). Updated it to the documented flat `criteriaLastBlobUpdated` and `criteriaReleaseType` fields, and noted that the cleanup-policies API is a Nexus Repository Pro 3.70.0+ API.

## Review Notes
- Docker port connectors and the Nginx reverse proxy approach are valid, though Sonatype also documents path/subdomain reverse-proxy strategies that avoid reserving many Docker connector ports.
- The cleanup policy API creates a policy; repositories still need the policy assigned and cleanup/compact tasks scheduled to reclaim disk space.
