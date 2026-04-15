# Validation Summary: How to Implement Change Management for Dapr Components

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (component CRDs, CLI, component scoping)
- Argo CD (Application resource, automated sync, selfHeal, rollback)
- Kubernetes (kubectl dry-run, custom resources)
- GitHub Actions (CI workflow for validation)
- GitHub CODEOWNERS (branch protection / review enforcement)
- Python 3 (PyYAML, glob for automated validation script)
- Git (repository layout, history, rollback via git show)

## Sources Consulted
- Argo CD official documentation — Automated Sync Policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Dapr official documentation — Component Scopes: https://docs.dapr.io/operations/components/component-scopes/
- Dapr official documentation — Component Schema Reference: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr CLI GitHub repository (dapr/cli) — install script path and default branch: https://github.com/dapr/cli
- GitHub CODEOWNERS documentation: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners

## Issues Found
- **Incorrect explanation of Argo CD `selfHeal` behavior**: The original text stated "Disable `selfHeal` for production to require explicit sync approval." This is misleading. With the `automated` block present in the sync policy, Argo CD will still automatically deploy any changes pushed to Git — no approval step is involved. `selfHeal: false` only prevents Argo CD from auto-reverting manual changes made directly to live cluster resources (drift correction). To truly require explicit sync approval, the `automated` block must be removed entirely. Fixed the explanation to accurately describe what `selfHeal` controls and clarified that removing the `automated` block is needed for full manual approval.

## Review Notes
- The CODEOWNERS file is displayed with ````yaml` syntax highlighting, but CODEOWNERS is a plain-text format, not YAML. This does not affect correctness but ````text` would be more accurate.
- The workflow uses `actions/checkout@v3`, which is functional but `v4` is now available. Not a bug, but could be updated in the future.
- The Python validation script correctly accesses `doc.get("scopes")` at the top level — confirmed via official Dapr docs that `scopes` is a top-level field in the v1alpha1 Component CRD, not nested under `spec`.
- The Dapr CLI install URL (`https://raw.githubusercontent.com/dapr/cli/master/install/install.sh`) was verified as correct — the repo uses `master` as its default branch.
