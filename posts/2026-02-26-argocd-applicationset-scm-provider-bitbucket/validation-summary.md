# Validation Summary: How to Use SCM Provider Generator for Bitbucket

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD ApplicationSet
- SCM Provider generator
- Bitbucket Cloud
- Bitbucket Server / Data Center
- Kubernetes Secrets, ConfigMaps, and NetworkPolicy
- kubectl

## Sources Consulted
- Argo CD ApplicationSet SCM Provider Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-SCM-Provider/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes Managing Secrets using kubectl: https://kubernetes.io/docs/tasks/configmap-secret/managing-secret-using-kubectl/
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Atlassian Bitbucket Cloud app password permissions: https://support.atlassian.com/bitbucket-cloud/docs/app-password-permissions/
- Atlassian Bitbucket Cloud app password usage: https://support.atlassian.com/bitbucket-cloud/docs/using-app-passwords/

## Issues Found
- The Bitbucket Server examples used `basicAuth.passwordRef` without the required `basicAuth.username`. Added a username to each Bitbucket Server `basicAuth` example and added `username` to the setup Secret.
- The Bitbucket Cloud `allBranches: false` comment said it scanned all repositories rather than only the main branch. Updated the comment to match Argo CD's documented behavior.
- The post claimed Bitbucket Cloud supports topic/label filtering with `labelMatch`. Argo CD documents that Bitbucket Cloud and Bitbucket Server do not support label filtering. Replaced that example with supported repository, branch, and path filters.
- The self-signed TLS section only created a ConfigMap and did not show how the SCM provider uses it. Updated the ConfigMap key and added a `bitbucketServer.caRef` example.
- The debug command attempted to decode the whole Secret `.data` map with `base64 -d`, which is not correct. Replaced it with per-key JSONPath decoding for `username` and `token`.

## Review Notes
The YAML examples use the default non-Go-template ApplicationSet syntax (`{{repository}}`, `{{url}}`, and similar), which is still valid. Argo CD also supports Go templating with `goTemplate: true`, where parameter references use dot-prefixed syntax such as `{{ .repository }}`.
