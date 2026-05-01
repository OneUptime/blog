# Validation Summary: How to Deploy a Go Application with Epinio

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- Epinio
- Go
- Paketo Buildpacks
- Kubernetes
- HTTP servers in Go (`net/http`)

## Sources Consulted
- Epinio supported applications: https://docs.epinio.io/references/supported_applications
- Epinio quickstart: https://docs.epinio.io/tutorials/quickstart
- Epinio single developer journey: https://docs.epinio.io/tutorials/single-dev-workflow
- Epinio `epinio push` command reference: https://docs.epinio.io/references/commands/cli/epinio_push
- Epinio `epinio target` command reference: https://docs.epinio.io/references/commands/cli/epinio_target
- Epinio `epinio app list` command reference: https://docs.epinio.io/references/commands/cli/app/epinio_app_list
- Epinio `epinio app show` command reference: https://docs.epinio.io/references/commands/cli/app/epinio_app_show
- Epinio `epinio app delete` command reference: https://docs.epinio.io/references/commands/cli/app/epinio_app_delete
- Paketo Go Buildpack how-to: https://paketo.io/docs/howto/go/
- Paketo Go Buildpack reference: https://paketo.io/docs/reference/go-reference/
- Go modules reference: https://go.dev/doc/modules/gomod-ref
- Go package documentation for `net/http`: https://pkg.go.dev/net/http

## Issues Found
1. **The post was not actually using Go examples**: The original tutorial was titled as a Go deployment guide, but its application examples were a Bash script using `nc` and a Node.js server. I replaced those with a minimal Go HTTP server that uses `net/http`, listens on `PORT` with an `8080` fallback, and matches the guide's stated language.
2. **The Go setup step was incomplete for a Go buildpack-based deployment**: The original setup instructions were language-agnostic placeholders. I added `go mod init example.com/my-app` and a local Go prerequisite so the tutorial now creates a real Go module, which aligns with Paketo's documented Go module detection behavior.
3. **Namespace verification was using the wrong command for the stated purpose**: `epinio namespace show my-apps` shows namespace details, but it does not verify which namespace is currently targeted. I changed the verification command to `epinio target`, which is the documented command for showing the current target namespace.
4. **Route discovery and testing commands were brittle and could fail against current Epinio output**: The original `grep Routes | awk '{print $2}'` logic assumed a specific `epinio app show` text format and the `open` command assumed macOS. I changed this to use `epinio app show my-app` for route inspection and explicit `curl` examples for testing, with a browser instruction that is not OS-specific.
5. **The custom route example needed an operational caveat**: A custom `--route` only works when the hostname resolves to the cluster ingress. I added a note to the command example to make that requirement explicit.
6. **The update step claimed behavior not established by the sources reviewed**: The post said "Epinio performs a rolling update." The official docs reviewed clearly show rebuild and redeploy behavior, but I did not find a source in the reviewed command/tutorial pages that justified that exact claim. I replaced it with a neutral verification step.

## Review Notes
- Current Epinio documentation is internally inconsistent in some places: the quickstart still shows `epinio apps list` and `epinio delete`, while the current command reference and current single-developer tutorial use `epinio app list` and `epinio app delete`. The reviewed post now uses the command-reference forms.
- The post remains technically valid as a general Epinio workflow guide, but the exact application URL in Step 6 depends on the system domain configured when Epinio was installed.
- Paketo's Go buildpack can also build simpler Go apps without third-party dependencies, but using a `go.mod`-based example is the clearest and most current path for a Go tutorial.
