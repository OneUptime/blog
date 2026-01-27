# How to Use CircleCI Orbs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CircleCI, CI/CD, DevOps, Automation, Orbs, Continuous Integration

Description: Learn how to use CircleCI Orbs to simplify your CI/CD pipelines with reusable, shareable packages of configuration that eliminate boilerplate and accelerate delivery.

---

> CircleCI Orbs are reusable packages of YAML configuration that condense repeated patterns into a single line of code, allowing teams to ship faster while maintaining consistency across projects.

## What Are CircleCI Orbs?

Orbs are shareable packages of CircleCI configuration. Think of them as pre-built modules that encapsulate jobs, commands, and executors into reusable components. Instead of copying and pasting the same YAML across repositories, you reference an orb and get battle-tested configuration instantly.

Orbs solve three major problems:

1. **Boilerplate elimination** - Common tasks like deploying to AWS or building Docker images require dozens of lines. Orbs reduce this to a few lines.
2. **Standardization** - Teams maintain consistent CI/CD patterns across all projects.
3. **Maintenance** - When best practices change, update the orb once and all consumers benefit.

## Using Orbs in Your Configuration

To use an orb, declare it in the `orbs` section of your `.circleci/config.yml` file. Here is a basic example:

```yaml
# CircleCI configuration version (2.1 required for orbs)
version: 2.1

# Declare orbs you want to use in this configuration
orbs:
  # Import the Node.js orb from CircleCI's registry
  # Format: orb-name: namespace/orb-name@version
  node: circleci/node@5.2.0

# Define your CI/CD workflows
workflows:
  # Name of the workflow
  build-and-test:
    jobs:
      # Use a job provided by the node orb
      # This handles Node.js installation, caching, and dependency installation
      - node/test:
          # Specify which Node.js version to use
          version: '20.10'
```

The `orbs` key imports external configurations. The format follows `alias: namespace/orb-name@version`. You then reference jobs, commands, or executors from that orb using the alias.

## Popular Orbs: AWS, Docker, and Node.js

CircleCI maintains official orbs for common platforms. These are production-ready and frequently updated.

### AWS Orb

The AWS orb simplifies interactions with Amazon Web Services including S3, ECS, ECR, and Lambda deployments.

```yaml
version: 2.1

orbs:
  # Import the AWS CLI orb for AWS service interactions
  aws-cli: circleci/aws-cli@4.1.3

jobs:
  deploy-to-s3:
    # Use the default executor provided by the AWS CLI orb
    executor: aws-cli/default
    steps:
      # Check out your repository code
      - checkout
      # Set up AWS CLI with credentials from environment variables
      # This command configures authentication using AWS_ACCESS_KEY_ID
      # and AWS_SECRET_ACCESS_KEY from your CircleCI project settings
      - aws-cli/setup:
          # Optional: specify a named profile for multi-account setups
          profile_name: default
          # Optional: set the default region for AWS operations
          region: us-east-1
      # Sync local files to an S3 bucket
      - run:
          name: Deploy static assets to S3
          command: |
            # Sync the build directory to the S3 bucket
            # --delete removes files from S3 that do not exist locally
            aws s3 sync ./dist s3://my-bucket-name --delete

workflows:
  deploy:
    jobs:
      - deploy-to-s3:
          # Only deploy when changes are pushed to the main branch
          filters:
            branches:
              only: main
```

### Docker Orb

The Docker orb provides commands for building, tagging, and pushing container images.

```yaml
version: 2.1

orbs:
  # Import the Docker orb for container operations
  docker: circleci/docker@2.6.0

jobs:
  build-and-push:
    # Use the Docker orb's executor which has Docker pre-installed
    executor: docker/docker
    steps:
      - checkout
      # Authenticate to Docker Hub using credentials stored in CircleCI
      # Requires DOCKER_LOGIN and DOCKER_PASSWORD environment variables
      - docker/check:
          # Enable Docker layer caching for faster builds (requires paid plan)
          docker-password: DOCKER_PASSWORD
          docker-username: DOCKER_LOGIN
      # Build the Docker image from the Dockerfile in the current directory
      - docker/build:
          # Name and tag for the image
          image: myorg/myapp
          # Tag the image with the Git commit SHA for traceability
          tag: ${CIRCLE_SHA1}
      # Push the built image to Docker Hub
      - docker/push:
          image: myorg/myapp
          tag: ${CIRCLE_SHA1}

workflows:
  build-deploy:
    jobs:
      - build-and-push
```

