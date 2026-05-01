# Validation Summary: How to Set Up a Custom Domain for Epinio Applications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Epinio CLI
- Kubernetes ingress
- cert-manager
- DNS routing for custom domains
- Node.js
- Cloud Native Buildpacks / Paketo Buildpacks

## Sources Consulted
- Epinio Quickstart — https://docs.epinio.io/tutorials/quickstart
- Epinio Install Epinio — https://docs.epinio.io/installation/install_epinio
- Epinio DNS setup — https://docs.epinio.io/installation/dns_setup
- Epinio supported applications — https://docs.epinio.io/references/supported_applications
- Epinio push command reference — https://docs.epinio.io/references/commands/cli/epinio_push
- Epinio app update command reference — https://docs.epinio.io/references/commands/cli/app/epinio_app_update
- Epinio app logs command reference — https://docs.epinio.io/references/commands/cli/app/epinio_app_logs
- Epinio Custom Routes — https://docs.epinio.io/1.5.1/howtos/custom_routes
- Epinio single developer workflow — https://docs.epinio.io/1.11.0/tutorials/single-dev-workflow
- The Epinio push process in detail — https://docs.epinio.io/explanations/detailed-push-process
- Paketo Node.js Buildpack Reference — https://paketo.io/docs/reference/nodejs-reference/

## Issues Found
- The post was framed as a custom-domain/TLS guide, but the prerequisites did not include the documented DNS and cert-manager requirements. I added those prerequisites and clarified the introduction/description so the guide matches Epinio's routing and certificate model.
- The original sample application mixed a shell-based `nc` server with a Node.js example. The shell example was not a reliable Epinio example as written, so I removed it and kept the Node.js `server.js` sample, which is consistent with Paketo's documented support for simple Node.js apps.
- The route lookup commands were incorrect. `epinio app show` prints a `Routes:` header followed by numbered route lines, so `grep Routes | awk '{print $2}'` would not return the URL. I replaced those commands with `awk` expressions that extract the documented route output correctly.
- The post stated that Epinio configures TLS during push without qualification and that re-pushing performs a rolling update. I corrected the wording to match the docs: certificate issuance depends on cert-manager, DNS, and issuer configuration, and re-pushing rebuilds and redeploys the application.
- The `open ${APP_URL}` command was macOS-specific. I replaced it with a generic browser instruction.

## Review Notes
- The post now accurately assumes that Epinio itself, ingress, DNS, and cert-manager have already been set up at the platform level; those cluster-installation steps are outside the scope of this article.
- Epinio command validation was performed against the official published documentation because the `epinio` binary was not installed in the local review environment.
- Validated against the current Epinio documentation set available on 2026-05-01, which identifies 1.13.10 as the latest maintained documentation version.
