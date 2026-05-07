# Validation Summary: How to Attach Secrets to Applications in Portainer

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Portainer
- Kubernetes Secrets
- kubectl CLI
- External Secrets Operator

## Sources Consulted
- Portainer documentation, "Add a Secret": https://docs.portainer.io/user/kubernetes/configurations/add-1
- Portainer documentation, "Add a new application using a form": https://docs.portainer.io/user/kubernetes/applications/add
- Portainer documentation, "Edit an application": https://docs.portainer.io/user/kubernetes/applications/edit
- Kubernetes documentation, "Secrets": https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes documentation, "Good practices for Kubernetes Secrets": https://kubernetes.io/docs/concepts/security/secrets-good-practices/
- Kubernetes documentation, "Distribute Credentials Securely Using Secrets": https://kubernetes.io/docs/tasks/inject-data-application/distribute-credentials-secure/
- Kubernetes documentation, "JSONPath Support": https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes documentation, "kubectl create secret generic": https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- Kubernetes documentation, "kubectl create secret tls": https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- Kubernetes documentation, "kubectl create secret docker-registry": https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- External Secrets Operator documentation, "Introduction": https://external-secrets.io/main/

## Issues Found
1. **Incorrect explanation of what makes Secrets different from ConfigMaps.** The post implied that Secrets are different because they are base64-encoded and can be restricted with RBAC. Kubernetes documents that base64 is not encryption, Secrets are stored unencrypted by default unless encryption at rest is enabled, and RBAC applies to both resource types. Updated the explanation to describe the real security properties accurately.
2. **Outdated Portainer UI navigation for creating a Secret.** The post said to use "Secrets" in the sidebar and click "Add secret". Current Portainer Kubernetes documentation uses **ConfigMaps & Secrets** with a **Secrets** tab and an **Add with form** button. Updated the steps to match the documented UI.
3. **Incorrect Portainer workflow for attaching a Secret to an application.** The post described attaching a Secret by selecting it as the source for an individual environment variable. Current Portainer application-form documentation shows Secrets being selected in the dedicated **Secrets** section, where Portainer exposes all keys as environment variables by default and allows file-mount overrides. Updated the steps accordingly.
4. **Broken `kubectl` JSONPath example for a hyphenated Secret key.** The original command used `{.data.db-password}`, which does not correctly address a key named `db-password`. Updated both commands to use bracket notation: `{.data['db-password']}`.
5. **Misleading Git guidance for Secrets.** The original advice suggested using `.gitignore` as the primary answer to keeping Secrets out of Git. That is not sufficient for secret manifests and does not address already-tracked files. Updated the guidance to recommend not committing plaintext secrets and to use an encrypted workflow such as Sealed Secrets when Git storage is required.

## Review Notes
- The Kubernetes YAML snippets for `env`, `envFrom`, and secret-backed volumes are technically correct as partial Pod-spec patterns, but they are fragments rather than complete Kubernetes objects.
- The `kubectl create secret generic`, `kubectl create secret tls`, and `kubectl create secret docker-registry` examples are current against the latest Kubernetes command reference. The Docker registry command omits `--docker-email`; Kubernetes documentation still lists the flag, but also notes that the email address is optional.
- Portainer UI labels were checked against the current 2.39 LTS documentation. If Portainer changes the application form in a later release, the UI wording may need another pass.
