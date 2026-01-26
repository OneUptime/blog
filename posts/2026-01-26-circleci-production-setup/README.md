# How to Set Up CircleCI for Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CircleCI, CI/CD, DevOps, Automation, Production

Description: A comprehensive guide to setting up CircleCI for production with workflows, orbs, caching, and security best practices.

---

Setting up a robust CI/CD pipeline is essential for any production environment. CircleCI provides powerful features that help teams automate testing, building, and deploying applications reliably. This guide walks you through configuring CircleCI for production workloads with practical examples and best practices.

## Understanding CircleCI Architecture

Before diving into configuration, let's understand how CircleCI components work together.

```mermaid
graph TB
    A[Code Push] --> B[CircleCI Webhook]
    B --> C[Pipeline Triggered]
    C --> D[Workflow Executor]
    D --> E[Job 1: Build]
    D --> F[Job 2: Test]
    E --> G[Job 3: Deploy Staging]
    F --> G
    G --> H{Manual Approval}
    H -->|Approved| I[Job 4: Deploy Production]
    H -->|Rejected| J[Pipeline Stopped]

    subgraph "CircleCI Pipeline"
        C
        D
        E
        F
        G
        H
        I
        J
    end
```

## Project Setup

First, create a `.circleci` directory in your project root and add a `config.yml` file.

```bash
# Create the CircleCI configuration directory
mkdir -p .circleci

# Create the main configuration file
touch .circleci/config.yml
```

## Basic Configuration Structure

Here's a foundational configuration that establishes the essential building blocks.

```yaml
# .circleci/config.yml
# CircleCI configuration version 2.1 enables features like orbs and reusable commands
version: 2.1

# Orbs are reusable packages of CircleCI configuration
# They simplify common tasks and reduce boilerplate
orbs:
  # Node.js orb provides pre-built commands for Node projects
  node: circleci/node@5.2.0
  # Docker orb simplifies container operations
  docker: circleci/docker@2.5.0
  # Slack orb enables notifications to Slack channels
  slack: circleci/slack@4.12.5

# Executors define the environment where jobs run
# Reusable executors reduce duplication across jobs
executors:
  # Primary executor for most build and test operations
  node-executor:
    docker:
      # Use a specific version for reproducible builds
      - image: cimg/node:20.10.0
    # Working directory inside the container
    working_directory: ~/project
    # Environment variables available to all steps in this executor
    environment:
      NODE_ENV: test

  # Executor with additional services for integration tests
  integration-executor:
    docker:
      - image: cimg/node:20.10.0
      # PostgreSQL service container for database tests
      - image: cimg/postgres:15.4
        environment:
          POSTGRES_USER: testuser
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: testdb
      # Redis service container for cache tests
      - image: cimg/redis:7.2
    working_directory: ~/project
```

## Defining Reusable Commands

Commands let you define reusable step sequences that can be shared across jobs.

```yaml
# Commands are reusable step sequences
# They accept parameters for flexibility
commands:
  # Command to restore and save npm cache
  setup-npm-cache:
    description: "Restore npm cache and install dependencies"
    steps:
      # Restore cached node_modules based on package-lock.json hash
      - restore_cache:
          keys:
            # Primary key uses exact hash of lock file
            - npm-deps-v1-{{ checksum "package-lock.json" }}
            # Fallback key uses any recent cache
            - npm-deps-v1-
      # Install dependencies only if needed
      - run:
          name: Install dependencies
          command: |
            # Check if node_modules exists and is valid
            if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
              npm ci --prefer-offline
            else
              echo "Dependencies already installed from cache"
            fi
      # Save cache for future builds
      - save_cache:
          key: npm-deps-v1-{{ checksum "package-lock.json" }}
          paths:
            - node_modules

  # Command to run tests with coverage
  run-tests-with-coverage:
    description: "Execute test suite with coverage reporting"
    parameters:
      test_type:
        type: string
        default: "unit"
    steps:
      - run:
          name: Run << parameters.test_type >> tests
          command: |
            # Run tests and generate coverage report
            npm run test:<< parameters.test_type >> -- --coverage --coverageReporters=lcov
          environment:
            # Increase memory for large test suites
            NODE_OPTIONS: --max-old-space-size=4096
      # Store test results for CircleCI insights
      - store_test_results:
          path: test-results
      # Store coverage artifacts for review
      - store_artifacts:
          path: coverage
          destination: coverage-<< parameters.test_type >>
```

