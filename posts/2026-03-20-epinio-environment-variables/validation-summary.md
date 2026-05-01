# Validation Summary: How to Configure Epinio Application Environment Variables

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Epinio
- Kubernetes
- Paketo Buildpacks
- Node.js
- Environment variables
- TLS

## Sources Consulted
- Epinio introduction: https://docs.epinio.io/
- Epinio quickstart: https://docs.epinio.io/tutorials/quickstart
- Epinio supported applications: https://docs.epinio.io/references/supported_applications
- Epinio detailed push process: https://docs.epinio.io/explanations/detailed-push-process
- Epinio `epinio push` command reference: https://docs.epinio.io/references/commands/cli/epinio_push
- Epinio certificate issuers: https://docs.epinio.io/howtos/other/certificate_issuers
- Epinio security: https://docs.epinio.io/explanations/security
- Paketo Node.js buildpack reference: https://paketo.io/docs/reference/nodejs-reference/
- Epinio CLI source for app commands: https://github.com/epinio/epinio/blob/v1.13.10/internal/cli/cmd/apps.go
- Epinio CLI source for app env commands: https://github.com/epinio/epinio/blob/v1.13.10/internal/cli/cmd/appenv.go
- Epinio CLI source for namespace targeting: https://github.com/epinio/epinio/blob/v1.13.10/internal/cli/cmd/target.go
- Epinio CLI source for app show output: https://github.com/epinio/epinio/blob/v1.13.10/internal/cli/usercmd/app.go

## Issues Found
- The original shell-and-`nc` sample app was not a reliable Epinio example. Epinio stages source with Paketo buildpacks, and the official docs note that apps needing an explicit start command should use a `Procfile`. I removed that example and kept the Node.js `server.js` example, which Paketo explicitly supports as a simple app entrypoint without `package.json`.
- The namespace verification step used `epinio namespace show my-apps`, which shows namespace details but does not verify the currently targeted namespace. I changed it to `epinio target`, which the official docs describe as the way to display the current target.
- The route inspection and URL extraction commands were incorrect. Current Epinio `app show` output lists routes in an `Active Routes` section, so `grep Routes | awk '{print $2}'` would not reliably return a usable route. I replaced that with `epinio app show my-app` and explicit instructions to use the first route shown there.
- The curl example assumed plain `curl ${APP_URL}` would work. Epinio uses TLS for application routes by default, and the default issuer is `epinio-ca`, so a default installation may not be trusted by curl. I changed the example to `curl -k https://<route>` to match common default setups.
- The browser command used macOS-only `open`. I replaced it with a platform-neutral instruction to open the HTTPS route in a browser.
- The statement that a re-push "performs a rolling update" was stronger than what the reviewed docs explicitly guarantee in this context. I changed it to say Epinio restages the app and updates the deployment.

## Review Notes
- The post is technically relevant and salvageable, but it is broader than the title suggests. Most of the content is a general Epinio deployment walkthrough, with environment variable management covered in one step.
- `epinio app list` is valid in current Epinio. The CLI also exposes the alias `epinio apps list`, which appears in some official tutorials.
- The custom route example is valid only if the chosen domain resolves to the Epinio ingress controller, so I added an inline note to make that requirement explicit.
