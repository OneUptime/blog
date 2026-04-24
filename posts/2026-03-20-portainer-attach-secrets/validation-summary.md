# Validation Summary: How to Attach Secrets to Applications in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes Secrets
- `kubectl`
- Kubernetes Ingress
- TLS secrets
- Docker registry pull secrets
- PostgreSQL official container image

## Sources Consulted
- Portainer, Add a Secret: https://docs.portainer.io/user/kubernetes/configurations/add-1
- Portainer, Add a new application using a form: https://docs.portainer.io/sts/user/kubernetes/applications/add
- Kubernetes, Secrets concept: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes, Distribute Credentials Securely Using Secrets: https://kubernetes.io/docs/tasks/inject-data-application/distribute-credentials-secure/
- Kubernetes, Good practices for Kubernetes Secrets: https://kubernetes.io/docs/concepts/security/secrets-good-practices/
- Kubernetes, Encrypting Confidential Data at Rest: https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/
- Kubernetes, `kubectl create secret tls`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- Kubernetes, `kubectl create secret docker-registry`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Docker Official Image, Postgres: https://hub.docker.com/_/postgres

## Issues Found
- The Portainer navigation and button names in Step 1 were outdated. The post said to open `Secrets` directly and click `+ Add secret`; current Portainer docs use `ConfigMaps & Secrets`, then the `Secrets` tab, and `Add with form`. I updated the instructions to match the current UI.
- The Portainer application flow in Step 2 was inaccurate. The post described adding secrets from an `Environment` section via `+ From Secret`; current Portainer docs show secrets being attached from the `Secrets` section, with all keys exposed as environment variables by default. I corrected that workflow.
- The Step 2 YAML snippet was presented as generic YAML even though it is a PodSpec fragment, not a full manifest. I relabeled it as `In a Pod spec` to avoid implying it can be applied standalone.
- The Step 3 text referenced PostgreSQL's `PGPASSWORD_FILE`, but the official Postgres container documents `POSTGRES_PASSWORD_FILE` for file-based secret input. I corrected the text to reference the documented variable.
- The Step 7 rotation command recreated only one key in a multi-key Secret. That is unsafe guidance because rotation should preserve every key you want to keep. I updated the command so it recreates and reapplies the full Secret manifest contents.
- The Step 7 propagation note described mounted-secret updates as happening in `~1-2 minutes`. Kubernetes documents secret volume updates as eventually consistent and dependent on kubelet sync and cache behavior, not a fixed time window. I updated the wording accordingly.

## Review Notes
- The post is technically relevant and code-oriented; it is not a `not-code-blog` or `not-technically-relevant` case.
- The YAML snippets in Steps 2, 3, and 5 are still partial PodSpec examples. In a Deployment or StatefulSet, these fields belong under `spec.template.spec`.
- The guidance about restarting Pods for environment-variable-based secrets is correct. Kubernetes does not refresh already-populated environment variables in running containers when the Secret changes.
- For mounted secrets, automatic updates do not apply if the Secret is mounted using `subPath`. The post does not use `subPath`, so no edit was required.
