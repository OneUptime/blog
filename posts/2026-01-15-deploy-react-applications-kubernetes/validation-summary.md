# Validation Summary: How to Deploy React Applications to Kubernetes

## Status
validated

## Post Type
Tutorial / Guide (end-to-end walkthrough of containerizing a React app and deploying it to Kubernetes)

## Technologies Covered
- React (Create React App build output)
- Docker (multi-stage builds, `.dockerignore`, HEALTHCHECK)
- nginx (SPA serving, gzip, caching, security headers)
- Kubernetes (Namespace, Deployment, Service, Ingress, ConfigMap, Secret, HPA, PDB, NetworkPolicy, ServiceAccount/RBAC, probes, security contexts, topology spread, pod anti-affinity)
- ingress-nginx Ingress Controller
- cert-manager (Let's Encrypt ClusterIssuer, HTTP-01 solver)
- Prometheus annotations / ServiceMonitor (Prometheus Operator)
- Fluent Bit logging
- GitHub Actions CI/CD
- ArgoCD (GitOps)

## Sources Consulted
- Kubernetes documentation — Configure a Security Context for a Pod or Container: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes documentation — Pod Security / Linux capabilities and privileged ports (NET_BIND_SERVICE)
- Kubernetes documentation — Configure Liveness, Readiness and Startup Probes: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes documentation — Ingress and `ingressClassName` vs deprecated `kubernetes.io/ingress.class` annotation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes documentation — HorizontalPodAutoscaler (`autoscaling/v2`, behavior/scaling policies): https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/
- Kubernetes documentation — PodDisruptionBudget (`policy/v1`): https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Official nginx Docker image documentation (running as a non-root user, listening on a non-privileged port, env-var templating): https://hub.docker.com/_/nginx
- cert-manager documentation — ACME / Let's Encrypt issuers: https://cert-manager.io/docs/configuration/acme/
- ingress-nginx installation docs: https://kubernetes.github.io/ingress-nginx/deploy/
- GitHub Actions marketplace actions: actions/checkout@v4, actions/setup-node@v4, docker/build-push-action@v5, docker/login-action@v3, docker/metadata-action@v5, docker/setup-buildx-action@v3, azure/setup-kubectl@v3

## Issues Found
1. **Non-root container could not bind to privileged port 80 (deployment-breaking).** The Deployment set `securityContext.runAsNonRoot: true`, `runAsUser: 1001`, and dropped **all** Linux capabilities (removing `NET_BIND_SERVICE`), while nginx was configured to `listen 80;` with `containerPort: 80`. A non-root process without `NET_BIND_SERVICE` cannot bind to ports below 1024, so the pod would fail with `bind() to 0.0.0.0:80 failed (13: Permission denied)` and enter CrashLoopBackOff. Fixed by moving nginx to the non-privileged port **8080** consistently across the binding path:
   - `nginx.conf` main server block: `listen 80` → `listen 8080`.
   - `nginx.conf` runtime-config example: `listen 80` → `listen 8080`.
   - Dockerfile: `EXPOSE 80` → `EXPOSE 8080` and `HEALTHCHECK ... http://localhost:80/` → `http://localhost:8080/`.
   - Local test `docker run -d -p 8080:80` → `-p 8080:8080`.
   - Deployment `containerPort: 80` → `8080`.
   - Standalone liveness/readiness/startup probe examples: `port: 80` → `port: 8080`.
   - NetworkPolicy ingress rule: `port: 80` → `port: 8080`.
   The Service keeps `port: 80` with `targetPort: http` (the named container port, now 8080), and the Ingress keeps `number: 80` (the Service port), so the external-facing contract is unchanged.

2. **Non-root user created but never activated.** The Dockerfile created `appuser`/`appgroup` and chowned the required nginx writable paths under the heading "Add non-root user for security", but never switched to that user, so the image still ran as root by default — contradicting the security narrative and the K8s `runAsNonRoot` intent. Added `USER appuser` before the `CMD`. Combined with the port-8080 change, the container now runs and binds correctly as a non-root user both in plain Docker and under the Deployment's security context (UID/GID 1001 matches `appuser`/`appgroup`).

3. **Deprecated Ingress class annotation.** The Ingress used both the deprecated `kubernetes.io/ingress.class: nginx` annotation and the modern `spec.ingressClassName: nginx`. The annotation has been deprecated since Kubernetes 1.18 and is ignored by current ingress-nginx when `ingressClassName` is set. Removed the redundant deprecated annotation, leaving the correct `ingressClassName: nginx`.

## Review Notes
- **Create React App is deprecated.** `npx create-react-app` still produces a `build/` directory (which the rest of the tutorial depends on), so the steps remain functional, but the React team has deprecated CRA in favor of frameworks/build tools such as Vite or Next.js. Left as-is to avoid restructuring; a future update could migrate to Vite (note that Vite outputs to `dist/`, which would require corresponding Dockerfile/COPY changes).
- **Runtime config nginx snippet uses `$API_URL` placeholders.** The `Runtime Configuration` example writes `... "$API_URL" ...` inside a `return 200`. nginx does not natively interpolate shell/env variables in `conf.d` config; the official nginx image performs env substitution only on `*.template` files under `/etc/nginx/templates` using `${VAR}` syntax (via `envsubst`). As written this is illustrative pseudo-config and would need the template mechanism (or an entrypoint running `envsubst`) to actually substitute values. Left as an intentionally illustrative snippet; flagged here for readers.
- **Prometheus annotations point at nginx without an exporter.** `prometheus.io/scrape: "true"` with `prometheus.io/path: "/metrics"` and the `ServiceMonitor` assume a `/metrics` endpoint, but the stock nginx image does not expose Prometheus metrics. A real setup needs the nginx Prometheus exporter (or nginx-ingress controller metrics) — the annotations alone yield no metrics. Not a syntax error; noted as a functional caveat.
- **Pinned tool versions are valid but somewhat dated.** ingress-nginx `controller-v1.9.4`, cert-manager `v1.13.2`, and kubectl `v1.28.0` are real, working releases referenced correctly. They are older than current releases as of validation; readers may wish to bump to the latest patched versions.
- The HPA (`autoscaling/v2` with `behavior`), PDB (`policy/v1`), RBAC, topology spread constraints, pod anti-affinity, rolling-update strategy, NodePort range (30080), and GitHub Actions/ArgoCD manifests were all reviewed and are syntactically and semantically correct.
