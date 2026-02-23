# How to Set Up Infracost in CI/CD Pipelines for Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Infracost, CI/CD, Cost Management, DevOps

Description: Learn how to integrate Infracost into your CI/CD pipelines to automatically show cloud cost estimates on Terraform pull requests and enforce cost policies.

---

Showing cost estimates on pull requests gives teams visibility into the financial impact of infrastructure changes before they are merged. Infracost integrates with all major CI/CD platforms to post cost comments directly on pull requests. This guide covers setting up Infracost in GitHub Actions, GitLab CI, Azure DevOps, and other platforms.

## How Infracost CI/CD Integration Works

Infracost runs during your CI/CD pipeline, analyzes the Terraform plan, calculates costs, and posts a comment on the pull request showing the cost breakdown and change. This creates a natural checkpoint where reviewers can assess both the technical and financial impact of changes.

## GitHub Actions Setup

```yaml
# .github/workflows/infracost.yml
name: Infracost
on:
  pull_request:
    paths:
      - '**/*.tf'
      - '**/*.tfvars'

jobs:
  infracost:
    name: Infracost Cost Estimation
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write

    env:
      TF_ROOT: environments/production

    steps:
      - name: Checkout base branch
        uses: actions/checkout@v4
        with:
          ref: '${{ github.event.pull_request.base.ref }}'

      - name: Setup Infracost
        uses: infracost/actions/setup@v3
        with:
          api-key: ${{ secrets.INFRACOST_API_KEY }}

      - name: Generate Infracost baseline
        run: |
          infracost breakdown --path=${TF_ROOT} \
            --format=json \
            --out-file=/tmp/infracost-base.json

      - name: Checkout PR branch
        uses: actions/checkout@v4

      - name: Generate Infracost diff
        run: |
          infracost diff --path=${TF_ROOT} \
            --format=json \
            --compare-to=/tmp/infracost-base.json \
            --out-file=/tmp/infracost.json

      - name: Post PR comment
        uses: infracost/actions/comment@v1
        with:
          path: /tmp/infracost.json
          behavior: update
```

## GitLab CI Setup

```yaml
# .gitlab-ci.yml
infracost:
  stage: validate
  image: infracost/infracost:ci-latest
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
      changes:
        - '**/*.tf'
        - '**/*.tfvars'

  variables:
    INFRACOST_API_KEY: $INFRACOST_API_KEY
    TF_ROOT: environments/production

  script:
    # Generate baseline from target branch
    - git checkout $CI_MERGE_REQUEST_TARGET_BRANCH_NAME -- $TF_ROOT
    - infracost breakdown --path=$TF_ROOT
        --format=json
        --out-file=/tmp/infracost-base.json

    # Generate diff from source branch
    - git checkout $CI_COMMIT_SHA -- $TF_ROOT
    - infracost diff --path=$TF_ROOT
        --format=json
        --compare-to=/tmp/infracost-base.json
        --out-file=/tmp/infracost.json

    # Post comment to merge request
    - infracost comment gitlab
        --path=/tmp/infracost.json
        --repo=$CI_PROJECT_PATH
        --merge-request=$CI_MERGE_REQUEST_IID
        --gitlab-server-url=$CI_SERVER_URL
        --gitlab-token=$GITLAB_TOKEN
        --behavior=update
```

## Azure DevOps Setup

```yaml
# azure-pipelines.yml
trigger: none
pr:
  branches:
    include:
      - main
  paths:
    include:
      - '**/*.tf'

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: InfracostSetup@2
    inputs:
      apiKey: $(INFRACOST_API_KEY)

  - bash: |
      # Checkout base branch for baseline
      git checkout $(System.PullRequest.TargetBranch)
      infracost breakdown --path=environments/production \
        --format=json \
        --out-file=/tmp/infracost-base.json
    displayName: 'Generate baseline costs'

  - checkout: self

  - bash: |
      infracost diff --path=environments/production \
        --format=json \
        --compare-to=/tmp/infracost-base.json \
        --out-file=/tmp/infracost.json
    displayName: 'Generate cost diff'

  - bash: |
      infracost comment azure-repos \
        --path=/tmp/infracost.json \
        --azure-access-token=$(System.AccessToken) \
        --pull-request=$(System.PullRequest.PullRequestId) \
        --repo-url=$(Build.Repository.Uri) \
        --behavior=update
    displayName: 'Post PR comment'
```

