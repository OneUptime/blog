# Validation Summary: How to Install Podman Desktop Extensions

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman Desktop
- Podman Desktop extensions
- OCI images and registries
- Podman CLI
- Kind, Minikube, Podman AI Lab, BootC, and Headlamp extensions

## Sources Consulted
- Podman Desktop documentation: Installing a Podman Desktop extension - https://podman-desktop.io/docs/extensions/install
- Podman Desktop documentation: Using extensions for development tasks - https://podman-desktop.io/docs/extensions/install/using-extension
- Podman Desktop documentation: Podman Desktop extensions - https://podman-desktop.io/docs/extensions
- Podman Desktop documentation: Packaging and publishing a Podman Desktop extension - https://podman-desktop.io/docs/extensions/publish
- Podman Desktop documentation: Access Podman Desktop logs - https://podman-desktop.io/docs/troubleshooting/access-logs
- Podman Desktop documentation: Settings reference - https://podman-desktop.io/docs/configuration/settings-reference
- Podman Desktop BootC extension repository - https://github.com/podman-desktop/extension-bootc

## Issues Found
- The BootC extension OCI image example used `ghcr.io/podman-desktop/podman-desktop-extension-bootc:latest`, which does not match the current BootC extension repository instructions. Updated the `podman pull` and `podman inspect` examples to use `ghcr.io/podman-desktop/extension-bootc:next`.
- The installed extensions section claimed each extension shows resource usage. The current official docs verify the Installed tab and extension status/details, but do not document resource usage there. Reworded the line to say extensions show details such as status and version.
- The troubleshooting section listed direct filesystem log paths and a macOS-specific `ls` command. The current official troubleshooting docs direct users to the Troubleshooting icon and Logs/Gather Logs UI. Updated the snippet to describe that supported UI flow.

## Review Notes
The main extension installation flow, custom OCI image installation flow, catalog references, extension categories, and update-related claims are consistent with current Podman Desktop documentation. The post remains version-neutral, so future UI wording may need rechecking if Podman Desktop changes the Extensions page layout.
