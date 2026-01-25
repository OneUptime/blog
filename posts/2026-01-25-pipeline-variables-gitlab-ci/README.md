# How to Use Pipeline Variables in GitLab CI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitLab CI, Variables, CI/CD, Configuration, DevOps

Description: Master GitLab CI pipeline variables to manage configuration, secrets, and dynamic values across your CI/CD workflows with proper scoping and security practices.

---

Variables are the backbone of flexible GitLab CI pipelines. They let you pass configuration, manage secrets, and customize behavior without hardcoding values. This guide covers everything from basic variable usage to advanced patterns that keep your pipelines maintainable.

## Types of Variables in GitLab CI

GitLab CI supports several types of variables, each with different scopes and use cases.

Predefined variables come built into GitLab. These include `CI_COMMIT_SHA`, `CI_PROJECT_NAME`, `CI_PIPELINE_ID`, and dozens more. You get them automatically in every job.

Project variables are defined in your GitLab project settings. They're perfect for secrets and environment-specific configuration.

Group variables work like project variables but apply to all projects in a GitLab group.

Instance variables are set by GitLab administrators and apply across the entire GitLab instance.

File variables contain the contents of a file, useful for certificates or configuration files.

## Defining Variables in Your Pipeline

The simplest way to define variables is directly in your `.gitlab-ci.yml` file.

```yaml
# Global variables available to all jobs
variables:
  APP_VERSION: "1.2.3"
  BUILD_ENV: "production"
  NODE_OPTIONS: "--max-old-space-size=4096"

stages:
  - build
  - test

build-app:
  stage: build
  # Job-level variables override global ones
  variables:
    BUILD_ENV: "staging"
  script:
    # Access variables with $ prefix
    - echo "Building version ${APP_VERSION}"
    - echo "Environment: ${BUILD_ENV}"
    # This prints "staging" due to job-level override
```

Job-level variables override global variables with the same name. This lets you customize individual jobs while maintaining defaults.

## Using Predefined Variables

GitLab provides extensive predefined variables. Here are the most useful ones.

```yaml
build-job:
  stage: build
  script:
    # Commit information
    - echo "Commit SHA: ${CI_COMMIT_SHA}"
    - echo "Short SHA: ${CI_COMMIT_SHORT_SHA}"
    - echo "Branch: ${CI_COMMIT_REF_NAME}"
    - echo "Commit message: ${CI_COMMIT_MESSAGE}"

    # Pipeline information
    - echo "Pipeline ID: ${CI_PIPELINE_ID}"
    - echo "Job ID: ${CI_JOB_ID}"

    # Project information
    - echo "Project: ${CI_PROJECT_NAME}"
    - echo "Project path: ${CI_PROJECT_PATH}"

    # Registry information (for Docker builds)
    - echo "Registry: ${CI_REGISTRY}"
    - echo "Image path: ${CI_REGISTRY_IMAGE}"
```

These variables help you tag Docker images, generate artifact names, and create dynamic configuration without manual input.

## Variable Expansion and Nesting

GitLab supports variable expansion, where one variable references another.

```yaml
variables:
  REGISTRY: "registry.example.com"
  PROJECT: "my-app"
  # Nested variable references
  IMAGE_NAME: "${REGISTRY}/${PROJECT}"
  IMAGE_TAG: "${IMAGE_NAME}:${CI_COMMIT_SHORT_SHA}"

build-docker:
  stage: build
  script:
    # IMAGE_TAG expands to: registry.example.com/my-app:abc123
    - docker build -t ${IMAGE_TAG} .
    - docker push ${IMAGE_TAG}
```

Variable expansion happens before job execution, so all references resolve correctly.

## Protecting Sensitive Variables

Secrets require special handling. Define them in the GitLab UI rather than your YAML file.

Navigate to Settings, then CI/CD, then Variables in your project. Add your secret with these options:

Protected: Only available in protected branches or tags. Use this for production credentials.

Masked: Hidden in job logs. The value won't appear in console output.

```yaml
deploy-production:
  stage: deploy
  script:
    # These come from GitLab project settings, not the YAML file
    - export AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
    - export AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
    - aws s3 sync dist/ s3://${S3_BUCKET}/
  only:
    - main
```

Never echo or log secret variables. Even masked variables can leak if you're not careful.

## File Type Variables

Some tools need configuration files rather than environment variables. Use file variables for this.

```yaml
deploy-k8s:
  stage: deploy
  script:
    # KUBECONFIG_FILE is a file variable containing the kubeconfig content
    # GitLab creates a temporary file and sets KUBECONFIG_FILE to its path
    - export KUBECONFIG=${KUBECONFIG_FILE}
    - kubectl apply -f manifests/
```

In the GitLab UI, select "File" as the variable type. GitLab creates a temporary file with the content and sets the variable to the file path.

## Dynamic Variables with Rules

Generate variable values dynamically based on conditions.

