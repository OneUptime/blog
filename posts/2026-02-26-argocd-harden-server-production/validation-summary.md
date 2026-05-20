# Validation Summary: How to Harden ArgoCD Server for Production

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes RBAC
- Kubernetes NetworkPolicy
- Kubernetes securityContext
- Argo CD AppProject
- Redis
- Fluentd
- ingress-nginx

## Sources Consulted
- Argo CD RBAC configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD `argocd admin settings rbac can` command reference: https://argo-cd.readthedocs.io/en/release-2.5/user-guide/commands/argocd_admin_settings_rbac_can/
- Argo CD `argocd-cm.yaml` example: https://argo-cd.readthedocs.io/en/release-2.13/operator-manual/argocd-cm-yaml/
- Argo CD `argocd-cmd-params-cm.yaml` example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD `argocd-server` command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-server/
- Argo CD `argocd-application-controller` command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-application-controller/
- Argo CD Redis FAQ: https://argo-cd.readthedocs.io/en/latest/faq/
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD TLS documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/tls/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes security context documentation: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/

## Issues Found
- The RBAC verification commands tested `developer` instead of the defined `role:developer`. Updated the commands to test the actual Argo CD role subject.
- The log forwarding snippet described a Fluentd sidecar tailing `/var/log/argocd/*.log`, but Argo CD logs to container stdout in Kubernetes by default. Updated the wording and path to target Kubernetes container logs.
- The Redis section said Redis has no authentication by default and implied `redis.server` configures the password. Current Argo CD default installs automatically enable Redis auth using the `argocd-redis` Secret key `auth`, and components read the password from `REDIS_PASSWORD`. Updated the text and example.
- The Redis TLS snippet used a non-existent `redis.tls.enabled` ConfigMap key. Replaced it with the documented `--redis-use-tls` and `--redis-ca-certificate` command flags.
- The rate limiting snippet used non-existent/currently unsupported `server.login.attempts.max` and `server.login.attempts.reset` settings. Replaced it with ingress-nginx rate limiting annotations.

## Review Notes
The NetworkPolicy and reduced controller ClusterRole examples are valid as illustrative hardening patterns, but production deployments should tune them to the exact ingress controller, DNS implementation, Redis mode, managed clusters, and resource kinds each Argo CD installation needs.