## Production Workflow Design

A production workflow should include multiple stages with appropriate gates and checks.

```mermaid
flowchart LR
    subgraph Build["Build Stage"]
        B1[Checkout Code]
        B2[Install Dependencies]
        B3[Build Application]
        B1 --> B2 --> B3
    end

    subgraph Test["Test Stage"]
        T1[Unit Tests]
        T2[Integration Tests]
        T3[E2E Tests]
    end

    subgraph Security["Security Stage"]
        S1[Dependency Audit]
        S2[SAST Scan]
        S3[Container Scan]
    end

    subgraph Deploy["Deploy Stage"]
        D1[Deploy Staging]
        D2[Smoke Tests]
        D3[Manual Approval]
        D4[Deploy Production]
        D1 --> D2 --> D3 --> D4
    end

    Build --> Test
    Build --> Security
    Test --> Deploy
    Security --> Deploy
```

## Complete Job Definitions

Here are the job definitions that implement the workflow above.

```yaml
# Jobs define the actual work to be performed
jobs:
  # Build job compiles the application and creates artifacts
  build:
    executor: node-executor
    # Resource class determines CPU and memory allocation
    resource_class: large
    steps:
      # Checkout source code from repository
      - checkout
      # Use our reusable cache command
      - setup-npm-cache
      - run:
          name: Build application
          command: |
            # Build for production with optimizations
            NODE_ENV=production npm run build

            # Verify build output exists
            if [ ! -d "dist" ]; then
              echo "Build failed: dist directory not found"
              exit 1
            fi

            # Display build size for monitoring
            echo "Build size:"
            du -sh dist/
      # Persist build artifacts for downstream jobs
      - persist_to_workspace:
          root: .
          paths:
            - dist
            - node_modules
            - package.json

  # Unit test job runs fast, isolated tests
  unit-tests:
    executor: node-executor
    # Parallelism splits tests across multiple containers
    parallelism: 4
    steps:
      - checkout
      - setup-npm-cache
      - run:
          name: Split and run unit tests
          command: |
            # Use CircleCI's test splitting for parallel execution
            # This distributes tests evenly across containers
            TESTFILES=$(circleci tests glob "src/**/*.test.ts" | circleci tests split --split-by=timings)

            # Run only the tests assigned to this container
            npm run test:unit -- --testPathPattern="$TESTFILES"
      - store_test_results:
          path: test-results/unit

  # Integration tests require database and cache services
  integration-tests:
    executor: integration-executor
    steps:
      - checkout
      - setup-npm-cache
      - run:
          name: Wait for services
          command: |
            # Wait for PostgreSQL to be ready
            for i in {1..30}; do
              if pg_isready -h localhost -p 5432 -U testuser; then
                echo "PostgreSQL is ready"
                break
              fi
              echo "Waiting for PostgreSQL... ($i/30)"
              sleep 2
            done

            # Wait for Redis to be ready
            for i in {1..30}; do
              if redis-cli -h localhost ping | grep -q PONG; then
                echo "Redis is ready"
                break
              fi
              echo "Waiting for Redis... ($i/30)"
              sleep 2
            done
      - run:
          name: Run database migrations
          command: npm run db:migrate
          environment:
            DATABASE_URL: postgresql://testuser:testpass@localhost:5432/testdb
      - run-tests-with-coverage:
          test_type: integration

  # Security scanning job checks for vulnerabilities
  security-scan:
    executor: node-executor
    steps:
      - checkout
      - setup-npm-cache
      - run:
          name: Audit npm dependencies
          command: |
            # Run npm audit and capture results
            # Allow high severity findings to fail the build
            npm audit --audit-level=high || true

            # Generate detailed report
            npm audit --json > audit-report.json || true
      - run:
          name: Check for known vulnerabilities
          command: |
            # Install and run Snyk for deeper analysis
            npm install -g snyk
            snyk test --severity-threshold=high || true
      - store_artifacts:
          path: audit-report.json

  # Docker build job creates container images
  build-docker:
    executor: docker/docker
    steps:
      - checkout
      # Attach workspace to get build artifacts
      - attach_workspace:
          at: .
      - setup_remote_docker:
          # Use latest Docker version for better performance
          version: docker24
          # Enable layer caching for faster builds
          docker_layer_caching: true
      - run:
          name: Build Docker image
          command: |
            # Define image tag using commit SHA for traceability
            IMAGE_TAG="${CIRCLE_SHA1:0:7}"
            REGISTRY="your-registry.com"
            IMAGE_NAME="$REGISTRY/your-app"

            # Build image with build arguments
            docker build \
              --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
              --build-arg VCS_REF=${CIRCLE_SHA1} \
              --build-arg VERSION=${CIRCLE_TAG:-$IMAGE_TAG} \
              -t "$IMAGE_NAME:$IMAGE_TAG" \
              -t "$IMAGE_NAME:latest" \
              .

            # Save image for later use
            docker save "$IMAGE_NAME:$IMAGE_TAG" | gzip > docker-image.tar.gz
      - persist_to_workspace:
          root: .
          paths:
            - docker-image.tar.gz

  # Deploy to staging environment
  deploy-staging:
    executor: node-executor
    steps:
      - checkout
      - attach_workspace:
          at: .
      - run:
          name: Deploy to staging
          command: |
            # Install deployment tools
            curl -LO "https://dl.k8s.io/release/stable.txt"
            curl -LO "https://dl.k8s.io/release/$(cat stable.txt)/bin/linux/amd64/kubectl"
            chmod +x kubectl
            sudo mv kubectl /usr/local/bin/

            # Configure kubectl for staging cluster
            echo "$STAGING_KUBECONFIG" | base64 -d > kubeconfig.yaml
            export KUBECONFIG=kubeconfig.yaml

            # Deploy using kubectl
            kubectl set image deployment/your-app \
              app=your-registry.com/your-app:${CIRCLE_SHA1:0:7} \
              -n staging

            # Wait for rollout to complete
            kubectl rollout status deployment/your-app -n staging --timeout=300s
      - slack/notify:
          event: pass
          template: basic_success_1

  # Smoke tests verify basic functionality after deploy
  smoke-tests:
    executor: node-executor
    steps:
      - checkout
      - run:
          name: Run smoke tests
          command: |
            # Wait for deployment to be accessible
            sleep 30

            # Run smoke test suite against staging
            STAGING_URL="https://staging.your-app.com"

            # Health check
            curl -f "$STAGING_URL/health" || exit 1

            # API endpoint check
            curl -f "$STAGING_URL/api/status" || exit 1

            echo "Smoke tests passed successfully"

  # Production deployment with extra safeguards
  deploy-production:
    executor: node-executor
    steps:
      - checkout
      - attach_workspace:
          at: .
      - run:
          name: Deploy to production
          command: |
            # Configure kubectl for production cluster
            echo "$PROD_KUBECONFIG" | base64 -d > kubeconfig.yaml
            export KUBECONFIG=kubeconfig.yaml

            # Perform rolling deployment
            kubectl set image deployment/your-app \
              app=your-registry.com/your-app:${CIRCLE_SHA1:0:7} \
              -n production

            # Monitor rollout with timeout
            kubectl rollout status deployment/your-app -n production --timeout=600s

            # Verify deployment health
            kubectl get pods -n production -l app=your-app
      - slack/notify:
          event: always
          template: basic_success_1
```

