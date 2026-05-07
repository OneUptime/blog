# Validation Summary: How to Develop Podman Desktop Extensions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman Desktop extensions
- Podman Desktop extension API
- TypeScript
- Node.js and npm
- OCI images
- Containerfile
- Podman CLI

## Sources Consulted
- Podman Desktop documentation: Developing a Podman Desktop extension: https://podman-desktop.io/docs/extensions/developing
- Podman Desktop tutorial: Creating a Podman Desktop extension: https://podman-desktop.io/tutorial/creating-an-extension
- Podman Desktop documentation: Packaging and publishing a Podman Desktop extension: https://podman-desktop.io/docs/extensions/publish
- Podman Desktop documentation: Installing a Podman Desktop extension: https://podman-desktop.io/docs/extensions/install
- Podman Desktop documentation: Debugging a local extension: https://podman-desktop.io/docs/extensions/debugging-an-extension
- Podman Desktop API reference: commands namespace: https://podman-desktop.io/api/%40podman-desktop/namespaces/commands
- Podman Desktop API reference: window.createStatusBarItem: https://podman-desktop.io/api/%40podman-desktop/namespaces/window/functions/createStatusBarItem
- Podman Desktop API reference: containerEngine.onEvent: https://podman-desktop.io/api/%40podman-desktop/namespaces/containerEngine/variables/onEvent
- Podman Desktop API reference: ContainerJSONEvent: https://podman-desktop.io/api/interfaces/ContainerJSONEvent
- Podman Desktop troubleshooting: Access logs: https://podman-desktop.io/docs/troubleshooting/access-logs

## Issues Found
- The introduction stated that Podman Desktop extensions are built using TypeScript. Official docs say TypeScript is recommended, but JavaScript is also supported. Updated the sentence to say extensions can be written in TypeScript or JavaScript.
- The key files list described `package.json` as containing activation events. The current Podman Desktop docs describe metadata and contribution points, with activation handled by the `main` entry point and exported `activate` function. Updated the description.
- The `tsconfig.json` snippet was fenced as strict JSON while including a comment. Changed the fence to `jsonc`, which is appropriate for TypeScript configuration files with comments.
- The `package.json` snippet did not include the `icon` field even though the Containerfile copied `icon.png`. Added `"icon": "icon.png"` and listed `icon.png` as a key file so the build instructions are internally consistent.
- The command callback called `showInformationMessage` without awaiting the returned promise. Updated the example to `await` the API call, matching official examples.
- The container event listener used `event.Type` and `event.Actor?.Attributes?.name`. The current `ContainerJSONEvent` interface exposes `type`, `status`, `id`, and optional `Type`, but not `Actor`. Updated the example to check `event.type` and log `event.id`.
- The Containerfile omitted required Podman Desktop OCI labels. Added the required labels from the packaging documentation, including `io.podman-desktop.api.version`.
- The Containerfile label used a custom vendor value in the first correction pass; official docs specify `org.opencontainers.image.vendor="podman-desktop"`. Set the vendor label accordingly.
- The local testing section implied that `npm run watch` alone was sufficient for development testing. Added the current Podman Desktop local extension development flow: enable development mode and add the local folder extension.
- The debugging section listed OS-specific log file paths that do not match the current official troubleshooting guidance. Replaced them with the documented Help > Troubleshooting > Logs workflow.

## Review Notes
- The post now matches the current Podman Desktop extension development, packaging, installation, and local debugging documentation. Future improvements could include using the official template tooling or Vite-based examples, but the current TypeScript-only example is technically valid for a minimal extension.
