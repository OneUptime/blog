# Validation Summary: How to Deploy Authelia Authentication Server with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Authelia
- Flux CD
- Kubernetes
- HelmRelease and HelmRepository custom resources
- ingress-nginx external authentication
- Redis
- Kubernetes Secrets and ConfigMaps

## Sources Consulted
- Authelia configuration documentation: https://www.authelia.com/configuration/
- Authelia server configuration: https://www.authelia.com/configuration/miscellaneous/server/
- Authelia file authentication backend documentation: https://www.authelia.com/configuration/first-factor/file/
- Authelia session configuration documentation: https://www.authelia.com/configuration/session/introduction/
- Authelia password hash generation guide: https://www.authelia.com/reference/guides/passwords/
- Authelia Kubernetes Helm chart documentation: https://www.authelia.com/integration/kubernetes/chart/
- Authelia Helm chart repository and chart versions: https://charts.authelia.com/
- Authelia chart values and templates for chart 0.10.59: https://github.com/authelia/chartrepo/tree/authelia-0.10.59/charts/authelia
- Authelia ingress-nginx integration documentation: https://www.authelia.com/integration/kubernetes/nginx-ingress/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes kubectl create secret generic reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Bitnami Redis chart values reference: https://github.com/bitnami/charts/blob/main/bitnami/redis/values.yaml

## Issues Found
- The Kubernetes prerequisite was too low for the pinned modern Authelia chart. Updated it from Kubernetes v1.26+ to v1.30+, matching the Authelia chart kubeVersion requirement for the corrected chart range.
- The Authelia secret keys did not match the current chart's mounted secret file names. Updated the `kubectl create secret` command to use the keys expected by the Authelia chart for reset-password JWT, session encryption, storage encryption, and Redis password files.
- The Authelia configuration used legacy `server.host` and `server.port` keys. Replaced them with the current `server.address` form and added the `auth-request` authorization endpoint used by ingress-nginx.
- The file authentication password hashing configuration used `algorithm: argon2id`, which is not the current schema. Updated it to `algorithm: argon2` with `argon2.variant: argon2id` and current Argon2 parameter names.
- The session configuration used the legacy top-level `session.domain` and global `default_redirection_url`. Replaced these with the current `session.cookies` list including `domain`, `authelia_url`, and `default_redirection_url`.
- The SQLite database and filesystem notifier paths pointed outside the chart's persisted `/config` mount. Updated them to `/config/db.sqlite3` and `/config/notification.txt`.
- The password hash generation example used the generic `argon2` CLI rather than Authelia's documented hash generator. Replaced it with `authelia crypto hash generate argon2`.
- The HelmRelease values had duplicate `secret:` and `configMap:` keys and several chart values that do not exist in the Authelia chart. Consolidated the values, mounted the users database Secret through `pod.extraVolumes` and `pod.extraVolumeMounts`, moved resources under `pod.resources`, and used current `ingress.className` and `ingress.rulesOverride`.
- The chart version range was outdated. Updated it from `>=0.9.0 <0.10.0` to `>=0.10.50 <0.11.0`, which keeps the bundled Redis dependency behavior while using current Authelia 4.39 chart releases.
- The ingress annotations used the obsolete `/api/verify` endpoint and public URL for auth subrequests. Updated them to the documented ingress-nginx `auth-method`, in-cluster `/api/authz/auth-request` URL, and current `auth-signin` form.
- The Flux Kustomization example path comment placed the Flux Kustomization manifest inside the same directory being reconciled. Updated the filename comment so the Flux Kustomization lives outside the target application path.

## Review Notes
- The local environment did not have `helm`, `kubectl`, or `flux` installed, so CLI verification was performed against official documentation and chart source instead of local `--help` output.
- The post still uses SQLite and a file-backed user database for simplicity. The existing best-practice notes correctly recommend PostgreSQL, SMTP, LDAP, and encrypted Git-managed secrets for production.
