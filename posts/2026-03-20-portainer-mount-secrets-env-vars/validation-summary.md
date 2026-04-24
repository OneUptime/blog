# Validation Summary: How to Mount Secrets as Environment Variables in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- Kubernetes Secrets
- Kubernetes Deployments
- `kubectl`
- RBAC

## Sources Consulted
- Portainer Applications documentation: https://docs.portainer.io/user/kubernetes/applications
- Portainer "Add a new application using a form": https://docs.portainer.io/sts/user/kubernetes/applications/add
- Portainer "Edit an application": https://docs.portainer.io/user/kubernetes/applications/edit
- Portainer "Create an application from a Manifest": https://docs.portainer.io/sts/user/kubernetes/applications/manifest/create
- Kubernetes Secrets concept docs: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes "Define Environment Variables for a Container": https://kubernetes.io/docs/tasks/inject-data-application/define-environment-variable-container/
- Kubernetes "Distribute Credentials Securely Using Secrets": https://kubernetes.io/docs/tasks/inject-data-application/distribute-credentials-secure/
- Kubernetes `kubectl create role` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_role/
- Kubernetes dockershim migration/removal guidance: https://kubernetes.io/docs/tasks/administer-cluster/migrating-from-dockershim/

## Issues Found
- The Portainer form workflow was inaccurate. The draft said to add an environment variable and choose `Secret` as its source, but Portainer's documented Kubernetes form uses a dedicated `Secrets` section that exposes Secret keys as environment variables by default. I corrected Step 2 to match the documented UI flow.
- The full `Deployment` YAML example in Step 3 was incomplete because it omitted the required `spec.selector` and matching pod template labels. I added the selector and labels so the manifest is valid for `apps/v1`.
- The `envFrom.secretRef` explanation overstated the behavior by saying all keys always become environment variables. Kubernetes skips keys that are not valid environment variable names. I clarified that only valid names are injected.
- The comment in Step 5 described the `DB_PASSWORD` mapping as an override, but the example is actually exposing a Secret key under a custom environment variable name. I corrected the comment.
- The verification command in Step 7 could match substrings rather than exact variable names. I tightened the `grep` expression so it counts the intended variables precisely.
- The security section used a `docker inspect` example that is outdated for many Kubernetes clusters because dockershim was removed in Kubernetes v1.24. I replaced it with a node-level container runtime inspection note.
- The RBAC example implied a deny-style `no-exec` role, but Kubernetes RBAC is additive. I changed the example to a narrower read-only role and added notes that the Role must be bound to be effective.
- The introduction overstated Secret protection by implying base64 encoding plus RBAC is the distinguishing security property. I corrected this to reflect that Secrets are intended for sensitive data and should use encryption at rest if protection in etcd is required.
- The conclusion now clarifies that `envFrom.secretRef` is best used when Secret keys already match the environment variable names you want.

## Review Notes
- Portainer's form-based Kubernetes workflow auto-exposes selected Secret keys as environment variables. If you need custom environment variable names or selective per-key mapping, using Kubernetes YAML remains the more precise approach.
- Secret values injected as environment variables still require a pod restart or rollout to be observed after rotation; the post correctly documents this behavior.