## Workflow Configuration

The workflow ties all jobs together with dependencies and conditions.

```yaml
# Workflows orchestrate job execution
workflows:
  # Main build and deploy workflow
  build-test-deploy:
    jobs:
      # Build runs on every push
      - build:
          filters:
            branches:
              only: /.*/

      # Tests run in parallel after build
      - unit-tests:
          requires:
            - build
      - integration-tests:
          requires:
            - build
      - security-scan:
          requires:
            - build

      # Docker build only on main branch
      - build-docker:
          requires:
            - unit-tests
            - integration-tests
            - security-scan
          filters:
            branches:
              only: main

      # Staging deployment
      - deploy-staging:
          requires:
            - build-docker
          filters:
            branches:
              only: main

      # Smoke tests after staging deploy
      - smoke-tests:
          requires:
            - deploy-staging

      # Manual approval gate for production
      - hold-for-approval:
          type: approval
          requires:
            - smoke-tests
          filters:
            branches:
              only: main

      # Production deployment after approval
      - deploy-production:
          requires:
            - hold-for-approval
          filters:
            branches:
              only: main

  # Nightly scheduled workflow for extended tests
  nightly:
    triggers:
      - schedule:
          # Run at 2 AM UTC every day
          cron: "0 2 * * *"
          filters:
            branches:
              only: main
    jobs:
      - build
      - unit-tests:
          requires:
            - build
      - integration-tests:
          requires:
            - build
      - security-scan:
          requires:
            - build
```

