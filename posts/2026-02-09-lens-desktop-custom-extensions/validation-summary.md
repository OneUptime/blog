# Validation Summary: How to Configure Lens Desktop with Custom Extensions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Lens Desktop Extension API
- Kubernetes API resources and CRDs
- TypeScript and React
- Node.js and npm packaging
- Prometheus API integration
- Slack incoming webhooks

## Sources Consulted
- Lens Extension API overview: https://api-docs.k8slens.dev/master/
- Lens Extension anatomy and manifest documentation: https://api-docs.k8slens.dev/master/extensions/get-started/anatomy/
- Lens Extension generator documentation: https://api-docs.k8slens.dev/master/extensions/guides/generator/
- Lens Extension common capabilities: https://api-docs.k8slens.dev/v5.2.6/extensions/capabilities/common-capabilities/
- Lens Extension publishing documentation: https://api-docs.k8slens.dev/master/extensions/testing-and-publishing/publishing/
- Lens Extension API reference for Renderer.LensExtension: https://api-docs.k8slens.dev/master/extensions/api/classes/Renderer.LensExtension/
- Lens Desktop install documentation: https://docs.k8slens.dev/k8slens/getting-started/install-lens/
- Published npm package metadata for `@k8slens/extensions` and `generator-lens-ext`
- Lens support forum note on extension support in newer Lens Desktop builds: https://forums.k8slens.dev/t/help-extension-menu-is-not-visble/3848

## Issues Found
- The setup commands used a non-existent `@k8slens/create-extension` package and `create-lens-extension` binary. Replaced them with the documented Yeoman generator flow: `npm install -g yo generator-lens-ext` and `yo lens-ext`.
- The sample project structure and `package.json` metadata did not match the Lens extension manifest documented by Lens. Updated the structure to root `main.ts`/`renderer.tsx`, added `publisher` and `engines.lens`, and moved `@k8slens/extensions` to `devDependencies`.
- The dashboard snippet used `Renderer.K8sApi.forCluster` with the wrong arguments and accessed `Renderer.Catalog.activeCluster` incorrectly. Replaced it with the exported `Renderer.K8sApi.deploymentApi`.
- The dashboard table used a `columns` prop that is not part of Lens `TableProps`. Replaced it with `renderRow`, `TableRow`, and `TableCell`.
- The rollout restart example manually patched annotations even though Lens exposes `DeploymentApi.restart()`. Replaced the manual patch with the built-in restart helper.
- The CRD watcher called `apiManager.getStore()` with a `KubeObject` instance, which is not a valid argument. Replaced it with a custom `KubeObject` class, `KubeApi`, and `watch()` callback.
- Context-menu and integration snippets depended on undeclared imports and undefined helper methods. Added the required imports and simplified the Prometheus example so it returns a concrete value.
- The main-process deployment watcher used a renderer-only `deploymentApi` export. Replaced it with `new Main.K8sApi.DeploymentApi()` and `watch()`.
- The post implied extension support in all current Lens Desktop builds. Added a compatibility caveat for Lens builds that support the legacy Extension API.
- The install and distribution commands referenced an unsupported `lens --install-extension` command. Replaced it with the documented `npm view <extension-name> dist.tarball` flow and Extensions page installation guidance.

## Review Notes
The examples are still illustrative and omit production concerns such as cleanup of watch disposers, authentication to external systems, and robust Prometheus query parsing. Lens extension support is version-sensitive, so future updates should re-check the current Lens Desktop release and Extension API docs before publishing.
