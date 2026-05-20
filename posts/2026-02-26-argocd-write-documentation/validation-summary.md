# Validation Summary: How to Write ArgoCD Documentation

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- MkDocs
- Material for MkDocs
- Mermaid
- GitHub CLI
- Docker
- YAML
- Markdown

## Sources Consulted
- Argo CD Documentation Site developer guide: https://argo-cd.readthedocs.io/en/release-3.0/developer-guide/docs-site/
- Argo CD `docs/developer-guide/docs-site.md`: https://github.com/argoproj/argo-cd/blob/master/docs/developer-guide/docs-site.md
- Argo CD `mkdocs.yml`: https://github.com/argoproj/argo-cd/blob/master/mkdocs.yml
- Argo CD `Makefile`: https://github.com/argoproj/argo-cd/blob/master/Makefile
- Argo CD Application specification source: https://github.com/argoproj/argo-cd/blob/master/docs/operator-manual/application.yaml
- Argo CD resource tracking documentation: https://github.com/argoproj/argo-cd/blob/master/docs/user-guide/resource_tracking.md
- Argo CD `argocd-cm` example: https://github.com/argoproj/argo-cd/blob/master/docs/operator-manual/argocd-cm.yaml
- GitHub CLI `gh issue list` manual: https://cli.github.com/manual/gh_issue_list
- Material for MkDocs admonitions reference: https://squidfunk.github.io/mkdocs-material/reference/admonitions/
- Material for MkDocs diagrams reference: https://squidfunk.github.io/mkdocs-material/reference/diagrams/
- MkDocs writing documentation guide: https://www.mkdocs.org/user-guide/writing-your-docs/

## Issues Found
- The Docker-based documentation preview command used `squidfunk/mkdocs-material` directly and did not install Argo CD's documented `docs/requirements.txt` dependencies. Changed it to `make serve-docs`, which matches Argo CD's current Makefile-backed Docker workflow.
- Several nested Markdown examples closed with incorrect fence markers such as ```bash and ```text. Changed the outer examples to four-backtick fences and closed the inner YAML and Mermaid blocks correctly.
- The `application.instanceLabelKey` description implied that Argo CD always uses that label for resource tracking. Updated the text to clarify that the label is used for tracking when `application.resourceTrackingMethod` is `label`, matching current Argo CD resource tracking behavior.
- The `argocd-cm` ConfigMap example placed `namespace` at the document root instead of under `metadata`. Moved it under `metadata` so the YAML is a valid Kubernetes ConfigMap manifest.

## Review Notes
The post is technically valid after the fixes. Argo CD's official docs also recommend `make build-docs` before submitting a PR; the post focuses on local preview and PR submission, so this is an optional future improvement rather than a correctness issue.