```yaml
workflow:
  rules:
    # Set deployment target based on branch
    - if: $CI_COMMIT_BRANCH == "main"
      variables:
        DEPLOY_ENV: "production"
        REPLICAS: "3"
    - if: $CI_COMMIT_BRANCH == "develop"
      variables:
        DEPLOY_ENV: "staging"
        REPLICAS: "1"
    - when: always
      variables:
        DEPLOY_ENV: "development"
        REPLICAS: "1"

deploy:
  stage: deploy
  script:
    - echo "Deploying to ${DEPLOY_ENV} with ${REPLICAS} replicas"
    - helm upgrade --set replicas=${REPLICAS} my-app ./chart
```

This pattern eliminates complex if-else logic in your scripts.

## Passing Variables Between Jobs

Jobs run in isolated environments. To share data, use artifacts or dotenv reports.

```yaml
stages:
  - prepare
  - build

# Generate variables for downstream jobs
generate-version:
  stage: prepare
  script:
    # Create a dotenv file with variables
    - echo "VERSION=$(date +%Y%m%d)-${CI_COMMIT_SHORT_SHA}" >> build.env
    - echo "BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> build.env
  # Expose the file as a dotenv artifact
  artifacts:
    reports:
      dotenv: build.env

# Use variables from the previous job
build-app:
  stage: build
  script:
    # VERSION and BUILD_TIME are now available
    - echo "Building version ${VERSION}"
    - docker build --build-arg VERSION=${VERSION} -t app:${VERSION} .
  # Explicitly depend on the prepare job
  needs:
    - generate-version
```

The dotenv report format automatically exports variables to dependent jobs without extra configuration.

## Variable Precedence

When the same variable is defined in multiple places, GitLab uses this precedence order (highest to lowest):

1. Trigger variables (from API or manual pipeline)
2. Scheduled pipeline variables
3. Project-level variables
4. Group-level variables
5. Instance-level variables
6. Job-level variables in YAML
7. Global variables in YAML
8. Deployment variables
9. Predefined variables

Understanding precedence helps debug unexpected variable values.

## Practical Example: Multi-Environment Deployment

Here's a complete example using variables for multi-environment deployments.

```yaml
variables:
  APP_NAME: "my-service"

# Environment-specific configuration
.staging-config:
  variables:
    ENV_NAME: "staging"
    CLUSTER: "staging-cluster"
    NAMESPACE: "staging"
    REPLICAS: "2"

.production-config:
  variables:
    ENV_NAME: "production"
    CLUSTER: "prod-cluster"
    NAMESPACE: "production"
    REPLICAS: "5"

stages:
  - build
  - deploy

build:
  stage: build
  script:
    - docker build -t ${CI_REGISTRY_IMAGE}:${CI_COMMIT_SHA} .
    - docker push ${CI_REGISTRY_IMAGE}:${CI_COMMIT_SHA}

deploy-staging:
  extends: .staging-config
  stage: deploy
  script:
    - gcloud container clusters get-credentials ${CLUSTER}
    - kubectl -n ${NAMESPACE} set image deployment/${APP_NAME} app=${CI_REGISTRY_IMAGE}:${CI_COMMIT_SHA}
    - kubectl -n ${NAMESPACE} scale deployment/${APP_NAME} --replicas=${REPLICAS}
  environment:
    name: ${ENV_NAME}
    url: https://${ENV_NAME}.example.com
  only:
    - develop

deploy-production:
  extends: .production-config
  stage: deploy
  script:
    - gcloud container clusters get-credentials ${CLUSTER}
    - kubectl -n ${NAMESPACE} set image deployment/${APP_NAME} app=${CI_REGISTRY_IMAGE}:${CI_COMMIT_SHA}
    - kubectl -n ${NAMESPACE} scale deployment/${APP_NAME} --replicas=${REPLICAS}
  environment:
    name: ${ENV_NAME}
    url: https://example.com
  when: manual
  only:
    - main
```

The deployment jobs share the same script but use different variables based on their environment configuration.

## Debugging Variable Issues

When variables don't work as expected, add debugging output.

```yaml
debug-vars:
  stage: test
  script:
    # Print all CI_ variables (safe, these are not secrets)
    - env | grep CI_ | sort
    # Check specific variable
    - echo "MY_VAR is set to: ${MY_VAR:-UNDEFINED}"
    # Check if variable is empty vs unset
    - |
      if [ -z "${MY_VAR+x}" ]; then
        echo "MY_VAR is unset"
      elif [ -z "${MY_VAR}" ]; then
        echo "MY_VAR is set but empty"
      else
        echo "MY_VAR has a value"
      fi
```

Use the `:-` syntax to provide default values and the `+x` test to check if a variable exists.

---

Variables transform static pipelines into flexible automation tools. Start with simple global variables, then add project-level secrets and dynamic values as your needs grow. The key is keeping variable definitions organized and understanding the scope and precedence rules that govern them.
