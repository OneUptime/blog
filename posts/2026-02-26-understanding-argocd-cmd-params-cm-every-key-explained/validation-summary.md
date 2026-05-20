# Validation Summary: Understanding ArgoCD argocd-cmd-params-cm: Every Key Explained

## Status
validated

## Post Type
Reference guide

## Technologies Covered
- Argo CD
- Kubernetes ConfigMaps
- Kubernetes kubectl rollout commands
- GitOps
- Redis
- Argo CD ApplicationSet Controller
- Argo CD Notifications Controller

## Sources Consulted
- Argo CD official stable `argocd-cmd-params-cm.yaml` reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD official user management documentation for failed login throttling: https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/
- Argo CD official source for server ConfigMap parameter wiring: https://github.com/argoproj/argo-cd/blob/master/manifests/base/server/argocd-server-deployment.yaml
- Argo CD official source for repo-server ConfigMap parameter wiring: https://github.com/argoproj/argo-cd/blob/master/manifests/base/repo-server/argocd-repo-server-deployment.yaml
- Argo CD official source for application controller flags and defaults: https://github.com/argoproj/argo-cd/blob/master/cmd/argocd-application-controller/commands/argocd_application_controller.go
- Argo CD official source for Redis/cache flags: https://github.com/argoproj/argo-cd/blob/master/util/cache/cache.go

## Issues Found
- The post claimed to explain every key in `argocd-cmd-params-cm`, but the current official reference contains many additional keys. I changed the title and description to describe the post as a guide to important key parameters instead of a complete every-key reference.
- `server.rootpath` was described as the API server root path. I updated the wording to match the official use case: running Argo CD behind a reverse proxy under a subpath.
- `server.login.attempts.ratelimit` is not a valid `argocd-cmd-params-cm` key in the current official reference or source. I removed that invalid ConfigMap section. Argo CD login throttling is controlled with environment variables such as `ARGOCD_SESSION_FAILURE_MAX_FAIL_COUNT` and `ARGOCD_SESSION_FAILURE_WINDOW_SECONDS`.
- `controller.self.heal.timeout.seconds` was shown with a default of `5`. The current official application controller default is `0`, so I corrected the example comment.
- `reposerver.git.request.timeout` examples used bare numeric values. The current official docs and source use Go duration strings such as `15s`, so I changed the examples to `120s` and `180s`.
- `reposerver.plugin.tar.exclusions` used a comma-separated example. The official docs specify semicolon-separated patterns, so I changed the example to `node_modules;.git`.
- `redis.username`, `redis.password`, `redis.sentinels`, and `redis.sentinel.master` were presented as `argocd-cmd-params-cm` keys, but they are not current documented keys in the official ConfigMap reference. I removed those invalid sections.

## Review Notes
The post remains a useful practical reference, but it is not exhaustive for current Argo CD releases. Future updates should either pin the Argo CD version being documented or regenerate the key list from the official `argocd-cmd-params-cm.yaml` reference.
