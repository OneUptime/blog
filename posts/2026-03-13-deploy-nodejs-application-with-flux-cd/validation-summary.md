# Validation Summary: How to Deploy a Node.js Application with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- npm
- Docker
- Kubernetes Deployments, Services, Namespaces, probes, and resource requests/limits
- Flux CD GitRepository and Kustomization resources
- Flux CD image automation resources: ImageRepository, ImagePolicy, and ImageUpdateAutomation
- GitOps deployment workflows

## Sources Consulted
- Flux official documentation: GitRepository API, https://fluxcd.io/flux/components/source/gitrepositories/
- Flux official documentation: Kustomization API and health checks, https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux official documentation: ImageRepository API, https://fluxcd.io/flux/components/image/imagerepositories/
- Flux official documentation: ImagePolicy API, https://fluxcd.io/flux/components/image/imagepolicies/
- Flux official documentation: ImageUpdateAutomation API, https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux official guide: Automate image updates to Git, https://fluxcd.io/flux/guides/image-update/
- Flux official documentation: optional image automation components, https://fluxcd.io/flux/installation/configuration/optional-components/
- Flux official CLI reference: image status commands, https://fluxcd.io/flux/cmd/flux_get_images/
- Node.js official release schedule, https://github.com/nodejs/Release
- npm official documentation: npm ci, https://docs.npmjs.com/cli/v11/commands/npm-ci/
- Kubernetes official documentation: Services, https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes official documentation: Liveness, Readiness, and Startup Probes, https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/

## Issues Found
- The Dockerfile used `node:20-alpine`. Node.js 20 reached end-of-life on April 30, 2026, before the validation date. Updated the Dockerfile to use `node:24-alpine`, the active LTS line on May 13, 2026.
- The Dockerfile used `npm ci --only=production`. The current npm documentation describes omitting development dependencies with `npm ci --omit=dev`. Updated the command accordingly.
- The prerequisites stated only that Flux should be bootstrapped. Flux image automation controllers are extra components and are not installed by default. Updated the prerequisite to include `--components-extra=image-reflector-controller,image-automation-controller`.
- The ImagePolicy used `range: ">=1.0.0"` while the comment said it tracks all 1.x releases. That range also permits 2.x and later stable releases. Updated the range to `>=1.0.0 <2.0.0`.
- The verification commands checked the ImageRepository and ImagePolicy but omitted the ImageUpdateAutomation resource. Added `flux get image update my-node-app`.

## Review Notes
The Kubernetes Deployment, Service, probe, and Flux API snippets are otherwise consistent with the current official API documentation. The Dockerfile assumes the application can run directly from `src/index.js` without a build step; applications that compile TypeScript or bundle assets would need an additional build stage.