### Node.js Orb

The Node.js orb handles version management, dependency caching, and test execution.

```yaml
version: 2.1

orbs:
  # Import the Node.js orb for JavaScript/TypeScript projects
  node: circleci/node@5.2.0

jobs:
  build:
    # Use the Node.js executor with a specific version
    executor:
      name: node/default
      tag: '20.10'
    steps:
      - checkout
      # Install dependencies with intelligent caching
      # Automatically detects npm, yarn, or pnpm and caches node_modules
      - node/install-packages:
          # Use npm as the package manager (alternatives: yarn, pnpm)
          pkg-manager: npm
          # Cache dependencies based on package-lock.json hash
          cache-version: v1
      # Run your build script defined in package.json
      - run:
          name: Build application
          command: npm run build
      # Run tests
      - run:
          name: Run tests
          command: npm test
      # Persist build artifacts for downstream jobs
      - persist_to_workspace:
          root: .
          paths:
            - dist

workflows:
  test-and-build:
    jobs:
      - build
```

## Creating Custom Orbs

When existing orbs do not fit your needs, create your own. Custom orbs encapsulate organization-specific patterns and can be shared privately or publicly.

### Inline Orbs (For Development)

Start with inline orbs to prototype before publishing:

```yaml
version: 2.1

# Define an inline orb for development and testing
orbs:
  # Inline orb definition - useful for prototyping before publishing
  my-orb:
    # Commands are reusable steps you can call from any job
    commands:
      # Define a command for running database migrations
      run-migrations:
        # Parameters allow customization when the command is called
        parameters:
          environment:
            type: string
            default: "development"
            description: "Target environment for migrations"
        steps:
          - run:
              name: Run database migrations
              command: |
                echo "Running migrations for << parameters.environment >>"
                npm run migrate -- --env << parameters.environment >>
    # Executors define the runtime environment for jobs
    executors:
      # Define a custom executor with specific Docker image
      node-postgres:
        docker:
          # Primary container runs your application code
          - image: cimg/node:20.10
          # Secondary container provides PostgreSQL for tests
          - image: cimg/postgres:15.0
            environment:
              POSTGRES_USER: testuser
              POSTGRES_DB: testdb
              POSTGRES_PASSWORD: testpass

jobs:
  migrate:
    # Reference the custom executor from our inline orb
    executor: my-orb/node-postgres
    steps:
      - checkout
      # Use the custom command from our inline orb
      - my-orb/run-migrations:
          environment: "staging"

workflows:
  deploy:
    jobs:
      - migrate
```

### Publishing a Custom Orb

To publish an orb for reuse across projects:

```yaml
# File: src/@orb.yml
# This is the main orb manifest file

version: 2.1

description: >
  A custom orb for deploying applications to our internal platform.
  Provides standardized deployment commands and health checks.

display:
  home_url: https://github.com/myorg/my-deployment-orb
  source_url: https://github.com/myorg/my-deployment-orb

# Commands that this orb provides
commands:
  deploy:
    description: "Deploy application to the specified environment"
    parameters:
      environment:
        type: enum
        enum: ["staging", "production"]
        description: "Target deployment environment"
      service-name:
        type: string
        description: "Name of the service to deploy"
      timeout:
        type: integer
        default: 300
        description: "Deployment timeout in seconds"
    steps:
      - run:
          name: Validate deployment parameters
          command: |
            echo "Deploying << parameters.service-name >> to << parameters.environment >>"
      - run:
          name: Execute deployment
          command: |
            # Call your deployment script with the parameters
            ./scripts/deploy.sh \
              --env << parameters.environment >> \
              --service << parameters.service-name >> \
              --timeout << parameters.timeout >>
      - run:
          name: Verify deployment health
          command: |
            # Run health checks after deployment
            ./scripts/health-check.sh << parameters.service-name >>

  rollback:
    description: "Rollback to the previous deployment"
    parameters:
      service-name:
        type: string
        description: "Name of the service to rollback"
    steps:
      - run:
          name: Execute rollback
          command: ./scripts/rollback.sh << parameters.service-name >>

# Jobs that this orb provides
jobs:
  deploy-service:
    description: "Complete deployment job with approval gates"
    executor: default
    parameters:
      environment:
        type: enum
        enum: ["staging", "production"]
      service-name:
        type: string
    steps:
      - checkout
      - deploy:
          environment: << parameters.environment >>
          service-name: << parameters.service-name >>

# Executors that this orb provides
executors:
  default:
    docker:
      - image: cimg/base:current
    resource_class: medium
```

