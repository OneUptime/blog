# Validation Summary: Why Does One Pull Request Trigger Two Woodpecker Pipelines? Separating `push` and `pull_request` Events

## Status

validated

## Post Type

Technical guide / configuration reference

## Technologies Covered

- Woodpecker CI 3.17.x
- Git forge webhooks and pull-request events
- Woodpecker workflow and step conditions
- Woodpecker built-in environment variables
- Woodpecker secrets and fork approval controls
- Woodpecker Docker Buildx plugin
- YAML workflow configuration
- Go 1.26 container image and `go test`

## Sources Consulted

- Woodpecker workflow syntax, conditions, events, branch filters, path filters, and global workflow conditions: https://woodpecker-ci.org/docs/usage/workflow-syntax
- Woodpecker multiple-workflow behavior and flow control: https://woodpecker-ci.org/docs/usage/workflows
- Woodpecker built-in environment variables: https://woodpecker-ci.org/docs/usage/environment
- Woodpecker project settings, pull-request handling, approvals, and pipeline cancellation: https://woodpecker-ci.org/docs/usage/project-settings
- Woodpecker secret event and plugin filters: https://woodpecker-ci.org/docs/usage/secrets
- Woodpecker forge feature matrix: https://woodpecker-ci.org/docs/administration/configuration/forges/overview
- Woodpecker Docker Buildx plugin settings and examples: https://woodpecker-ci.org/plugins/docker-buildx
- Woodpecker privileged-plugin server setting: https://woodpecker-ci.org/docs/administration/configuration/server#plugins_privileged
- Woodpecker 3.x migration notes for plugin image tags and privileged plugins: https://woodpecker-ci.org/migrations#image-tags
- Official Docker Hub tags for `woodpeckerci/plugin-docker-buildx`: https://hub.docker.com/r/woodpeckerci/plugin-docker-buildx/tags
- Woodpecker 3.17 source for pipeline metadata, image matching, workflow compilation, and forge event conversion: https://github.com/woodpecker-ci/woodpecker/tree/v3.17.0
- GitHub webhook delivery inspection and failed-delivery behavior: https://docs.github.com/en/webhooks/testing-and-troubleshooting-webhooks/viewing-webhook-deliveries and https://docs.github.com/en/webhooks/using-webhooks/handling-failed-webhook-deliveries
- GitLab webhook delivery, retry, and idempotency behavior: https://docs.gitlab.com/user/project/integrations/webhooks/
- Go 1.26 release notes and release history: https://go.dev/doc/go1.26 and https://go.dev/doc/devel/release

## Issues Found

1. **Webhook delivery IDs were presented as Woodpecker pipeline metadata.** Woodpecker's pipeline model does not expose a forge delivery ID. Changed the diagnostic checklist to record Woodpecker pipeline creation times and correlate them separately with IDs and timestamps in the forge's webhook-delivery log. Also qualified retries and redeliveries as forge-dependent because, for example, GitLab can retry certain failures while GitHub does not automatically redeliver failed webhook deliveries.
2. **The Docker Buildx examples would authenticate to the wrong registry.** `repo: registry.example.com/acme/api` names the output image, but the plugin's separate `registry` setting defaults to Docker Hub. Added `registry: registry.example.com` to both publishing examples so the supplied username and password authenticate to the intended registry.
3. **The Docker Buildx runtime requirements were incomplete.** Woodpecker 3.x no longer grants this plugin privileged execution by default. Pinned both examples to the current official `woodpeckerci/plugin-docker-buildx:6.1.1` image and added the matching `WOODPECKER_PLUGINS_PRIVILEGED` administrator setting required to run it in privileged mode.
4. **The release row conflated `tag` and `release` branch semantics.** A `branch` filter is ignored for `tag` events, but release target/ref metadata depends on the forge. Updated the event matrix to distinguish tag behavior from forge-dependent release metadata.
5. **The project-settings section overstated the available per-event controls.** Current Woodpecker project settings can disable pull-request handling, but they do not provide a general switch for every push, tag, or release event. Narrowed the guidance to the project-level pull-request setting relevant to this guide.

## Review Notes

- All YAML examples parse successfully and every complete workflow example passes `woodpecker-cli` 3.17.0 linting in strict mode when the documented privileged-plugin allowlist is supplied.
- The `golang:1.26` and `woodpeckerci/plugin-docker-buildx:6.1.1` image manifests exist, and Go 1.26 is a stable release as of the validation date.
- `release` webhook support is forge-dependent: current Woodpecker documentation lists support for GitHub, Gitea, Forgejo, and GitLab, but not Bitbucket or Bitbucket Datacenter.
- Woodpecker secrets default to `push`, `tag`, and `deployment` events. A secret needed by `release` or `manual` workflows must have that event enabled explicitly; pull-request secrets remain disabled by default.
