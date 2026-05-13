# Validation Summary: How to Deploy a Svelte Application with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Svelte and SvelteKit
- SvelteKit adapter-static and adapter-node
- Docker and Node.js
- Nginx
- Kubernetes Deployments, Services, Ingress, ConfigMaps, and probes
- Flux CD GitRepository, Kustomization, ImageRepository, ImagePolicy, and ImageUpdateAutomation

## Sources Consulted
- SvelteKit adapter-static documentation: https://svelte.dev/docs/kit/adapter-static
- SvelteKit adapter-node documentation: https://svelte.dev/docs/kit/adapter-node
- SvelteKit dynamic public environment variable documentation: https://svelte.dev/docs/kit/$env-dynamic-public
- SvelteKit static public environment variable documentation: https://svelte.dev/docs/kit/$env-static-public
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The `adapter-static` example used `fallback: "index.html"`. SvelteKit documentation recommends avoiding `index.html` where possible because it can conflict with a prerendered homepage, so this was changed to `fallback: "200.html"` and the Nginx fallback target was updated to `/200.html`.
- The SSR Dockerfile comment said the Node adapter build output contains `server.js`. Current SvelteKit adapter-node output includes `index.js` and `handler.js`, so the comment was corrected.
- The SSR Dockerfile used `npm ci --only=production`. Current SvelteKit adapter-node documentation recommends `npm ci --omit dev` for production dependencies, so the command was updated.
- The Kubernetes manifests were presented after both deployment options but used SSR port `3000`. A clarifying comment was added that the shown manifest is the SSR example and static Nginx deployments should use port `80` for the container, Service target port, and probes.
- The Flux `ImageUpdateAutomation` commit message template used removed `.Updated.Images` data. Flux documentation states `Updated` has been removed and templates should use `.Changed`, so the template was updated to use `.Changed.Changes`.
- The best-practice note implied all `PUBLIC_*` environment variable reads are runtime reads under the Node adapter. SvelteKit separates `$env/static/public` build-time variables from `$env/dynamic/public` runtime variables, so the note was corrected to specify `$env/dynamic/public`.

## Review Notes
- The guide remains SSR-focused in the Kubernetes manifest section. The added note is technically accurate, but a future revision could include a separate static Nginx Deployment and Service snippet for completeness.
- For SvelteKit deployments behind an Ingress or reverse proxy, production apps may also need `ORIGIN`, `PROTOCOL_HEADER`, `HOST_HEADER`, or `PORT_HEADER` depending on form actions and proxy behavior.
