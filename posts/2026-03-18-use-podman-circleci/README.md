# How to Use Podman in CircleCI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, CircleCI, CI/CD, Automation

Description: Learn how to set up and use Podman in CircleCI pipelines for building, testing, and pushing container images.

---

> CircleCI's machine executor combined with Podman provides a powerful, daemonless container workflow that keeps your pipelines fast and secure.

CircleCI is a popular CI/CD platform known for its speed and flexibility. While CircleCI natively uses Docker, you can use Podman as an alternative container engine by leveraging the machine executor, which gives you a full Linux VM. This guide walks through setting up Podman in CircleCI for practical container workflows.

---

## Setting Up Podman in CircleCI

The machine executor provides a full Ubuntu VM where you can install and use Podman.

```yaml
# .circleci/config.yml

# CircleCI configuration using Podman with the machine executor
version: 2.1

jobs:
  build:
    # Use machine executor for full VM access (required for Podman)
    machine:
      image: ubuntu-2404:current

    steps:
      # Check out source code
      - checkout

      # Install Podman on the CircleCI VM
      - run:
          name: Install Podman
          command: |
            sudo apt-get update
            sudo apt-get install -y podman
            podman --version

      # Build the container image
      - run:
          name: Build Image
          command: |
            podman build \
              -t myapp:${CIRCLE_SHA1} \
              -t myapp:latest \
              .

      # Run the test suite inside the container
      - run:
          name: Run Tests
          command: |
            podman run --rm myapp:${CIRCLE_SHA1} npm test

workflows:
  build-and-test:
    jobs:
      - build
```

## Pushing Images to a Container Registry

After building and testing, push your image to a registry from CircleCI.

```yaml
# Job that builds and pushes images to a container registry
jobs:
  build-and-push:
    machine:
      image: ubuntu-2404:current

    steps:
      - checkout

      - run:
          name: Install Podman
          command: |
            sudo apt-get update
            sudo apt-get install -y podman

      # Build with registry-qualified image name
      - run:
          name: Build Image
          command: |
            podman build \
              -t docker.io/${DOCKERHUB_USERNAME}/myapp:${CIRCLE_SHA1} \
              -t docker.io/${DOCKERHUB_USERNAME}/myapp:latest \
              .

      # Log in and push to Docker Hub using Podman
      - run:
          name: Push to Registry
          command: |
            # Login to Docker Hub (credentials stored in CircleCI project settings)
            echo "${DOCKERHUB_PASSWORD}" | \
              podman login docker.io \
                -u "${DOCKERHUB_USERNAME}" \
                --password-stdin

            # Push the images
            podman push docker.io/${DOCKERHUB_USERNAME}/myapp:${CIRCLE_SHA1}
            podman push docker.io/${DOCKERHUB_USERNAME}/myapp:latest
```

## Integration Testing with Podman Pods

Use Podman pods in CircleCI for multi-container integration testing.

```yaml
# Job that runs integration tests using a Podman pod
jobs:
  integration-test:
    machine:
      image: ubuntu-2404:current

    steps:
      - checkout

      - run:
          name: Install Podman
          command: |
            sudo apt-get update
            sudo apt-get install -y podman

      - run:
          name: Build Application Image
          command: podman build -t myapp:test .

      # Set up and run the integration test environment
      - run:
          name: Start Test Environment
          command: |
            # Create a pod for the test environment
            podman pod create --name test-env -p 8080:8080 -p 6379:6379

            # Start Redis inside the pod
            podman run -d \
              --pod test-env \
              --name redis \
              redis:7-alpine

            # Start the application inside the pod
            podman run -d \
              --pod test-env \
              --name app \
              -e REDIS_URL=redis://localhost:6379 \
              myapp:test

            # Wait for services to be ready
            sleep 5

      # Execute the integration test suite
      - run:
          name: Run Integration Tests
          command: |
            # Health check
            curl --retry 10 --retry-delay 2 \
              http://localhost:8080/health

            # Run integration tests
            podman run --rm \
              --pod test-env \
              -e API_URL=http://localhost:8080 \
              myapp:test npm run test:integration

      # Always clean up regardless of test outcome
      - run:
          name: Cleanup
          when: always
          command: |
            podman pod rm -f test-env || true
```

## Caching Podman Images in CircleCI

Speed up your pipeline by caching Podman images between runs.

```yaml
# Job with image caching for faster builds
jobs:
  cached-build:
    machine:
      image: ubuntu-2404:current

    steps:
      - checkout

      - run:
          name: Install Podman
          command: |
            sudo apt-get update
            sudo apt-get install -y podman

      # Restore cached images from previous runs
      - restore_cache:
          keys:
            - podman-images-{{ arch }}-{{ checksum "Containerfile" }}
            - podman-images-{{ arch }}-

      # Load cached images if they exist
      - run:
          name: Load Cached Images
          command: |
            if [ -f /tmp/podman-cache.tar ]; then
              podman load -i /tmp/podman-cache.tar
              echo "Loaded cached images"
            fi

      # Build the image (layers will be reused from cache)
      - run:
          name: Build Image
          command: podman build -f Containerfile -t myapp:${CIRCLE_SHA1} .

      # Save images to cache for future runs
      - run:
          name: Save Images to Cache
          command: |
            podman save -o /tmp/podman-cache.tar myapp:${CIRCLE_SHA1}

      - save_cache:
          key: podman-images-{{ arch }}-{{ checksum "Containerfile" }}
          paths:
            - /tmp/podman-cache.tar
```

## Complete Workflow with Multiple Jobs

Put it all together with a complete CircleCI workflow.

```yaml
# Complete workflow definition
workflows:
  version: 2
  build-test-deploy:
    jobs:
      - build
      - integration-test:
          requires:
            - build
      - build-and-push:
          requires:
            - integration-test
          filters:
            branches:
              only: main
```

## Summary

Podman works well in CircleCI when you use the machine executor, which provides a full Linux VM where Podman can be installed and run without limitations. You can build images, run tests, push to registries, and perform multi-container integration testing using pods. Caching Podman images between runs helps keep build times low. The daemonless nature of Podman fits well with the ephemeral machine executors in CircleCI, since there is no daemon startup overhead to worry about.
