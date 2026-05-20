# Validation Summary: How to Use Pull Request Generator in ApplicationSets

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD ApplicationSet
- Argo CD Pull Request generator
- GitHub, GitLab, Bitbucket Cloud, and Bitbucket Server
- Kubernetes namespaces and ResourceQuota
- Helm parameter overrides
- GitHub CLI
- Bash and kubectl

## Sources Consulted
- Argo CD ApplicationSet Pull Request generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Pull-Request/
- Argo CD ApplicationSet Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD ApplicationSet Application pruning and resource deletion documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Application-Deletion/
- Argo CD Sync Options documentation for `CreateNamespace=true`: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- GitHub CLI manual for `gh pr edit`: https://cli.github.com/manual/gh_pr_edit

## Issues Found
- The main ApplicationSet example used legacy template references such as `{{number}}` and `{{head_sha}}` while the current Argo CD Pull Request generator documentation uses Go templates. I added `goTemplate: true`, `goTemplateOptions: ["missingkey=error"]`, and changed template references to the documented Go-template form such as `{{.number}}` and `{{.head_sha}}`.
- The template parameter list described `labels` as a comma-separated string. Current Argo CD documentation describes it as an array of pull request labels supported in Go-template ApplicationSet manifests, so I corrected that description.
- The parameter list omitted current documented parameters including `title`, `head_short_sha_7`, and `author`. I added them to keep the reference accurate.
- The GitLab example said the `project` value could be a path or ID and used `myorg/api-service`. Current Argo CD documentation requires the GitLab project ID, so I changed the comment and example to use a numeric project ID.
- The Bitbucket Cloud and Bitbucket Server basic-auth snippets omitted `username`. Argo CD documents `basicAuth.username` with `passwordRef`, so I added `username: myuser` to both examples.
- The target-branch filter example used `branchMatch`, which matches the source branch, while the surrounding text said it filtered the target branch. I changed the filter to `targetBranchMatch: "^main$"`.
- Standalone snippets that referenced PR parameters were updated to Go-template syntax so they remain consistent with the corrected ApplicationSet example.

## Review Notes
- `CreateNamespace=true` ensures the destination namespace exists, but generated namespaces are not automatically tracked as normal child resources unless managed as part of the Application. The post's cleanup discussion is accurate for the generated Application and its managed resources.
- The stale cleanup script uses GNU `date -d`, which is appropriate for typical Linux-based Kubernetes administration environments but is not portable to macOS without adjustment.
