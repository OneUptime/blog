# Validation Summary: How to Implement Docker Image Allow Lists

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Docker Engine authorization plugins
- Open Policy Agent Docker authorization plugin
- Docker Registry
- Docker Scout
- Kubernetes admission control
- Kyverno ClusterPolicy validation
- Bash
- GitHub Actions

## Sources Consulted
- Docker Docs: Access authorization plugin, https://docs.docker.com/engine/extend/plugins_authorization/
- Open Policy Agent Docs: Docker authorization, https://www.openpolicyagent.org/docs/docker-authorization
- OPA Docker Authz repository documentation, https://github.com/open-policy-agent/opa-docker-authz
- Docker Docs: docker scout cves CLI reference, https://docs.docker.com/reference/cli/docker/scout/cves/
- Kyverno Docs: validate rules and failureAction, https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno policy library: Restrict Image Registries, https://kyverno.io/policies/best-practices/restrict-image-registries/restrict-image-registries/
- Kyverno policy library: Require Images Use Checksums, https://kyverno.io/policies/other/require-image-checksum/require-image-checksum/
- Docker Docs: Dockerfile FROM reference, https://docs.docker.com/reference/builder
- GitHub Docs: Workflow syntax for GitHub Actions, https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions

## Issues Found
- The OPA Docker plugin install command used an unpinned `latest` image and the daemon configuration did not match the installed plugin name. Updated the command to install the documented managed plugin with an alias and configured Docker to use that alias.
- The OPA policy matched `input.Path == "/containers/create"`, but Docker API requests commonly include a version prefix such as `/v1.38/containers/create`. Updated the policy to use the OPA Docker plugin's parsed `PathArr` fields.
- The OPA policy allowed any request whose path was not exactly `/containers/create`, which could bypass container-create enforcement when paths were versioned. Replaced that logic with a `container_create_request` helper.
- The Rego example used newer `some ... in ...` iteration while the pinned OPA Docker authz plugin documentation shows older OPA versions. Replaced it with array iteration syntax compatible with that plugin line.
- The Docker Scout scripts parsed text output with `grep`, which is fragile and case-sensitive. Updated them to use `docker scout cves --exit-code` with `--only-severity critical` and to treat scan failures as blocking conditions.
- The first Kyverno policy used top-level `spec.validationFailureAction`, which Kyverno now documents as deprecated. Moved enforcement to `validate.failureAction`.
- The first Kyverno policy required `initContainers` to exist, causing Pods without init containers to fail unexpectedly. Marked `initContainers` and `ephemeralContainers` as optional using Kyverno anchors.
- The digest policy only checked regular containers and used deprecated top-level failure action. Updated it to use `validate.failureAction` and cover optional init and ephemeral containers.
- The CI section claimed to scan Compose files, but the script only scans Dockerfiles. Narrowed the claim to Dockerfiles.
- The Dockerfile parsing script did not handle `FROM --platform=... image AS stage` correctly and was unsafe for Dockerfile paths containing spaces. Updated it to use `find -print0` and parse optional `FROM` flags.

## Review Notes
- The registry firewall examples are directionally correct but simplified. In production, domain-based blocking with `iptables` needs care because registry hostnames can resolve to changing IP ranges and Docker Hub uses multiple endpoints.
- The example digest values are placeholders and must be replaced with real image digests before use.
