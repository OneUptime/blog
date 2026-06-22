# Validation Summary: How to Set Up Preview Deployments for React Pull Requests

## Status
validated

## Post Type
Tutorial / Guide (multi-platform how-to with extensive code, CI configuration, and infrastructure snippets)

## Technologies Covered
- React (Create React App, Vite, env var conventions)
- Vercel (vercel.json, Vercel CLI, deployment protection, environment variables)
- Netlify (netlify.toml, build contexts, plugins, redirects/headers)
- GitHub Actions (workflows, github-script, matrix of marketplace actions)
- AWS S3 + CloudFront (static hosting, cache invalidation)
- Kubernetes (Deployment, Service, Ingress, cert-manager, namespaces)
- Surge.sh (static hosting / teardown)
- Docker / GitHub Container Registry (buildx, metadata-action, build-push-action)
- Percy & Lighthouse CI (visual regression / audits)

## Sources Consulted
- Vercel Password Protection docs — https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/password-protection
- Vercel Deployment Protection overview — https://vercel.com/docs/deployment-protection
- Vercel Project Configuration (supported vercel.json keys) — https://vercel.com/docs/project-configuration
- Netlify Deploy Notifications docs — https://docs.netlify.com/deploy/deploy-notifications/
- Netlify Notifier build plugin — https://github.com/netlify-labs/netlify-plugin-notifier
- Cross-checked GitHub Actions marketplace action versions (actions/checkout@v4, setup-node@v4, github-script@v7, upload-artifact@v4, aws-actions/configure-aws-credentials@v4, docker/*-action, azure/setup-kubectl@v3, azure/k8s-set-context@v3, treosh/lighthouse-ci-action@v10)

## Issues Found
1. **Invalid Vercel `vercel.json` password-protection field (two occurrences).** The post placed `"password": { "protection": "all" }` and `"password": { "protection": "deployments" }` inside `vercel.json`. Vercel has no such field — `vercel.json` does not support any password-protection key at all (verified against the Project Configuration supported-properties table). Password Protection is a project-level setting managed via the dashboard, REST API, or Terraform, and the API uses a `passwordProtection` object with a `deploymentType` of `preview`, `prod_deployment_urls_and_all_previews`, or `all` (the value `"deployments"` is also not valid). Fixed both blocks to clarify it is a project setting (not `vercel.json`), show the correct `passwordProtection`/`deploymentType` shape, and retain the valid `vercel.json` `headers` snippet for `X-Robots-Tag: noindex` separately.
2. **Non-existent Netlify plugin.** The "Deploy Notifications" snippet referenced `netlify-plugin-webhook-deploy-notification` with a `webhook_url` input, which does not exist on npm. Replaced with the real `@netlify/plugin-notifier` package and its actual `notices` array input format (`event`, `type`, `endpoint`, `message`) pointing at the Slack incoming-webhook endpoint.

## Review Notes
- **CRA/Vite system env vars in client code:** The config helper reads `process.env.VERCEL_ENV` and `process.env.CONTEXT` in browser code. With Create React App only `NODE_ENV` and `REACT_APP_`-prefixed variables are inlined into the client bundle, and Vite uses `import.meta.env` rather than `process.env`, so those two platform checks are effectively dead on a standard React build. It is not strictly broken because the helper falls through to the inlined `REACT_APP_ENVIRONMENT` variable, which is the path that actually works. Left as-is since it degrades gracefully, but readers should rely on the `REACT_APP_*` branch.
- **Legacy `vercel.json` schema:** The first `vercel.json` example uses the legacy `version: 2` / `builds` / `routes` form (plus the deprecated `name` field). It still works for backward compatibility, but modern Vercel projects favor `rewrites`/`headers`/`cleanUrls` and zero-config framework detection. Not changed since it remains functional.
- **Kubernetes Ingress class annotation:** `kubernetes.io/ingress.class: nginx` is deprecated since Kubernetes 1.18 in favor of `spec.ingressClassName`. Still honored by the ingress-nginx controller, so left intact, but `ingressClassName` is preferred on current clusters.
- **`vercel --prebuilt`** requires a prior `vercel build` to produce `.vercel/output`; the surrounding text is fine but readers should run `vercel build` first.
- GitHub Actions marketplace action versions, Surge `deploy`/`teardown` commands, Netlify `netlify.toml` contexts/redirects/headers, and the Kubernetes manifests are all current and correct.
