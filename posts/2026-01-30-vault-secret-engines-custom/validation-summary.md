# Validation Summary: How to Build Vault Secret Engines Custom

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- HashiCorp Vault (custom secret engines / plugin SDK)
- Go (`github.com/hashicorp/vault/sdk` — framework, logical, plugin packages)
- `github.com/hashicorp/vault/api` (plugin client meta, TLS provider)
- `github.com/hashicorp/go-hclog`
- gRPC plugin architecture
- Vault CLI (`vault plugin register`, `vault secrets enable`, `vault lease …`)

## Sources Consulted
- Vault custom secret engine plugins guide: https://developer.hashicorp.com/vault/docs/plugins/plugin-development
- `vault plugin register` CLI: https://developer.hashicorp.com/vault/docs/commands/plugin/register
- `vault secrets enable` CLI: https://developer.hashicorp.com/vault/docs/commands/secrets/enable
- Vault server configuration reference: https://developer.hashicorp.com/vault/docs/configuration
- Vault SDK Go reference: https://pkg.go.dev/github.com/hashicorp/vault/sdk (framework, logical, plugin)
- Vault SDK source (`sdk/framework/field_data.go`) for type-return semantics of `TypeDurationSecond` and `TypeCommaStringSlice`
- Vault API Go reference: https://pkg.go.dev/github.com/hashicorp/vault/api (`PluginAPIClientMeta`, `VaultPluginTLSProvider`)

## Issues Found
1. **Missing `fmt` import in `backend.go`** — The `getClient` function used `fmt.Errorf("configuration not set")`, but the import block only included `context` and `sync`. Added `"fmt"` to the imports so the file compiles.
2. **Invalid Vault server config option `plugin_multiplexed = true`** — There is no `plugin_multiplexed` setting in `vault.hcl`. Plugin multiplexing is opted into by the plugin itself by calling `plugin.ServeMultiplex` (which the post already does in `main.go`). Removed the bogus line and replaced the comment with a brief note that multiplexing is plugin-side, not server-side.
3. **Build command inconsistent with project layout** — The build step ran `go build -o vault/plugins/myengine ./cmd/myengine`, but the project tree earlier in the post places `main.go` at the project root with no `cmd/` directory. Changed the build target to `.` to match the documented layout.

## Review Notes
- `framework.TypeDurationSecond` returning `int` (seconds) was verified against the current SDK source (`sdk/framework/field_data.go`) — the post's `data.Get("ttl").(int)` and subsequent `time.Duration(...) * time.Second` conversion is correct.
- `framework.TypeCommaStringSlice` returning `[]string` is correct.
- `plugin.ServeOpts` fields `BackendFactoryFunc`, `TLSProviderFunc`, and `Logger` are all current.
- `vault plugin register -version=…` and `vault secrets enable -plugin-version=…` flags are supported (added in Vault 1.12+).
- The `secretCredsRenew` handler manually constructs the response with TTL/MaxTTL instead of using `framework.LeaseExtend`. Both are valid; the manual approach is what the modern SDK examples favour.
- The post uses `BackendType: logical.TypeLogical` (correct for a secrets engine, vs. `logical.TypeCredential` for an auth method).
- Storage paths and helper functions (`logical.StorageEntryJSON`, `logical.ListResponse`, `logical.InmemStorage`, `logical.StaticSystemView`) all match the SDK exports.
