# Validation Summary: How to Implement Falco Plugins Development

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Falco plugins
- Falco plugin SDK for Go
- Falco rules and configuration
- Go shared-library builds
- GitHub webhooks
- Kubernetes DaemonSets, Services, and Ingress

## Sources Consulted
- Falco Go SDK walkthrough: https://falco.org/docs/reference/plugins/go-sdk-walkthrough/
- Falco plugin developer guide: https://falco.org/docs/developer-guide/plugins/how-to-develop/
- Falco plugin usage and configuration docs: https://falco.org/docs/concepts/plugins/usage/
- Falco rule condition docs: https://falco.org/docs/concepts/rules/conditions/
- Falco plugin SDK Go package docs: https://pkg.go.dev/github.com/falcosecurity/plugin-sdk-go/pkg/sdk
- Falco plugin SDK plugins package docs: https://pkg.go.dev/github.com/falcosecurity/plugin-sdk-go/pkg/sdk/plugins
- Falco plugin SDK source package docs: https://pkg.go.dev/github.com/falcosecurity/plugin-sdk-go/pkg/sdk/plugins/source
- Falco plugin SDK examples: https://github.com/falcosecurity/plugin-sdk-go/tree/main/examples
- GitHub webhook events and payloads: https://docs.github.com/en/webhooks/webhook-events-and-payloads
- GitHub webhook signature validation: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/

## Issues Found
- The prerequisites claimed Go 1.21 or later was required. The official Falco plugin developer guide lists Go 1.19 or later, and the current SDK module declares Go 1.17, so the post now says Go 1.19 or later.
- The setup commands omitted the `github.com/alecthomas/jsonschema` dependency used by the `InitSchema` snippet. Added the missing `go get` command.
- The `plugin.go` snippet used `json` and `jsonschema` without importing them, and imported source/extractor packages it did not use. Fixed the imports.
- The webhook signature code referenced an undefined `validateSignature` helper and attempted validation before reading the request body. Added a HMAC-SHA256 implementation using the raw body and GitHub's `X-Hub-Signature-256` format.
- The `Init` example failed on an empty init config string. Added a guard that keeps defaults when no config is supplied.
- The force-push rule referenced `json.value[/forced]` without loading the JSON plugin and without matching the custom event wrapper. Added a `github.forced` extractor field and updated the rule to use it.
- The pull request merge rule checked `github.pr.state = "merged"`, but GitHub pull request payloads use a boolean `pull_request.merged` flag. Added `github.pr.merged` and updated the rule.
- The collaborator rule claimed to detect admin permission grants using a field not reliably present in the shown payload. Changed it to detect collaborator additions, which matches the GitHub `member` event and the fields extracted by the example.
- The Makefile install target copied rules into `~/.falco/rules.d/` without creating that directory. Added it to the `mkdir -p` command.
- The `file libgithub.so` example showed a macOS Mach-O object for a Linux Falco `.so` workflow. Updated the example output to an ELF shared object.
- The local curl test would fail if the configured webhook secret was left in place because the request is unsigned. Added a note to leave `webhook_secret` empty for that local test.
- The Kubernetes DaemonSet mounted a binary plugin from a ConfigMap without showing `binaryData` and size constraints. Updated the example to use a custom Falco image containing the plugin library.

## Review Notes
Go was not installed in the local environment, so I could not compile the snippets directly. The review was performed against current official Falco, Go package, GitHub webhook, and Kubernetes documentation.