## Environment Variables and Secrets

CircleCI provides secure ways to manage sensitive configuration.

```mermaid
graph TB
    subgraph "Secret Management"
        A[CircleCI Project Settings]
        B[Context: production-secrets]
        C[Context: staging-secrets]
    end

    subgraph "Environment Variables"
        D[DOCKER_USERNAME]
        E[DOCKER_PASSWORD]
        F[KUBECONFIG]
        G[SLACK_WEBHOOK]
    end

    A --> D
    A --> E
    B --> F
    B --> G
    C --> F

    subgraph "Usage in Jobs"
        H[build-docker job]
        I[deploy-production job]
        J[deploy-staging job]
    end

    D --> H
    E --> H
    B --> I
    C --> J
```

### Setting Up Contexts

Contexts allow you to share environment variables across projects securely.

```yaml
# Using contexts in workflows
workflows:
  build-test-deploy:
    jobs:
      - deploy-production:
          # Contexts provide environment variables to the job
          context:
            - production-secrets
            - docker-credentials
          requires:
            - hold-for-approval
```

Navigate to **Organization Settings > Contexts** in CircleCI to create contexts and add environment variables.

## Caching Strategies

Effective caching dramatically reduces build times.

```yaml
# Advanced caching configuration
commands:
  restore-all-caches:
    description: "Restore all cached dependencies"
    steps:
      # Restore npm cache
      - restore_cache:
          keys:
            - npm-v2-{{ checksum "package-lock.json" }}
            - npm-v2-

      # Restore Cypress binary cache
      - restore_cache:
          keys:
            - cypress-v1-{{ checksum "package-lock.json" }}
            - cypress-v1-

      # Restore Next.js build cache
      - restore_cache:
          keys:
            - next-v1-{{ .Branch }}-{{ checksum "package-lock.json" }}
            - next-v1-{{ .Branch }}-
            - next-v1-

  save-all-caches:
    description: "Save all caches for future builds"
    steps:
      - save_cache:
          key: npm-v2-{{ checksum "package-lock.json" }}
          paths:
            - node_modules
      - save_cache:
          key: cypress-v1-{{ checksum "package-lock.json" }}
          paths:
            - ~/.cache/Cypress
      - save_cache:
          key: next-v1-{{ .Branch }}-{{ checksum "package-lock.json" }}
          paths:
            - .next/cache
```

