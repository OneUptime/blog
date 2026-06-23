# Validation Summary: How to Set Up Ingress Controllers in Kubernetes: NGINX vs Traefik vs HAProxy

## Status
validated

## Post Type
Guide / Comparison tutorial (installation + configuration walkthrough for three Ingress controllers)

## Technologies Covered
- Kubernetes Ingress (`networking.k8s.io/v1`)
- ingress-nginx (community NGINX Ingress controller)
- Traefik (IngressRoute / Middleware CRDs, `traefik.io/v1alpha1`)
- HAProxy Ingress (`haproxy-ingress.github.io` annotations)
- Helm (chart installation for all controllers)
- cert-manager (`cert-manager.io/v1` ClusterIssuer, ACME / Let's Encrypt)
- Prometheus Operator ServiceMonitor (`monitoring.coreos.com/v1`)

## Sources Consulted
- ingress-nginx Helm chart & annotations — https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx ConfigMap reference — https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- Traefik Kubernetes IngressRoute / Helm docs — https://doc.traefik.io/traefik/
- HAProxy Ingress configuration keys — https://haproxy-ingress.github.io/docs/configuration/keys/
- cert-manager Helm install & ACME ClusterIssuer docs — https://cert-manager.io/docs/
- GNU Bash manual (line continuation / comments behaviour) — verified empirically in-shell

## Issues Found
1. **Bash line-continuation broken by inline comments (3 occurrences).** The NGINX, Traefik, and HAProxy `helm install` blocks placed `# comment` text *after* a `\` line-continuation on intermediate lines (e.g. `--set controller.replicaCount=2 \         # HA: run 2 replicas`). In Bash a backslash only escapes the immediately following character; the trailing space + `#` turns the line into a comment and the newline is no longer escaped, so the command terminates early and the following `--set ...` line runs as a standalone command (`command not found`). I verified this empirically. **Fix:** moved the explanatory comments to their own lines *above* each `helm install` command and left the multi-line continuation clean, so the commands now copy-paste and run correctly. No flags or values were changed.
2. **Incorrect NGINX `rewrite-target` comment.** The comment claimed `nginx.ingress.kubernetes.io/rewrite-target: /` with `path: /api` (pathType `Prefix`) would "Rewrite /api/foo to /foo". With a static rewrite target of `/` and no capture-group regex, the entire matched path is replaced with `/` (so `/api/foo` → `/`); rewriting to `/foo` would require a capture group such as `path: /api(/|$)(.*)` with `rewrite-target: /$2`. **Fix:** changed the comment to "Rewrite the matched path to / when forwarding to backend" to accurately describe the configuration shown.

## Review Notes
- Helm repository URLs (ingress-nginx, traefik, haproxy-ingress, jetstack/cert-manager) are all correct and current.
- Helm chart values verified: `controller.replicaCount` / `controller.service.type` (ingress-nginx and haproxy-ingress), `ingressRoute.dashboard.enabled`, `providers.kubernetesIngress.enabled`, `providers.kubernetesCRD.enabled` (Traefik), and `crds.enabled=true` (cert-manager v1.15+; the older value was `installCRDs`).
- API versions are current: `traefik.io/v1alpha1` (the modern group, replacing the deprecated `traefik.containo.us`), `cert-manager.io/v1`, `networking.k8s.io/v1`, `monitoring.coreos.com/v1`.
- HAProxy Ingress annotations (`maxconn-server`, `health-check-interval`, `health-check-rise`, `health-check-fall`, `balance-algorithm`, `limit-rps`, `waf`, `ssl-redirect`, `timeout-server`) confirmed against the HAProxy Ingress configuration-keys docs.
- NGINX ConfigMap keys and Prometheus metric names (`nginx_ingress_controller_requests`, `..._request_duration_seconds`, `..._upstream_latency_seconds`) are valid.
- The cert-manager HTTP-01 solver uses `ingress.class: nginx`, which still works; newer cert-manager also supports `ingressClassName`. Not changed since the shown form is valid.
- The comparison table's qualitative claims (community size, performance, dashboard availability) are reasonable generalizations rather than precise specs; left as authored.
