# Validation Summary: How to Configure Content Security Policy Headers in ArgoCD

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Argo CD
- Kubernetes Ingress
- ingress-nginx
- Traefik Middleware and IngressRoute
- HTTP security headers
- Content Security Policy
- HTTP Strict Transport Security

## Sources Consulted
- Argo CD argocd-server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-server/
- Argo CD additional configuration method: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/server-commands/additional-configuration-method/
- Argo CD stable install manifest / argocd-cmd-params-cm keys: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx ConfigMap documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- Traefik Headers middleware reference: https://doc.traefik.io/traefik/master/reference/routing-configuration/http/middlewares/headers/
- MDN Content-Security-Policy header reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy
- MDN X-Frame-Options header reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options
- MDN X-Content-Type-Options header reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Content-Type-Options
- MDN Strict-Transport-Security header reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security
- HSTS preload submission requirements: https://hstspreload.org/

## Issues Found
- The first ingress-nginx example used `nginx.ingress.kubernetes.io/ssl-passthrough: "true"` together with HTTP response header injection. Official ingress-nginx documentation states that SSL passthrough works at layer 4 and invalidates other annotations. I changed the example to terminate TLS at ingress with `ssl-passthrough: "false"` and `ssl-redirect: "true"`.
- The ingress-nginx examples did not note that `configuration-snippet` requires snippet annotations to be enabled. I added a short caveat based on the ingress-nginx ConfigMap documentation.
- The Argo CD direct configuration example included `server.strict.transport.security`, which is not a documented `argocd-server` command parameter or `argocd-cmd-params-cm` key. I removed it and clarified that direct Argo CD server configuration covers CSP and X-Frame-Options for this use case.
- The CSP examples and explanation claimed Argo CD requires `unsafe-inline` and `unsafe-eval` for scripts. Argo CD's documented default CSP is `frame-ancestors 'self';`, and current CSP guidance recommends avoiding those script allowances unless required. I changed the examples to `script-src 'self'` and updated the text to recommend adding unsafe script directives only after testing.
- The HSTS section said the `preload` directive submits the domain for preloading. I corrected this to say it requests inclusion and still requires meeting preload requirements and submitting the domain.

## Review Notes
- The examples still include `X-XSS-Protection` because the post discusses it as a legacy header and both ingress examples support setting it. For new deployments, CSP is the primary browser-side XSS mitigation and `X-XSS-Protection` should not be treated as a modern replacement for output encoding and CSP.
- I could not run `kubectl rollout restart --help` locally because `kubectl` is not installed in this workspace, but the command syntax is standard Kubernetes CLI usage.
