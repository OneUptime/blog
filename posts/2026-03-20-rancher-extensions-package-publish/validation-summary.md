# Validation Summary: How to Package and Publish Rancher Extensions

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher UI Extensions
- Rancher Manager
- `@rancher/extension`
- `@rancher/shell`
- Helm
- Docker/container registries
- GitHub Actions
- GitHub repositories / `gh-pages`

## Sources Consulted
- Rancher UI Extensions, Getting Started: https://extensions.rancher.io/extensions/next/extensions-getting-started
- Rancher UI Extensions, Publishing an Extension: https://extensions.rancher.io/extensions/next/publishing
- Rancher UI Extensions, GitHub Workflow Configuration: https://extensions.rancher.io/extensions/next/advanced/workflow-configuration
- Rancher UI Extensions, Air-gapped Environments: https://extensions.rancher.io/extensions/next/advanced/air-gapped-environments
- Rancher Manager Docs, Rancher Extensions (v2.13): https://ranchermanager.docs.rancher.com/v2.13/integrations-in-rancher/rancher-extensions
- Rancher UI Extensions, Support matrixes: https://extensions.rancher.io/extensions/next/support-matrix
- Rancher UI Extensions, Rancher 2.10.0 update: https://extensions.rancher.io/extensions/next/rancher-2.10-support
- Docker CLI reference, `docker login`: https://docs.docker.com/reference/cli/docker/login/

## Issues Found
- The prerequisites were outdated. The post said Node.js 16+ and scaffolding with `@rancher/shell`, but current Rancher v3 extension docs use `@rancher/extension` and document Node.js v20 for the latest workflow. I updated the prerequisites and project scaffolding reference.
- The `yarn publish-pkgs` command in the Helm chart section used the wrong flags and meanings. `-s` is the destination GitHub repository, not the extension name, and Helm chart publication uses `-s` plus `-b`, not registry flags. I replaced the command and corrected the explanation of what the script generates.
- The post treated registry publication as a Helm `push` flow. Rancher’s documented registry-based distribution path for extensions is an Extension Catalog Image (ECI) built with `yarn publish-pkgs -c`, optionally `-p`, not `helm push` of the generated chart. I rewrote the registry section to use the documented ECI workflow.
- The authentication commands were wrong for the ECI path. The original post used `helm registry login`, but the documented ECI flow builds and pushes container images, so registry authentication should be done with the container runtime. I corrected the examples to use `docker login`.
- The Helm repository publishing section incorrectly regenerated the repo index manually. Rancher’s `publish-pkgs` already generates the repository structure and `index.yaml` in `tmp/`. I changed the section to publishing the generated repository contents to a public GitHub branch.
- The Rancher installation steps were inaccurate. The original post referred to `Extensions -> Add Extension Catalog` and an OCI URL for install. Current Rancher docs distinguish between adding extension repositories via `Manage Repositories` and importing ECIs via `Manage Extension Catalogs`. I updated the UI flow accordingly.
- The GitHub Actions example was not aligned with Rancher’s documented reusable workflows and used an incorrect tag-trigger model and incorrect publish command. I replaced it with Rancher’s documented `build-extension-catalog.yml` reusable workflow example.
- The versioning guidance was incomplete and partly wrong. Helm chart releases use the package version under `./pkg/<package-name>/package.json`, while ECI releases use the root `package.json`, and Rancher’s workflows require specific release tag formats. I corrected the versioning section.

## Review Notes
Current Rancher extension publishing is version-sensitive. If you are targeting older Rancher releases, use the matching `@rancher/extension` tag (`legacy-v1`, `legacy-v2`, or `latest`) and align any reusable GitHub workflow reference with the appropriate `rancher/dashboard` release branch instead of always using `@master`. For Rancher 2.10+ extensions, compatibility annotations such as `catalog.cattle.io/ui-extensions-version` and `catalog.cattle.io/rancher-version` should also be set correctly in extension metadata.