## Orb Parameters and Configuration

Parameters make orbs flexible. CircleCI supports several parameter types that allow consumers to customize orb behavior.

```yaml
version: 2.1

orbs:
  node: circleci/node@5.2.0

# Parameters defined at the pipeline level
# These can be set via API triggers or the CircleCI UI
parameters:
  run-integration-tests:
    type: boolean
    default: true
    description: "Whether to run integration tests"
  node-version:
    type: string
    default: "20.10"
    description: "Node.js version to use"

jobs:
  test:
    executor:
      name: node/default
      # Reference pipeline parameter for Node version
      tag: << pipeline.parameters.node-version >>
    steps:
      - checkout
      - node/install-packages
      # Run unit tests unconditionally
      - run:
          name: Unit tests
          command: npm run test:unit
      # Conditionally run integration tests based on parameter
      - when:
          condition: << pipeline.parameters.run-integration-tests >>
          steps:
            - run:
                name: Integration tests
                command: npm run test:integration

workflows:
  test-workflow:
    jobs:
      - test
```

### Parameter Types Reference

Orbs support multiple parameter types for different use cases:

```yaml
# Example showing all parameter types available in orbs
commands:
  example-command:
    parameters:
      # String parameters accept any text value
      message:
        type: string
        default: "Hello"
        description: "Message to display"

      # Boolean parameters for true/false flags
      verbose:
        type: boolean
        default: false
        description: "Enable verbose output"

      # Integer parameters for numeric values
      retry-count:
        type: integer
        default: 3
        description: "Number of retry attempts"

      # Enum parameters restrict values to a predefined list
      log-level:
        type: enum
        enum: ["debug", "info", "warn", "error"]
        default: "info"
        description: "Logging verbosity level"

      # Executor parameters allow passing executor references
      custom-executor:
        type: executor
        default: default
        description: "Executor to use for this command"

      # Steps parameters allow injecting custom steps
      pre-steps:
        type: steps
        default: []
        description: "Steps to run before the main command"

      # Environment variable name parameters
      api-key-var:
        type: env_var_name
        default: API_KEY
        description: "Environment variable containing the API key"
    steps:
      # Execute any pre-steps passed by the consumer
      - steps: << parameters.pre-steps >>
      - run:
          name: Run with parameters
          command: |
            echo "<< parameters.message >>"
            if [ "<< parameters.verbose >>" = "true" ]; then
              echo "Verbose mode enabled"
            fi
```

## Orb Versioning

Orb versioning follows semantic versioning (semver) conventions. Understanding versioning helps you balance stability with access to new features.

```yaml
version: 2.1

orbs:
  # Pin to exact version for maximum stability
  # Use this in production pipelines to prevent unexpected changes
  aws-cli: circleci/aws-cli@4.1.3

  # Use minor version range to get patch updates automatically
  # Format: @major.minor - allows 4.1.x patches
  docker: circleci/docker@2.6

  # Use major version range to get minor and patch updates
  # Format: @major - allows 5.x.x updates
  node: circleci/node@5

  # Use volatile tag for development only (not recommended for production)
  # This always uses the latest published version
  # WARNING: Can break your pipeline without notice
  # slack: circleci/slack@volatile
```

### Version Selection Best Practices

Choose your versioning strategy based on your risk tolerance:

