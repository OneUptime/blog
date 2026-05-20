# Validation Summary: How to Configure GPG Verification per Project in ArgoCD

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Argo CD AppProject configuration
- Argo CD source integrity and Git GnuPG verification
- Kubernetes ConfigMaps and custom resources
- Argo CD CLI
- Git signed commits and cherry-pick workflow
- jq
- Kustomize overlays

## Sources Consulted
- Argo CD Git GnuPG signature verification documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/source-integrity-git-gpg/
- Argo CD GnuPG verification documentation for project-level enforcement and key management: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/gpg-verification/
- Argo CD `argocd gpg list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_gpg_list/
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_create/
- Argo CD Projects documentation for the default project behavior: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Local Git command help for `git commit -S` and `git cherry-pick --no-commit`

## Issues Found
- The post used legacy `.spec.signatureKeys` examples. Current Argo CD documentation recommends `.spec.sourceIntegrity.git.policies` for Git GPG verification, with legacy signature keys marked deprecated in the latest docs. Updated the AppProject examples, Kustomize examples, validation command, default project example, and summary to use `sourceIntegrity` GPG policies.
- The introduction implied Argo CD could "recommend" signatures for staging. Argo CD source integrity policies enforce verification when matched; there is no recommendation-only enforcement mode. Reworded this to describe required staging and production signatures with different trusted key sets.
- The trusted-key counts and trust list did not match the example manifests. Updated the expected output and text so staging has 7 trusted keys, production has 4, and infrastructure has 2.
- The central ConfigMap example did not include all keys referenced later in the post. Added the missing Diana, release/image automation, and Eve public-key placeholders.
- The test-app loop used `--dest-namespace test`, a development repo URL that did not match the `dev-configs.git` example, and the in-cluster destination server for the production project even though the production project allowed `https://production-cluster:6443`. Updated the loop to set matching namespace, repository, and destination values per project.
- The promotion script referenced `STAGING_COMMIT` without setting it. Added `STAGING_COMMIT=$2`.
- The promotion explanation overstated where enforcement happens. Reworded it to clarify that Argo CD enforces the policy at sync time, not at Git push time.
- The automation section suggested ApplicationSet for project configuration, but ApplicationSet generates Applications rather than AppProjects. Reworded this to Kustomize overlays or scripts.

## Review Notes
The updated examples target the current Argo CD source integrity API. Older Argo CD installations that predate this API may still need the legacy `signatureKeys` format.
