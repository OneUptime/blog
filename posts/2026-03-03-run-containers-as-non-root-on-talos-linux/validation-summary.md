# Validation Summary: How to Run Containers as Non-Root on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes (Deployments, Services, Pod Security Standards)
- Docker / Dockerfile (Node.js Alpine and Python slim base images)
- Linux user/group management (BusyBox addgroup/adduser, GNU groupadd/useradd)
- nginx-unprivileged container image
- kubectl CLI
- jq

## Sources Consulted
- Kubernetes Pod Security Context documentation: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes Pod Security Admission labels: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- fsGroupChangePolicy (GA in Kubernetes 1.23): https://kubernetes.io/docs/tasks/configure-pod-container/security-context/#configure-volume-permission-and-ownership-change-policy-for-pods
- CVE-2019-5736 (runc container breakout): https://nvd.nist.gov/vuln/detail/CVE-2019-5736
- CVE-2022-0185 (Linux kernel fs_context heap overflow): https://nvd.nist.gov/vuln/detail/CVE-2022-0185
- nginxinc/nginx-unprivileged image: https://hub.docker.com/r/nginxinc/nginx-unprivileged (runs as uid 101, listens on 8080)
- Alpine/BusyBox adduser & addgroup options: https://busybox.net/downloads/BusyBox.html
- Dockerfile USER and COPY --chown reference: https://docs.docker.com/reference/dockerfile/
- npm ci documentation: https://docs.npmjs.com/cli/v10/commands/npm-ci
- Talos Linux Pod Security documentation: https://www.talos.dev/v1.7/kubernetes-guides/configuration/pod-security/

## Issues Found
No technical issues found. All code examples, configuration snippets, command-line invocations, and technical claims (CVE references, Kubernetes security context semantics, nginx-unprivileged behavior, Pod Security Standards label syntax) were verified against the relevant official documentation and are accurate.

## Review Notes
- `npm ci --production` is still supported in npm 10 (shipped with Node 20) but is a deprecated alias. The modern equivalent is `npm ci --omit=dev`. The example still works correctly; this is a minor style point, not a correctness issue, so it was left as-is.
- The nginx-unprivileged image writes its PID to `/tmp/nginx.pid` by default (not `/var/run/nginx.pid`), so mounting `/var/run` as an emptyDir is technically unnecessary for the default configuration. It is harmless and provides defense if the config is modified, so the example was left intact.
- `kubectl exec myapp-pod -- ps aux` requires `ps` to be present in the image. Minimal images such as distroless will not have it. This is a reasonable caveat for readers using slim base images but does not affect correctness of the example for typical Alpine/slim images that include procps.
- The jq selector in the migration section only inspects pod-level `securityContext.runAsNonRoot` and will not catch pods that set `runAsNonRoot` only at the container level. This is a known limitation of the one-liner but is not strictly incorrect.
- `fsGroupChangePolicy: OnRootMismatch` requires Kubernetes 1.20+ (beta) or 1.23+ (GA). Current Talos Linux releases ship with much newer Kubernetes versions, so this is safe to use.
