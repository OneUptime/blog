# Validation Summary: How to Trigger Workflows on Pull Requests

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions workflow syntax
- Pull request and pull_request_target events
- Branch, path, label, and activity type filters
- GitHub Actions contexts and expressions
- GitHub REST API issue comments via actions/github-script
- dorny/paths-filter

## Sources Consulted
- GitHub Docs: Workflow syntax for GitHub Actions - https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Docs: Events that trigger workflows - https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- GitHub Docs: Skipping workflow runs - https://docs.github.com/en/actions/how-tos/manage-workflow-runs/skip-workflow-runs
- GitHub Docs: Secure use reference - https://docs.github.com/en/enterprise-cloud@latest/actions/reference/security/secure-use
- GitHub Docs: Contexts reference - https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- GitHub Docs: REST API endpoints for issue comments - https://docs.github.com/en/rest/issues/comments
- actions/github-script README - https://github.com/actions/github-script
- dorny/paths-filter GitHub repository / Marketplace listing - https://github.com/dorny/paths-filter and https://github.com/marketplace/actions/paths-changes-filter

## Issues Found
- The branch filtering example used both `branches` and `branches-ignore` on the same `pull_request` event. GitHub Actions does not allow those filters together for one event, so I changed the exclusion to a negative `branches` pattern (`!release/**-alpha`) and updated the pattern description.
- The path filtering example used both `paths` and `paths-ignore` on the same `pull_request` event. GitHub Actions does not allow those filters together for one event, so I changed the exclusion to a negative `paths` pattern (`!docs/**`).
- The `pull_request_target` example checked out `github.event.pull_request.head.sha`, which is untrusted PR code. GitHub warns against checking out untrusted pull request code under privileged triggers, so I changed the example to check out the trusted base SHA and run base-repository automation.
- The PR comment example had an invalid JavaScript template literal around the Markdown code fence. I changed it to build the body with `['## Coverage Report', '```', coverage, '```'].join('\n')` and added `await` to the REST API call.
- The PR comment example set explicit permissions without `contents: read`, which can break `actions/checkout` in private repositories. I added `contents: read`.
- The skip-CI example used `github.event.head_commit.message`, which is not available on `pull_request` events. I replaced it with GitHub's built-in skip instructions for the HEAD commit message of a pull request.
- The `dorny/paths-filter` example used `@v3`; the Marketplace listing now shows v4 as the latest major version. I updated the example to `dorny/paths-filter@v4`.

## Review Notes
- The post is technically relevant and contains multiple workflow configuration examples, so it was reviewed as a code/configuration tutorial.
- `pull_request` workflows from forks still have restricted token and secret behavior; comment or deployment examples may require trusted PRs, adjusted permissions, or `pull_request_target` with careful separation from untrusted code.
