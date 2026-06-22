# Validation Summary: How to Audit Docker with CIS Benchmarks

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Engine
- Docker Bench for Security
- CIS Docker Benchmark
- Docker Compose
- Dockerfile
- Linux audit rules
- GitHub Actions
- Ansible
- Prometheus exporter configuration
- `jq`

## Sources Consulted
- CIS Docker Benchmark landing page: https://www.cisecurity.org/benchmark/docker
- Docker Hardened Images CIS overview: https://docs.docker.com/dhi/core-concepts/cis/
- Docker Bench for Security README: https://github.com/docker/docker-bench-security
- Docker Bench for Security script/options: https://github.com/docker/docker-bench-security/blob/master/docker-bench-security.sh
- Docker Bench output JSON implementation: https://github.com/docker/docker-bench-security/blob/master/functions/output_lib.sh
- Docker Engine `dockerd` reference: https://docs.docker.com/reference/cli/dockerd/
- Docker Engine deprecated features: https://docs.docker.com/engine/deprecated/
- Docker Compose version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose deploy specification: https://docs.docker.com/reference/compose-file/deploy/
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/

## Issues Found
- The post used the published `docker/docker-bench-security` image even though the upstream Docker Bench README says that image is out of date and a manual build is required. I updated the examples to clone the upstream repository, build a local `docker-bench-security` image, and use that image in the Docker, Compose, GitHub Actions, and reporting examples.
- The Docker Bench "JSON output" example implied that `-l` directly writes only JSON. Docker Bench writes a text log and a companion `.json` file. I clarified the comment and adjusted the reporting script to read `docker-bench-${DATE}.log.json`.
- The report script used a non-existent `--json-output-file` option. I replaced it with Docker Bench's documented `-l FILE` option.
- The `jq` summary treated `.checks` as an array of check results, but Docker Bench JSON stores `.checks` as a count and stores per-check results under `.tests[].results[]`. I updated the query to count results from `.tests[].results[]` and return warning descriptions as an array.
- The daemon configuration included `disable-legacy-registry`, which Docker removed in Docker Engine 19.03 after disabling legacy registry support earlier. I replaced that section with the current `icc: false` daemon option for restricting default bridge inter-container communication.
- Several `daemon.json` snippets included `//` comments inside `json` code blocks. Because `daemon.json` must be valid JSON, I removed those comments from the snippets.
- The Compose examples used the obsolete top-level `version: '3.8'` field. I removed it so the snippets align with the current Compose Specification.

## Review Notes
- The TLS example uses the daemon `hosts` key, which is valid in `daemon.json`, but operators using systemd must avoid setting the same daemon option both in the systemd unit and in `daemon.json`.
- The AppArmor, SELinux, capabilities, no-new-privileges, read-only filesystem, resource limit, and Dockerfile examples are syntactically valid and align with Docker's documented security controls, but exact runtime behavior depends on host kernel, LSM, and image contents.
