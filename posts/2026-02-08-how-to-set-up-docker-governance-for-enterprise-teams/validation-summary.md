# Validation Summary: How to Set Up Docker Governance for Enterprise Teams

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker and Dockerfile syntax
- Docker CLI image build, push, and inspect commands
- Docker Compose service, deploy resources, healthcheck, and logging configuration
- Open Policy Agent Rego policies
- Trivy image scanning
- Docker Registry HTTP API V2
- jq, yq, Bash, curl, and awk

## Sources Consulted
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker CLI image reference: https://docs.docker.com/reference/cli/docker/image/
- Docker image push reference: https://docs.docker.com/reference/cli/docker/image/push/
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker json-file logging driver documentation: https://docs.docker.com/engine/logging/drivers/json-file/
- CNCF Distribution Registry HTTP API V2: https://distribution.github.io/distribution/spec/api/
- Open Policy Agent Rego `if` keyword documentation: https://www.openpolicyagent.org/docs/policy-reference/keywords/if
- Trivy filtering and severity documentation: https://trivy.dev/docs/latest/configuration/filtering/
- mikefarah yq evaluate documentation: https://mikefarah.gitbook.io/yq/commands/evaluate
- Local Docker CLI help for `docker inspect --format`

## Issues Found
- The base image example used an invalid placeholder digest, `sha256:abc123...`. Updated it to the current Docker Hub manifest-list digest for `python:3.12.2-slim` so the `FROM image@digest` syntax is concrete and valid.
- The OPA policy used older Rego set-rule syntax. Updated the example to import `rego.v1` and use `deny contains msg if { ... }`, matching current OPA v1 policy style.
- The label validation script used Docker Go-template indexing that can print non-empty placeholder text for missing values. Updated it to inspect the image as JSON and read labels with `jq`, returning an empty value when the label is absent.
- The Compose validation script used dot-path yq lookups for service names. Updated it to bracket notation so service names containing hyphens remain valid.
- The registry retention script said tags were sorted by creation date, but the Registry HTTP API tag listing is lexically ordered and does not provide creation dates. Updated the script to explicitly handle `YYYYMMDD` tags, apply the retention cutoff, and keep the newest tags.
- The registry retention delete example attempted to delete by tag. The Registry HTTP API requires manifest deletion by digest, so the script now resolves `Docker-Content-Digest` with a `HEAD` request before showing the delete call.
- The registry retention script counted one tag when the filtered tag list was empty. Updated the count to ignore blank lines.
- The governance report divided by zero when no containers were running. Added an explicit zero-container summary path.
- The governance report did not treat Docker template placeholder output as missing for labels or health checks. Added checks for `<no value>`.

## Review Notes
- The Docker Compose resource, healthcheck, and logging fields are valid Compose service/deploy configuration. Compose deploy support is platform-dependent, so enforcement should still be verified in the target deployment environment.
- The registry retention example assumes GNU `date` and dated tags in `YYYYMMDD` format. Other tag schemes or macOS/BSD environments would need small script adjustments.
