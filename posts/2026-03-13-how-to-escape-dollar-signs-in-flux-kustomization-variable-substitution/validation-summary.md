# Validation Summary: How to Escape Dollar Signs in Flux Kustomization Variable Substitution

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux Kustomization post-build substitution
- Kubernetes ConfigMaps and Deployments
- YAML manifests
- Bash shell scripts
- NGINX configuration
- PostgreSQL dollar-quoted strings
- Regular expressions

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `envsubst` documentation: https://v2-6.docs.fluxcd.io/flux/cmd/flux_envsubst/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes Deployment documentation: https://v1-35.docs.kubernetes.io/docs/concepts/workloads/controllers/deployment/
- PostgreSQL lexical structure documentation, dollar-quoted string constants: https://www.postgresql.org/docs/current/sql-syntax-lexical.html
- NGINX documentation showing variables with `proxy_set_header`: https://docs.nginx.com/nginx/admin-guide/load-balancer/using-proxy-protocol/

## Issues Found
- The post said an undefined `${request_id}` placeholder remains as-is. Flux documentation states that undefined `${var}` variables are substituted with an empty string unless a default value is provided, and strict substitution can be used to fail instead. Updated the problem statement to reflect this behavior.
- The prerequisites described a Kustomization with post-build substitution "enabled". Flux documentation states substitution only happens when at least one variable or substitute source is defined. Updated the prerequisite to name `.spec.postBuild.substitute` and `.spec.postBuild.substituteFrom`.

## Review Notes
- The local `flux` CLI was not installed in the review environment, so `flux envsubst --help` could not be checked locally. The command and `--strict` flag were verified against official Flux CLI documentation.
- Flux documentation recommends using `$var` instead of `${var}` in embedded scripts when braces are not required, and `$${var}` when braces must be preserved. The post's escaping examples align with that guidance.
