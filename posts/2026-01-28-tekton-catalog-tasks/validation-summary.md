# Validation Summary: How to Implement Tekton Catalog Tasks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Tekton Pipelines
- Tekton Catalog
- Tekton Tasks
- Kubernetes
- kubectl
- YAML
- Node.js

## Sources Consulted
- Tekton Catalog `git-clone` task, version 0.10: https://raw.githubusercontent.com/tektoncd/catalog/main/task/git-clone/0.10/git-clone.yaml
- Tekton Catalog `git-clone` task directory listing: https://api.github.com/repos/tektoncd/catalog/contents/task/git-clone?ref=main
- Tekton Pipelines documentation: https://tekton.dev/docs/pipelines/pipelines/
- Tekton Tasks documentation: https://tekton.dev/docs/pipelines/tasks/
- Tekton guide, "Clone a git repository with Tekton": https://tekton.dev/docs/how-to-guides/clone-repository/
- Tekton CLI documentation: https://tekton.dev/docs/cli/

## Issues Found
- The install command pinned `git-clone` to catalog version 0.9, which uses `apiVersion: tekton.dev/v1beta1`. Updated it to catalog version 0.10, which uses `apiVersion: tekton.dev/v1` and is the latest version present in the official catalog directory listing.
- The Pipeline example referenced the `git-clone` task without passing its required `url` parameter. Added a Pipeline parameter named `repo-url` and passed it to the `clone` task as `url`, matching the official `git-clone` task specification.

## Review Notes
The official catalog currently marks the `git-clone` task YAML with `tekton.dev/deprecated: "true"` even in version 0.10. The example is still technically consistent with Tekton's official how-to guide and catalog layout, but future revisions should consider Tekton remote resolvers or another maintained distribution path if the catalog task is removed or replaced.
