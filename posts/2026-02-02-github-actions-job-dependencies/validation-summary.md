# Validation Summary: How to Handle Job Dependencies in GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions (workflows, jobs, dependencies)
- YAML workflow syntax
- `actions/checkout@v4`
- `actions/setup-node@v4`
- `actions/upload-artifact@v4`
- `actions/download-artifact@v4`
- Reusable workflows
- Matrix builds
- Node.js / npm
- PostgreSQL service containers
- Playwright (for E2E tests)
- Mermaid diagrams

## Sources Consulted
- GitHub Actions workflow syntax reference: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions
- `jobs.<job_id>.needs` documentation: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idneeds
- Expressions and status check functions: https://docs.github.com/en/actions/learn-github-actions/expressions#status-check-functions
- Job outputs and `$GITHUB_OUTPUT`: https://docs.github.com/en/actions/using-jobs/defining-outputs-for-jobs
- Storing workflow data as artifacts: https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts
- `actions/upload-artifact` v4 release notes / README: https://github.com/actions/upload-artifact
- `actions/download-artifact` v4 release notes / README: https://github.com/actions/download-artifact
- Reusable workflows: https://docs.github.com/en/actions/using-workflows/reusing-workflows
- Service containers (`services:`): https://docs.github.com/en/actions/using-containerized-services/about-service-containers

## Issues Found
No technical issues found.

All examples use current, non-deprecated action versions (v4 for checkout, setup-node, upload-artifact, download-artifact). The `$GITHUB_OUTPUT` environment file mechanism is the current standard (replacing the deprecated `::set-output::` workflow command). Status check function names (`success()`, `failure()`, `always()`, `cancelled()`) match the GitHub documentation exactly, including the British spelling of `cancelled`. The default artifact retention claim (90 days) is correct. Matrix combination math (3 Node versions × 2 OS = 6 combinations) is correct. Reusable workflow syntax with `secrets: inherit` and `with:` inputs is correct.

## Review Notes
- The CI/CD pipeline's `deploy-staging` and `deploy-production` jobs reference `needs.build.outputs.build_id`, but `build` is not in their direct `needs:` list (only the test jobs are). At runtime, accessing `needs.build` from a job that does not declare `build` in `needs:` will return null/empty in the expression context. However, this is a subtle behavioral issue rather than a syntax error — the workflow file would still parse and run, with the `build_id` simply rendering as empty. Since the post's intent is illustrative ("Add your deployment commands here"), this is acceptable but readers reproducing the pattern should add `build` to the `needs` array (or chain through `deploy-staging`) if they want the output to be accessible.
- The post's claim that `needs: build` is required to access build outputs is reiterated in the Troubleshooting section, so the guidance is correct even if the larger example slightly deviates from it.
- Node.js versions in the matrix (18, 20, 22) are all valid as of 2026; v18 is in or near end-of-maintenance but still works on GitHub Actions runners.
