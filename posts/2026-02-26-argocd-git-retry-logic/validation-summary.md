# Validation Summary: How to Configure Git Retry Logic in ArgoCD

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Argo CD
- Kubernetes
- Git
- Prometheus
- GitHub, GitLab, and Bitbucket repository hosting

## Sources Consulted
- Argo CD command parameters documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD high availability documentation for repo server Git attempts and metrics: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD automated sync policy documentation for sync retry fields: https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD FAQ for reconciliation polling and webhook behavior: https://argo-cd.readthedocs.io/en/stable/faq/
- Argo CD source code for Git retry environment variables and repo server metrics: https://github.com/argoproj/argo-cd
- Git config documentation for `http.lowSpeedLimit` and `http.lowSpeedTime`: https://git-scm.com/docs/git-config
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The post described `reposerver.git.request.timeout` as the maximum number of retries. Changed it to describe the setting as the Git request timeout and updated the example value from `"60"` to the duration string `"60s"`, matching Argo CD documentation.
- The post described `ARGOCD_GIT_ATTEMPTS_COUNT` too broadly as retrying every failed Git operation. Narrowed the language to supported Git remote requests such as `ls-remote` revision resolution, which is what the Argo CD documentation and source code support.
- The post omitted current Git retry backoff environment variables. Added `ARGOCD_GIT_RETRY_DURATION`, `ARGOCD_GIT_RETRY_FACTOR`, and `ARGOCD_GIT_RETRY_MAX_DURATION` to the repo server example because these are present in current Argo CD source.
- The Git config example used `transfer.retryCount`, which is not a documented Git config key. Removed that setting and changed the explanation to cover the documented `http.lowSpeedLimit` and `http.lowSpeedTime` behavior.
- The webhook/rate-limiting explanation implied webhooks fully replace polling by themselves. Adjusted the wording to say webhooks reduce reliance on polling, especially when the reconciliation interval is increased.
- The Prometheus examples used `grpc_code` on `argocd_git_request_total`, but Argo CD Git request metrics are labeled with `repo` and `request_type`, not `grpc_code`. Updated the examples and alert to use `argocd_git_request_total{request_type="fetch"}` and `argocd_git_fetch_fail_total`.

## Review Notes
The application-level sync retry YAML matches Argo CD documentation. The `kubectl exec` deployment form is valid according to Kubernetes documentation, although `kubectl` was not installed in the local environment to run `kubectl exec --help`.
