# Validation Summary: How to Implement Vault Plugin Secrets Engines in Kubernetes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- HashiCorp Vault plugin secrets engines
- Vault SDK for Go
- Vault CLI plugin registration, enablement, and reload commands
- Kubernetes StatefulSet and init containers
- Docker plugin packaging
- Prometheus alerting rules

## Sources Consulted
- HashiCorp Vault plugin development documentation: https://developer.hashicorp.com/vault/docs/plugins/plugin-development
- HashiCorp Vault plugin architecture documentation: https://developer.hashicorp.com/vault/docs/plugins/plugin-architecture
- HashiCorp Vault register external plugins documentation: https://developer.hashicorp.com/vault/docs/plugins/register
- HashiCorp Vault upgrade plugins documentation: https://developer.hashicorp.com/vault/docs/plugins/upgrade
- HashiCorp Vault `plugin reload` command documentation: https://developer.hashicorp.com/vault/docs/commands/plugin/reload
- HashiCorp Vault `secrets enable` command documentation: https://developer.hashicorp.com/vault/docs/commands/secrets/enable
- Vault SDK `plugin` package reference: https://pkg.go.dev/github.com/hashicorp/vault/sdk/plugin
- Vault SDK `framework` package reference: https://pkg.go.dev/github.com/hashicorp/vault/sdk/framework
- HashiCorp Vault install/version documentation: https://developer.hashicorp.com/vault/docs/install

## Issues Found
- The main Go plugin example used `os.Args` and `os.Exit` without importing `os`. Added the missing import.
- The main Go plugin example used `plugin.APIClientMeta` and `plugin.VaultPluginTLSProvider`, but the current Vault examples use `api.PluginAPIClientMeta` and `api.VaultPluginTLSProvider` from `github.com/hashicorp/vault/api`. Added the API import and corrected those symbols.
- The plugin serving example used `plugin.Serve`; current Vault plugin development guidance recommends `plugin.ServeMultiplex` for multiplexing-capable auth and secrets plugins. Updated the call.
- The Kubernetes deployment snippet did not mention Vault's required `plugin_directory` configuration. Added a note to set `plugin_directory = "/vault/plugins"`.
- The Vault container image used the older shorthand `vault:1.15`. Updated it to the official `hashicorp/vault:1.21` image family shown in current Vault documentation.
- The plugin loader image runs as a non-root user but copies into an `emptyDir` volume. Added `securityContext.runAsUser: 0` for the init container so the copy and chmod operations can succeed.
- The initial plugin registration omitted a version even though the article discusses catalog version information. Added `-version=v1.0.0`, using Vault's documented leading-`v` semantic version format.
- The custom secrets engine enable command used `-plugin-name` and `plugin`. Current Vault CLI documentation enables a custom secrets plugin by passing the registered plugin name as the secrets engine type. Updated the command to `vault secrets enable -path=custom custom-plugin`.
- The Kubernetes application Go snippet redeclared the `token` parameter with `token :=`, which would not compile. Renamed the returned credential value to `credentialToken`.
- The plugin update example used `-version=2.0.0` without the leading `v`. Updated it to `v2.0.0`.
- The plugin update flow registered a new version and reloaded without pinning the desired version. Current Vault upgrade documentation requires pinning the version before reload for versioned plugin upgrades. Added the `sys/plugins/pins/secret/custom-plugin` write and updated reload flags to include `-type=secret` and `-scope=global`.
- The Prometheus section said it configured scraping but actually showed an alerting rule. Updated the text to describe alerting and changed the expression to use timer `_sum` and `_count` rates instead of comparing a raw metric directly to `1000`.

## Review Notes
The Go examples were reviewed against current Vault SDK references, but the local environment does not have the Go toolchain installed, so I could not compile them locally. The token generation and external revocation logic remain intentionally simplified examples.
