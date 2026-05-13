# Validation Summary: How to Deploy a React Application with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- React
- Vite
- Create React App
- Docker
- Nginx
- Kubernetes Deployments, Services, Ingresses, ConfigMaps, probes, and resource requests/limits
- Flux CD GitRepository, Kustomization, ImageRepository, ImagePolicy, and ImageUpdateAutomation
- GitOps image automation

## Sources Consulted
- Flux CD ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux CD image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux CD Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- ingress-nginx rewrite documentation: https://kubernetes.github.io/ingress-nginx/examples/rewrite/
- Kubernetes ConfigMap volume documentation: https://kubernetes.io/docs/concepts/storage/volumes/#configmap
- Kubernetes HTTP probe documentation: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- Vite environment variables documentation: https://vite.dev/guide/env-and-mode/
- Create React App environment variables documentation: https://create-react-app.dev/docs/adding-custom-environment-variables/
- NGINX Docker documentation: https://docs.nginx.com/nginx/admin-guide/installing-nginx/installing-nginx-docker/

## Issues Found
- The Ingress used `nginx.ingress.kubernetes.io/rewrite-target: /` for a root path. For an app already served from `/`, this rewrite can rewrite every request, including static asset requests, to `/`. Removed the annotation so asset paths reach the Nginx container unchanged.
- The runtime configuration section created a `ConfigMap` but did not mount it into the Nginx container or show how the page loads it before React initializes. Added a Deployment volume mount for `/usr/share/nginx/html/config.js` and an `index.html` script tag.

## Review Notes
- The Flux API versions and image automation marker syntax match current Flux documentation.
- The Dockerfile is valid for Vite's default `dist` output. Create React App uses `build`, so CRA users should replace `/app/dist` with `/app/build`.
- Mounting a ConfigMap key with `subPath` is appropriate for preserving the existing Nginx document root, but Kubernetes does not live-update `subPath` mounts inside a running container; roll pods after changing runtime config.