```yaml
version: 2.1

# Production configuration - pin exact versions
orbs:
  # Exact version pinning ensures reproducible builds
  # Update manually after testing new versions
  aws-cli: circleci/aws-cli@4.1.3
  docker: circleci/docker@2.6.0
  node: circleci/node@5.2.0

# The trade-off:
# - Exact versions: Maximum stability, manual updates required
# - Minor ranges (@2.6): Auto-receive bug fixes, rare breaking changes
# - Major ranges (@5): More features automatically, higher risk
# - Volatile: Always latest, highest risk - never use in production
```

## Publishing Your Orb

Publishing makes your orb available to others. CircleCI provides CLI tools for the entire lifecycle.

```bash
# Install the CircleCI CLI if you have not already
# macOS
brew install circleci

# Linux
curl -fLSs https://raw.githubusercontent.com/CircleCI-Public/circleci-cli/main/install.sh | bash

# Authenticate the CLI with your CircleCI account
circleci setup

# Create a new orb namespace (one-time setup per organization)
# Namespaces are globally unique identifiers for your orbs
circleci namespace create myorg github myorg

# Create the orb within your namespace
# This registers the orb name but does not publish any code yet
circleci orb create myorg/my-deployment-orb

# Validate your orb configuration before publishing
# Catches syntax errors and invalid configuration
circleci orb validate src/@orb.yml

# Pack the orb from multiple files into a single file
# Useful when your orb is split across multiple YAML files
circleci orb pack src/ > orb.yml

# Publish a development version for testing
# Dev versions are mutable and expire after 90 days
circleci orb publish orb.yml myorg/my-deployment-orb@dev:alpha

# Publish a production release
# Production versions are immutable and permanent
circleci orb publish promote myorg/my-deployment-orb@dev:alpha patch
# Use 'patch', 'minor', or 'major' to increment the version
```

### Orb Development Workflow

A typical orb development workflow in your CI configuration:

```yaml
version: 2.1

# Use the orb-tools orb to help develop and publish orbs
orbs:
  orb-tools: circleci/orb-tools@12.1.0

workflows:
  # Workflow for testing orb changes on pull requests
  test-orb:
    jobs:
      # Lint the orb configuration
      - orb-tools/lint:
          filters:
            branches:
              ignore: main
      # Pack and validate the orb
      - orb-tools/pack:
          filters:
            branches:
              ignore: main
      # Publish a dev version for integration testing
      - orb-tools/publish:
          orb_name: myorg/my-orb
          vcs_type: github
          pub_type: dev
          requires:
            - orb-tools/lint
            - orb-tools/pack
          filters:
            branches:
              ignore: main

  # Workflow for publishing releases from the main branch
  publish-orb:
    jobs:
      - orb-tools/pack:
          filters:
            branches:
              only: main
      # Publish production version with semver increment
      - orb-tools/publish:
          orb_name: myorg/my-orb
          vcs_type: github
          pub_type: production
          requires:
            - orb-tools/pack
          filters:
            branches:
              only: main
```

## Best Practices Summary

When working with CircleCI Orbs, follow these guidelines for maintainable and reliable CI/CD pipelines:

**Version Management**
- Pin exact versions in production configurations for reproducible builds
- Test orb updates in a staging environment before promoting to production
- Subscribe to orb changelogs or watch repositories for breaking changes

**Security**
- Review orb source code before using third-party orbs in sensitive pipelines
- Prefer CircleCI-certified orbs (circleci namespace) when available
- Never expose secrets in orb parameters - use environment variables instead

**Organization**
- Create private orbs for organization-specific patterns and internal tools
- Document custom orbs thoroughly with descriptions and examples
- Use meaningful parameter names and provide sensible defaults

**Performance**
- Leverage orb executors for consistent, optimized runtime environments
- Use orb caching commands to speed up dependency installation
- Combine multiple orb commands in single jobs to reduce overhead

**Maintenance**
- Regularly audit and update orb versions to get security fixes
- Test orb changes in development versions before production releases
- Keep custom orbs focused on single responsibilities

---

CircleCI Orbs transform verbose YAML configurations into concise, reusable components. Start with certified orbs for common tasks, then create custom orbs as your organization's patterns emerge. The initial investment in orb adoption pays dividends through faster pipeline development and consistent practices across teams.

Monitor your CI/CD pipeline performance and reliability with [OneUptime](https://oneuptime.com). Track build times, failure rates, and deployment frequency to continuously improve your delivery process.
