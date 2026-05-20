# Validation Summary: How to Create Deep Links to CI/CD Pipelines from ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD deep links
- Kubernetes ConfigMaps and resource annotations
- GitHub Actions
- GitLab CI/CD
- Jenkins and Blue Ocean
- CircleCI
- Azure DevOps Pipelines
- Docker Hub and GitHub Container Registry
- yq

## Sources Consulted
- Argo CD Deep Links documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/deep_links/
- Argo CD 2.6 to 2.7 upgrade notes for deep-link template prefixes: https://argo-cd.readthedocs.io/en/stable/operator-manual/upgrading/2.6-2.7/
- Argo CD deep-link implementation source, including Sprig template function usage and named `app` / `resource` objects: https://github.com/argoproj/argo-cd/blob/master/server/deeplinks/deeplinks.go
- GitHub Actions workflow runs REST documentation, including run `html_url` format: https://docs.github.com/rest/actions/workflow-runs/
- GitHub Actions contexts documentation for `github.server_url`, `github.repository`, `github.run_id`, `github.run_number`, and `github.sha`: https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/accessing-contextual-information-about-workflow-runs
- GitLab CI/CD pipelines documentation: https://docs.gitlab.com/ci/pipelines/
- Jenkins Blue Ocean Activity View documentation: https://www.jenkins.io/doc/book/blueocean/activity/
- yq evaluate command documentation: https://mikefarah.gitbook.io/yq/commands/evaluate
- Docker Hub repository and tag documentation: https://docs.docker.com/docker-hub/repos/manage/hub-images/tags/

## Issues Found
- The Argo CD deep-link examples used older unqualified template paths such as `.spec.source.repoURL`, `.status.sync.revision`, `.metadata`, and `kind`. Updated them to the current named deep-link objects such as `.app.spec.source.repoURL`, `.app.status.sync.revision`, `.resource.metadata`, and `resource.kind`, matching Argo CD's current deep-link docs and 2.7+ upgrade guidance.
- Several resource annotation examples used dot notation for keys containing `/` or `-`, such as `.metadata.annotations.ci/build-url` and `.metadata.annotations.jenkins-build-url`. Those are not valid Go template field chains. Updated them to use `index .resource.metadata.annotations "..."` in URL/title templates and bracket notation in `if` expressions.
- URL values that begin with Go template delimiters were unquoted inside the `application.links` / `resource.links` YAML lists. Quoted those scalars so the deep-link list itself parses as YAML.
- GitLab web URLs omitted the documented `/-/` project route segment for pipelines, commits, merge requests, and environments. Updated the GitLab examples to use `/-/pipelines`, `/-/commit`, `/-/merge_requests`, and `/-/environments`.
- The Pod container image example used `.spec.containers[0].image`, which is not valid Go text/template syntax. Updated it to `{{(index .resource.spec.containers 0).image ...}}`.

## Review Notes
- The URL templates are still examples and assume simple single-source Argo CD Applications and conventional repository hosting. Multi-source Applications or self-hosted GitLab/GitHub instances may need adjusted templates.
- The GitHub, Jenkins, CircleCI, and Azure DevOps URLs are plausible UI deep links, but exact branch filtering behavior can vary by product UI and installation configuration.
