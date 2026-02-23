# How to Test Terraform with GitLab CI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GitLab CI, CI/CD, Testing, DevOps, Automation

Description: Learn how to build a complete Terraform testing pipeline in GitLab CI with validation, linting, plan review, security scanning, and integration tests.

---

GitLab CI has built-in Terraform support through its official templates, merge request integration, and environment management features. This guide shows you how to build a Terraform testing pipeline from scratch in GitLab CI, going beyond the default template to include proper unit tests, security scanning, and integration tests.

## Pipeline Structure

A well-organized GitLab CI pipeline for Terraform uses stages that flow from fast to slow:

```yaml
# .gitlab-ci.yml

# Define pipeline stages in order
stages:
  - validate
  - test
  - security
  - plan
  - integration

# Default settings for all jobs
default:
  image: hashicorp/terraform:1.7.0
  before_script:
    - terraform --version

# Only run on MRs that change Terraform files
workflow:
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
      changes:
        - "**/*.tf"
        - "**/*.tfvars"
        - ".gitlab-ci.yml"
    - if: '$CI_COMMIT_BRANCH == "main"'
```

## Stage 1: Validate

Format checking and validation run first because they are fast and need no credentials.

```yaml
# Format check
fmt:
  stage: validate
  script:
    - terraform fmt -check -recursive -diff
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'

# Validate each module
validate:
  stage: validate
  script:
    - |
      for dir in modules/*/; do
        echo "Validating $dir..."
        cd "$dir"
        terraform init -backend=false -input=false
        terraform validate
        cd "$CI_PROJECT_DIR"
      done
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'

# Lint with TFLint
lint:
  stage: validate
  image: ghcr.io/terraform-linters/tflint:latest
  script:
    - tflint --init
    - |
      for dir in modules/*/; do
        echo "Linting $dir..."
        tflint --chdir="$dir"
      done
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
```

## Stage 2: Unit Tests

Run Terraform's native test framework for each module.

```yaml
# Run native Terraform tests
unit-tests:
  stage: test
  parallel:
    matrix:
      - MODULE: [networking, compute, database, monitoring]
  script:
    - cd "modules/${MODULE}"
    - terraform init -backend=false
    - terraform test -verbose
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
  artifacts:
    reports:
      junit: modules/${MODULE}/test-results.xml
    when: always
```

