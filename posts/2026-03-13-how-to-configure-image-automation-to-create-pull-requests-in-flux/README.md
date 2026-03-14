# How to Configure Image Automation to Create Pull Requests in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, image-automation, Pull-Requests, GitOps, GitHub, Kubernetes

Description: Learn how to configure Flux image automation to create pull requests for image tag updates instead of committing directly to the main branch.

---

## Introduction

Direct commits to the main branch work for simple setups, but many organizations require pull requests for all changes, including automated image updates. By combining Flux ImageUpdateAutomation with a CI workflow that creates pull requests, you get the benefits of automated image detection while maintaining code review practices and audit trails.

This guide shows you how to set up a complete workflow where Flux detects new images, commits changes to a separate branch, and triggers a CI pipeline that creates or updates a pull request.

## Prerequisites

- A Kubernetes cluster with Flux v2 installed
- The image-reflector-controller and image-automation-controller deployed
- At least one ImageRepository and ImagePolicy configured
- A GitRepository source with write access
- GitHub (or GitLab) repository with CI configured

## Step 1: Configure ImageUpdateAutomation with Separate Branch

First, configure Flux to push image updates to a dedicated branch:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: image-updates
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: flux-bot
        email: flux@example.com
      messageTemplate: |
        Automated image update

        {{ range $image, $_ := .Changed.Objects -}}
        - {{ $image.Resource.Kind }}/{{ $image.Resource.Name }}
        {{ end -}}
    push:
      branch: flux/image-updates
  update:
    path: ./clusters/production
    strategy: Setters
```

## Step 2: Create GitHub Actions Workflow for PR Creation

Create a workflow that triggers when Flux pushes to the dedicated branch:

```yaml
# .github/workflows/flux-image-update-pr.yml
name: Create Flux Image Update PR

on:
  push:
    branches:
      - flux/image-updates

permissions:
  contents: read
  pull-requests: write

jobs:
  create-pr:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: flux/image-updates
          fetch-depth: 0

      - name: Get changed images
        id: changes
        run: |
          DIFF=$(git diff origin/main..HEAD -- '*.yaml' '*.yml')
          echo "diff<<EOF" >> $GITHUB_OUTPUT
          echo "$DIFF" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

      - name: Create or Update Pull Request
        uses: peter-evans/create-pull-request@v5
        with:
          branch: flux/image-updates
          base: main
          title: "chore: automated image updates"
          body: |
            ## Automated Image Updates

            This PR was created by Flux image automation.

            ### Changes
            ```diff
            ${{ steps.changes.outputs.diff }}
            ```

            ### Review Checklist
            - [ ] Verify image versions are expected
            - [ ] Check deployment readiness
          labels: |
            automation
            image-update
          reviewers: platform-team
```yaml

## Step 3: Configure Branch Protection

To ensure image updates go through PR review, set up branch protection rules on `main`:

- Require pull request reviews before merging
- Require status checks to pass
- Restrict who can push to the branch

This prevents any direct pushes to main, including from automation, forcing all changes through the PR workflow.

## GitLab CI Alternative

For GitLab repositories, use a CI pipeline to create merge requests:

```yaml
# .gitlab-ci.yml
create-mr:
  stage: deploy
  only:
    - flux/image-updates
  script:
    - |
      MR_EXISTS=$(curl --silent --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
        "${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/merge_requests?source_branch=flux/image-updates&state=opened" \
        | jq length)
      if [ "$MR_EXISTS" -eq "0" ]; then
        curl --request POST --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
          "${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/merge_requests" \
          --data "source_branch=flux/image-updates" \
          --data "target_branch=main" \
          --data "title=chore: automated image updates" \
          --data "remove_source_branch=true"
      fi
```

## Auto-Merging Pull Requests

For environments where you want automatic merging after checks pass, enable auto-merge on the PR:

```yaml
- name: Create or Update Pull Request
  id: cpr
  uses: peter-evans/create-pull-request@v5
  with:
    branch: flux/image-updates
    base: main
    title: "chore: automated image updates"

- name: Enable Auto-Merge
  if: steps.cpr.outputs.pull-request-number
  run: gh pr merge ${{ steps.cpr.outputs.pull-request-number }} --auto --squash
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Handling Multiple PRs for Different Environments

Create separate automation resources and branches per environment:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: staging-updates
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: flux-bot
        email: flux@example.com
      messageTemplate: "Update staging images"
    push:
      branch: flux/staging-images
  update:
    path: ./clusters/staging
    strategy: Setters
```

Then create separate PR workflows for each branch.

## Verifying the Setup

Check the automation status:

```bash
flux get image update image-updates
```

Check open pull requests:

```bash
gh pr list --label automation
```

## Conclusion

Combining Flux image automation with pull request workflows gives you automated image detection with human oversight. Flux handles the continuous scanning and tag updating, while your CI pipeline creates structured pull requests that can be reviewed, tested, and approved before reaching the main branch. This approach satisfies compliance requirements while keeping the deployment process largely automated.