## Resource Optimization

Choosing the right resource class impacts both cost and performance.

```yaml
jobs:
  # Small resource class for lightweight tasks
  lint:
    executor: node-executor
    resource_class: small
    steps:
      - checkout
      - setup-npm-cache
      - run: npm run lint

  # Medium resource class for standard builds
  build:
    executor: node-executor
    resource_class: medium
    steps:
      - checkout
      - setup-npm-cache
      - run: npm run build

  # Large resource class for memory-intensive operations
  e2e-tests:
    executor: node-executor
    resource_class: large
    steps:
      - checkout
      - setup-npm-cache
      - run: npm run test:e2e

  # GPU resource class for ML workloads
  train-model:
    machine:
      image: ubuntu-2204:current
    resource_class: gpu.nvidia.small
    steps:
      - checkout
      - run: python train.py
```

## Monitoring and Insights

CircleCI provides built-in monitoring capabilities.

```yaml
jobs:
  monitored-build:
    executor: node-executor
    steps:
      - checkout
      - run:
          name: Build with timing
          command: |
            # Start timer
            START_TIME=$(date +%s)

            # Run build
            npm run build

            # Calculate duration
            END_TIME=$(date +%s)
            DURATION=$((END_TIME - START_TIME))

            # Report to monitoring system
            curl -X POST "$METRICS_ENDPOINT" \
              -H "Content-Type: application/json" \
              -d "{\"metric\": \"build_duration\", \"value\": $DURATION, \"commit\": \"$CIRCLE_SHA1\"}"

      # Store timing data for CircleCI insights
      - store_test_results:
          path: test-results
```

## Troubleshooting Common Issues

Here are solutions to frequent CircleCI problems.

### SSH Debugging

```yaml
jobs:
  debug-build:
    executor: node-executor
    steps:
      - checkout
      - run:
          name: Debug step
          command: |
            # Print environment for debugging
            env | sort

            # Check disk space
            df -h

            # Check memory
            free -m
      # Enable SSH access when this step fails
      - run:
          name: Failing step
          command: npm run problematic-script
      # Add this to enable SSH on failure
      - run:
          name: Enable SSH on failure
          command: echo "SSH debugging enabled"
          when: on_fail
```

### Handling Flaky Tests

```yaml
jobs:
  flaky-test-handler:
    executor: node-executor
    steps:
      - checkout
      - run:
          name: Run tests with retry
          command: |
            # Retry failed tests up to 3 times
            MAX_RETRIES=3
            RETRY_COUNT=0

            until npm run test || [ $RETRY_COUNT -eq $MAX_RETRIES ]; do
              RETRY_COUNT=$((RETRY_COUNT + 1))
              echo "Test failed, retry $RETRY_COUNT of $MAX_RETRIES"
              sleep 5
            done

            if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
              echo "Tests failed after $MAX_RETRIES retries"
              exit 1
            fi
```

## Best Practices Summary

1. **Use specific image versions** to ensure reproducible builds
2. **Implement caching strategically** to reduce build times
3. **Parallelize tests** across multiple containers for faster feedback
4. **Use contexts** for secure secret management
5. **Add manual approval gates** before production deployments
6. **Monitor build metrics** to identify performance regressions
7. **Store artifacts** for debugging and compliance
8. **Use orbs** to reduce configuration complexity
9. **Implement proper error handling** in deployment scripts
10. **Set up notifications** to keep the team informed

## Conclusion

Setting up CircleCI for production requires careful planning around security, performance, and reliability. The configuration examples in this guide provide a solid foundation that you can customize for your specific needs. Start with the basic structure and gradually add more sophisticated features like parallel testing, advanced caching, and automated deployments as your team's requirements grow.

Remember to regularly review and optimize your CircleCI configuration. Monitor build times, test for flakiness, and keep dependencies updated to maintain a healthy CI/CD pipeline that supports your production workloads effectively.