To generate JUnit reports from Terraform tests (for GitLab's test reporting), use a wrapper script:

```bash
#!/bin/bash
# scripts/run-tests-junit.sh
# Runs terraform test and converts output to JUnit XML

MODULE_DIR="$1"
OUTPUT_FILE="${MODULE_DIR}/test-results.xml"

cd "$MODULE_DIR"
terraform init -backend=false > /dev/null 2>&1

# Run tests and capture output
TEST_OUTPUT=$(terraform test -verbose 2>&1)
EXIT_CODE=$?

# Count passes and failures
PASS_COUNT=$(echo "$TEST_OUTPUT" | grep -c "Pass")
FAIL_COUNT=$(echo "$TEST_OUTPUT" | grep -c "Fail")
TOTAL=$((PASS_COUNT + FAIL_COUNT))

# Generate JUnit XML
cat > "$OUTPUT_FILE" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<testsuites tests="$TOTAL" failures="$FAIL_COUNT">
  <testsuite name="terraform-test" tests="$TOTAL" failures="$FAIL_COUNT">
EOF

# Parse each test result
echo "$TEST_OUTPUT" | grep -E "(Pass|Fail)" | while read -r line; do
  TEST_NAME=$(echo "$line" | awk '{print $2}')
  STATUS=$(echo "$line" | awk '{print $1}')

  if [ "$STATUS" = "Pass" ]; then
    echo "    <testcase name=\"$TEST_NAME\" />" >> "$OUTPUT_FILE"
  else
    echo "    <testcase name=\"$TEST_NAME\">" >> "$OUTPUT_FILE"
    echo "      <failure message=\"Test failed\">$line</failure>" >> "$OUTPUT_FILE"
    echo "    </testcase>" >> "$OUTPUT_FILE"
  fi
done

echo "  </testsuite>" >> "$OUTPUT_FILE"
echo "</testsuites>" >> "$OUTPUT_FILE"

exit $EXIT_CODE
```

## Stage 3: Security Scanning

```yaml
# Trivy security scan
trivy-scan:
  stage: security
  image:
    name: aquasec/trivy:latest
    entrypoint: [""]
  script:
    - trivy config --severity HIGH,CRITICAL --exit-code 1 .
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
  allow_failure: false

# Conftest policy check
policy-check:
  stage: security
  image: openpolicyagent/conftest:latest
  script:
    - |
      for dir in environments/*/; do
        echo "Checking policies for $dir..."
        cd "$dir"
        terraform init -backend=false > /dev/null 2>&1
        terraform plan -out=tfplan -input=false > /dev/null 2>&1
        terraform show -json tfplan > plan.json
        conftest test plan.json --policy "$CI_PROJECT_DIR/policy/"
        cd "$CI_PROJECT_DIR"
      done
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
```

## Stage 4: Plan Review

Show the Terraform plan in the merge request.

```yaml
# Generate and display plan for each environment
plan:
  stage: plan
  parallel:
    matrix:
      - ENVIRONMENT: [dev, staging, production]
  script:
    - cd "environments/${ENVIRONMENT}"
    - terraform init -input=false
    - terraform plan -out=tfplan -input=false
    - terraform show tfplan > plan.txt
    - terraform show -json tfplan > plan.json
  artifacts:
    paths:
      - environments/${ENVIRONMENT}/tfplan
      - environments/${ENVIRONMENT}/plan.txt
      - environments/${ENVIRONMENT}/plan.json
    expire_in: 7 days
  environment:
    name: ${ENVIRONMENT}
    action: prepare
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
  # Use different AWS credentials per environment
  variables:
    AWS_ROLE_ARN: $AWS_${ENVIRONMENT}_ROLE_ARN
```

To post the plan as a merge request comment, use the GitLab API:

```yaml
post-plan-comment:
  stage: plan
  needs: ["plan"]
  image: alpine:latest
  script:
    - apk add --no-cache curl jq
    - |
      # Build the comment body from plan outputs
      BODY="## Terraform Plan Summary\n\n"
      for env in dev staging production; do
        if [ -f "environments/${env}/plan.txt" ]; then
          BODY="${BODY}### ${env}\n\`\`\`\n$(cat environments/${env}/plan.txt | tail -20)\n\`\`\`\n\n"
        fi
      done

      # Post as MR note
      curl --request POST \
        --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
        --header "Content-Type: application/json" \
        --data "$(jq -n --arg body "$BODY" '{body: $body}')" \
        "${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/merge_requests/${CI_MERGE_REQUEST_IID}/notes"
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
```

## Stage 5: Integration Tests

Run integration tests with Go and Terratest.

```yaml
integration-tests:
  stage: integration
  image: golang:1.21
  before_script:
    # Install Terraform in the Go image
    - apt-get update && apt-get install -y unzip
    - wget https://releases.hashicorp.com/terraform/1.7.0/terraform_1.7.0_linux_amd64.zip
    - unzip terraform_1.7.0_linux_amd64.zip -d /usr/local/bin/
    - terraform --version
  script:
    - cd test
    - go test -v -timeout 30m ./...
  variables:
    TEST_PREFIX: "gl-${CI_PIPELINE_ID}"
    CGO_ENABLED: "0"
  # Only run when explicitly triggered
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
      when: manual
      allow_failure: true
  environment:
    name: testing
  timeout: 45m
  # Clean up resources even if tests fail
  after_script:
    - cd test && go test -v -timeout 10m -run TestCleanup ./... || true
```

## Caching

Speed up pipelines with caching:

```yaml
# Global cache settings
default:
  cache:
    - key: terraform-providers-${CI_COMMIT_REF_SLUG}
      paths:
        - "**/.terraform/providers/"
      policy: pull-push
    - key: go-modules
      paths:
        - test/vendor/
      policy: pull-push
```

## Using GitLab's Terraform State Backend

GitLab provides a built-in Terraform state backend:

```hcl
# backend.tf
terraform {
  backend "http" {
    # GitLab manages these via CI variables
  }
}
```

```yaml
# In your CI job
plan:
  variables:
    TF_ADDRESS: "${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/terraform/state/${ENVIRONMENT}"
    TF_HTTP_USERNAME: "gitlab-ci-token"
    TF_HTTP_PASSWORD: "${CI_JOB_TOKEN}"
```

## Merge Request Approvals

Configure GitLab to require passing pipeline and approval before merge:

```yaml
# In your project settings or .gitlab/merge_request_templates/
# Require the plan job to pass before merging
plan:
  stage: plan
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
  # This makes the plan a required check
  allow_failure: false
```

In your project's merge request settings, enable "Pipelines must succeed" and set up approval rules that require infrastructure team review when Terraform files change.

## Child Pipelines for Complex Projects

For monorepos with many Terraform modules, use child pipelines:

```yaml
# .gitlab-ci.yml (parent)
generate-pipelines:
  stage: validate
  script:
    - |
      # Generate child pipeline config for each changed module
      echo "include:" > child-pipeline.yml
      git diff --name-only origin/main... | grep '\.tf$' | xargs -I{} dirname {} | sort -u | while read dir; do
        echo "  - local: '.gitlab/ci/${dir}.yml'" >> child-pipeline.yml
      done
  artifacts:
    paths:
      - child-pipeline.yml

trigger-tests:
  stage: test
  trigger:
    include:
      - artifact: child-pipeline.yml
        job: generate-pipelines
```

GitLab CI gives you the tools to build a robust Terraform testing pipeline. The built-in Terraform state backend, merge request integration, and environment management make it a strong platform for infrastructure testing. Start with validation and linting, add security scanning, then build up to integration tests as your needs grow.

For GitHub users, see [How to Test Terraform with GitHub Actions](https://oneuptime.com/blog/post/2026-02-23-how-to-test-terraform-with-github-actions/view). For testing strategy, see [How to Set Up End-to-End Terraform Testing Pipelines](https://oneuptime.com/blog/post/2026-02-23-how-to-set-up-end-to-end-terraform-testing-pipelines/view).
