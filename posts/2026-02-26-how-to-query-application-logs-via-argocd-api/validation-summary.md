# Validation Summary: How to Query Application Logs via ArgoCD API

## Status
validated

## Post Type
Tutorial / API guide

## Technologies Covered
- Argo CD REST API
- Argo CD application logs
- Kubernetes pod logs
- curl
- jq
- Python requests
- Argo CD RBAC
- Grafana Loki push API

## Sources Consulted
- Argo CD API docs: https://argo-cd.readthedocs.io/en/stable/developer-guide/api-docs/
- Argo CD generated Swagger definition for ApplicationService PodLogs, ResourceTree, and ManagedResources: https://github.com/argoproj/argo-cd/blob/master/assets/swagger.json
- Argo CD ApplicationService protobuf definitions: https://github.com/argoproj/argo-cd/blob/master/server/application/application.proto
- Argo CD `argocd app logs` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_logs/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- curl `--data-urlencode` and `--get` documentation: https://curl.se/docs/manpage.html

## Issues Found
- The curl examples for `/api/v1/applications/{name}/logs` used `--data-urlencode` without `-G`. curl sends `--data-urlencode` data as POST data by default, but Argo CD documents this endpoint as a GET endpoint with query parameters. I added `-G` to the log API curl examples so curl appends the encoded parameters to the URL and uses GET.
- The post called the shown log parameters a "complete reference," but the official API also includes parameters such as `kind`, `group`, `resourceName`, `untilTime`, `appNamespace`, `project`, `matchCase`, and `sinceTime.*`. I changed the wording to "most common ones" without expanding the section.
- The Python `get_pod_logs` function returned the raw Argo CD streaming JSON response. The documented response wraps each log entry as a stream object with `result.content`, so printing and searching the raw response would include JSON envelopes rather than just log lines. I added `extract_log_content()` and made `get_pod_logs()` return extracted log content.

## Review Notes
- The endpoint, query parameter names (`namespace`, `podName`, `container`, `sinceSeconds`, `tailLines`, `follow`, `filter`, and `previous`), resource-tree endpoint, managed-resources endpoint, and RBAC `logs, get` policy examples match current Argo CD documentation/source.
- The Loki forwarding example is a minimal illustration. Production forwarding should preserve original log timestamps where available and handle batching, retries, and ordering constraints.