## Multi-Project Configuration

For repositories with multiple Terraform configurations:

```yaml
# infracost.yml (project configuration)
version: 0.1

projects:
  - path: environments/production/networking
    name: Production Networking

  - path: environments/production/compute
    name: Production Compute

  - path: environments/production/databases
    name: Production Databases

  - path: environments/staging
    name: Staging Environment
```

Update the CI/CD pipeline to use the config file:

```yaml
# In your pipeline
- name: Generate Infracost diff
  run: |
    infracost diff --config-file=infracost.yml \
      --format=json \
      --compare-to=/tmp/infracost-base.json \
      --out-file=/tmp/infracost.json
```

## Adding Cost Thresholds

Enforce cost policies by failing the pipeline when costs exceed thresholds:

```yaml
# GitHub Actions with cost threshold
- name: Check cost threshold
  run: |
    # Extract the total monthly cost difference
    DIFF=$(jq -r '.diffTotalMonthlyCost' /tmp/infracost.json)
    echo "Monthly cost change: $DIFF"

    # Fail if cost increase exceeds $500/month
    if (( $(echo "$DIFF > 500" | bc -l) )); then
      echo "::error::Cost increase of \$$DIFF/month exceeds the \$500 threshold"
      exit 1
    fi

    # Warn if cost increase exceeds $100/month
    if (( $(echo "$DIFF > 100" | bc -l) )); then
      echo "::warning::Cost increase of \$$DIFF/month exceeds \$100 warning threshold"
    fi
```

## Using Infracost Cloud Dashboard

For teams wanting centralized cost visibility:

```yaml
# Upload results to Infracost Cloud
- name: Upload to Infracost Cloud
  run: |
    infracost upload --path=/tmp/infracost.json
```

This provides a dashboard showing cost trends across all repositories and pull requests.

## Adding Usage Estimates in CI/CD

Include usage-based estimates in your pipeline:

```yaml
# infracost-usage.yml in your repository
version: 0.1

resource_usage:
  aws_lambda_function.api:
    monthly_requests: 1000000
    request_duration_ms: 250
  aws_nat_gateway.main:
    monthly_data_processed_gb: 100
```

```yaml
# Reference in pipeline
- name: Generate cost estimate with usage
  run: |
    infracost breakdown --path=environments/production \
      --usage-file=infracost-usage.yml \
      --format=json \
      --out-file=/tmp/infracost.json
```

## The PR Comment Output

The PR comment shows a clear cost breakdown:

```markdown
## Infracost Cost Estimate

| Project | Previous | New | Diff |
|---------|----------|-----|------|
| Production Compute | $1,250/mo | $1,580/mo | +$330/mo |
| Production Databases | $890/mo | $890/mo | $0 |

### Cost Details

+ aws_instance.api_server (NEW)
  + Linux/UNIX usage (on-demand, t3.xlarge)   730 hours   $121.47
  + root_block_device - 100 GB gp3            100 GB       $8.00

~ aws_instance.web_server (CHANGED)
  ~ Instance type t3.large -> t3.xlarge       730 hours   +$60.74

Monthly cost will increase by $330.21 (+16.4%)
```

## Best Practices

Run Infracost on every pull request that changes Terraform files. Use the compare-to flag to show cost differences rather than absolute costs. Set reasonable cost thresholds based on your team's budget. Provide usage estimates for resources with variable pricing. Use the update behavior for PR comments to avoid spam. Include Infracost configuration in your repository. Review cost comments as part of your code review process.

## Conclusion

Integrating Infracost into your CI/CD pipeline brings automatic cost visibility to every infrastructure change. By showing cost estimates directly on pull requests, it enables teams to make informed decisions and catch unexpected cost increases before they reach production. The setup is straightforward for all major CI/CD platforms, and the value it provides in cost control is significant.

For related guides, see [How to Use Infracost with Terraform for Cost Estimation](https://oneuptime.com/blog/post/2026-02-23-how-to-use-infracost-with-terraform-for-cost-estimation/view) and [How to Implement Cost Controls with Terraform Policies](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-cost-controls-with-terraform-policies/view).
