# Validation Summary: How to Create Secrets via YAML Manifest in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes Secrets
- YAML
- GNU `base64`
- External Secrets Operator

## Sources Consulted
- Portainer documentation, "Add a Secret": https://docs.portainer.io/user/kubernetes/configurations/add-1
- Portainer documentation, "Create an application from a Manifest": https://docs.portainer.io/sts/user/kubernetes/applications/manifest/create
- Kubernetes documentation, "Secrets": https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes documentation, "Managing Secrets using kubectl": https://kubernetes.io/docs/tasks/configmap-secret/managing-secret-using-kubectl/
- GNU Coreutils manual, "`base64` invocation": https://www.gnu.org/software/coreutils/manual/html_node/base64-invocation.html
- External Secrets Operator documentation, "ExternalSecret": https://external-secrets.io/latest/api/externalsecret/

## Issues Found
- The prerequisites and base64 explanation overstated the rule by implying all Secret values must be base64-encoded in YAML. Updated the wording to clarify that only values under `data` must be base64-encoded, while `stringData` accepts plain text.
- The TLS example used `base64 -w 0`, which is a GNU-specific flag. Replaced it with `base64 < file | tr -d '\n'` so the example is portable while still producing the single-line base64 value needed for inline YAML.
- The Portainer workflow said to click `Deploy` or `Apply`, but the documented create-from-manifest flow for Kubernetes resources is to open `ConfigMaps & Secrets` > `Secrets`, choose `Create from manifest`, and click `Deploy`. Updated the steps to match the current Portainer documentation.
- The External Secrets Operator example used `apiVersion: external-secrets.io/v1beta1`, while the current API documentation shows `external-secrets.io/v1`. Updated the manifest to the current API version.

## Review Notes
- Kubernetes documents that `stringData` does not work well with server-side apply. The post now mentions this caveat where `stringData` is introduced.
