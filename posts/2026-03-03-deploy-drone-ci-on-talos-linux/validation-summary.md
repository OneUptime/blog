# Validation Summary: How to Deploy Drone CI on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Drone CI (server and Kubernetes runner, drone/drone:2 image)
- Talos Linux (target platform)
- Kubernetes (Deployment, Service, PVC, Ingress, RBAC: ServiceAccount/Role/RoleBinding)
- GitHub OAuth integration
- Helm v3 (prerequisite)
- cert-manager (Ingress TLS)
- Drone CLI (Homebrew install, secret management)
- Drone pipeline YAML (kind: pipeline, type: kubernetes, depends_on, when/trigger, from_secret, resource limits)
- Plugins/images referenced: plugins/docker, bitnami/kubectl, golang:1.22, golangci/golangci-lint

## Sources Consulted
- Drone GitHub Provider docs: https://docs.drone.io/server/provider/github/
- Drone Kubernetes Runner installation: https://docs.drone.io/runner/kubernetes/installation/
- DRONE_USER_CREATE reference: https://docs.drone.io/server/reference/drone-user-create/
- DRONE_DATABASE_DRIVER reference: https://docs.drone.io/server/reference/drone-database-driver/
- Kubernetes Pipeline overview: https://docs.drone.io/pipeline/kubernetes/overview/
- Kubernetes Pipeline step syntax (resources): https://docs.drone.io/pipeline/kubernetes/syntax/steps/
- Pipeline triggers/conditions: https://docs.drone.io/pipeline/triggers/
- Environment variable substitution: https://docs.drone.io/pipeline/environment/substitution/
- Drone CLI install: https://docs.drone.io/cli/install/
- drone/drone Docker Hub tags: https://hub.docker.com/r/drone/drone/tags
- Kubernetes API references for apps/v1 Deployment, v1 Service/PVC/ServiceAccount, rbac.authorization.k8s.io/v1 Role/RoleBinding, networking.k8s.io/v1 Ingress

## Issues Found
No technical issues found. All Drone server and runner environment variables, the drone/drone:2 and drone/drone-runner-kube:latest images, container ports, RBAC verbs for secrets and pods/pods/log, pipeline `kind`/`type`/`depends_on`/`from_secret`/`when`/`trigger` syntax, the `${DRONE_COMMIT_SHA:0:8}` substring substitution, the Drone-style resources block (CPU as plain millicore integers, memory with MiB/GiB suffixes), the GitHub OAuth callback URL of `/login`, the `brew install drone-cli` formula, and the `drone secret add --repository --name --data` CLI invocation are all consistent with the official Drone 2.x and Kubernetes documentation.

## Review Notes
- The post creates a `DRONE_DATABASE_SECRET` in the Kubernetes Secret but does not wire it into the Deployment env (and uses SQLite). This is harmless — Drone falls back to an unencrypted secret store — but operators using an external DB would want to mount `DRONE_DATABASE_SECRET` into the server for encrypted-at-rest secrets.
- `drone/drone:2` is a floating tag that tracks 2.x and currently resolves to 2.28.x. Pinning to an explicit minor (e.g., `2.28`) is safer for reproducible upgrades; the same applies to `drone/drone-runner-kube:latest`.
- The Drone server Deployment exposes `containerPort: 443`, but the bundled binary only listens on `:443` when TLS is configured server-side (DRONE_TLS_AUTOCERT or DRONE_TLS_CERT). With TLS terminated at the Ingress, that second container port is unused but not harmful.
- The line "Resource Limits for Build Pods" is missing the `##` heading prefix in the source markdown — purely a formatting nit, not a technical error, so it was left unchanged per the review guidelines.
- `DRONE_RPC_HOST` is set to `drone-server.drone.svc:80`; the in-cluster DNS short form works, though `drone-server.drone.svc.cluster.local` is the fully qualified equivalent.
- The Drone-style pipeline `resources` block uses Drone's own units (plain integer millicores, `MiB`/`GiB` suffixes), which differs from native Kubernetes resource notation — readers familiar only with Kubernetes resource quantities may find this surprising.
