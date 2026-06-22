# Validation Summary: How to Debug Locally with Telepresence in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Telepresence
- Telepresence Traffic Manager
- Telepresence CLI
- HTTP-filtered intercepts
- Docker and Docker Compose
- VS Code and IntelliJ run configurations
- Python Flask, Node.js, and Go development workflows

## Sources Consulted
- Telepresence client installation documentation: https://telepresence.io/docs/install/client
- Telepresence Traffic Manager installation documentation: https://telepresence.io/docs/install/manager
- Telepresence CLI reference for `telepresence intercept`: https://telepresence.io/docs/reference/cli/telepresence_intercept
- Telepresence workload engagement documentation: https://telepresence.io/docs/reference/engagements/cli
- Telepresence client configuration documentation: https://telepresence.io/docs/reference/config
- Telepresence environment variables documentation: https://telepresence.io/docs/reference/environment
- Telepresence volume mounts documentation: https://telepresence.io/docs/reference/volume
- Telepresence DNS resolution documentation: https://telepresence.io/docs/reference/dns
- Telepresence uninstall CLI reference: https://telepresence.io/docs/reference/cli/telepresence_uninstall
- Telepresence GitHub releases for current release artifact names: https://github.com/telepresenceio/telepresence/releases

## Issues Found
- The Linux install command used the older `app.getambassador.io` download path. Updated it to the current GitHub release artifact path used by official Telepresence installation docs.
- The Traffic Manager section said `telepresence connect` installs the Traffic Manager automatically. Current docs document `telepresence helm install` as the install command, so the section now installs first and then connects.
- `telepresence list` was described as listing services. Current Telepresence output lists intercept-eligible workloads, so the description now says workloads.
- Several examples sourced files created with `--env-file` without setting shell syntax. Current docs state the default syntax is `docker`; shell sourcing should use `--env-syntax sh:export`, so shell-sourced examples were updated.
- The header configuration example used an `InterceptSpecification` resource and `telepresence intercept --specification`, which are not in the current CLI reference. Replaced it with current repeatable `--http-header` usage.
- The Preview URL examples used `telepresence login` and `--preview-url=true`, which are not present in the current Telepresence OSS CLI reference. Replaced the section with current HTTP path filter examples using `--http-path-prefix`.
- The client config example included unsupported `cloud.skipLogin` and local `telepresenceAPI.port` keys. Removed those from the client config snippet.
- The namespace-specific config example used an unsupported `namespaces` environment mapping. Replaced it with documented `cluster.mappedNamespaces` configuration.
- The troubleshooting reset command used `telepresence uninstall --everything`, which is not a current `telepresence uninstall` flag. Removed that command from the reset flow.
- The DNS section suggested pinging a Kubernetes service DNS name. Replaced it with an HTTP connectivity check because ICMP is not a reliable service-level test for Kubernetes Services.

## Review Notes
- Docker Compose `network_mode: host` is platform-sensitive and works differently outside Linux. The example remains plausible for Linux-based local development, but a future article could use `telepresence connect --docker`, `telepresence docker-run`, or Telepresence Compose extensions for a more portable Docker workflow.
- The post uses generic service and workload names. Readers still need to adapt commands to their actual Kubernetes workload names, service names, namespaces, and service port identifiers.
