# Validation Summary: How to Configure Epinio Namespaces

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Epinio
- Kubernetes namespaces
- Epinio CLI
- Cloud Native Buildpacks
- Paketo Node.js Buildpack
- Node.js

## Sources Consulted
- Epinio docs, Namespaces tutorial: https://docs.epinio.io/1.8.0/tutorials/namespace-tutorial
- Epinio docs, How to work with multiple namespaces: https://docs.epinio.io/1.7.1/howtos/namespaces
- Epinio docs, `epinio push` command reference: https://docs.epinio.io/references/commands/cli/epinio_push
- Epinio docs, Supported Applications: https://docs.epinio.io/references/supported_applications
- Epinio docs, Single developer workflow: https://docs.epinio.io/tutorials/single-dev-workflow
- Paketo Buildpacks, Node.js Buildpack Reference: https://paketo.io/docs/reference/nodejs-reference/

## Issues Found
- The post mixed a shell-script web-server example with a Node.js example. As written, the shell-script example was not a reliable Epinio application example, while the Node.js `server.js` example is compatible with Paketo's documented no-package-manager entrypoint detection. I removed the shell-script example and kept the Node.js example.
- The post used `epinio namespace show my-apps` to verify the active namespace. Official Epinio namespace docs show that `epinio target` without an argument is the command that reports the currently targeted namespace, so I corrected that command.
- The post tried to extract the app URL with `grep Routes`, but Epinio's documented output prints `Routes:` as a header and the actual URLs on numbered lines below it. I changed the route-view and URL-extraction commands to parse the numbered route lines instead.
- The post used `open ${APP_URL}`, which is macOS-specific and not a general Epinio command. I replaced it with a browser-neutral instruction.
- The live-log example used `epinio app logs my-app --follow`. I changed it to the documented form `epinio app logs --follow my-app`.
- The update step claimed that Epinio "performs a rolling update" without documentation support in the sources reviewed. I replaced that line with a neutral verification step.

## Review Notes
- The custom route example `my-app.epinio.example.com` is a placeholder. In practice, the route must match a domain that resolves to the cluster ingress and is appropriate for the Epinio installation's domain and TLS setup.
