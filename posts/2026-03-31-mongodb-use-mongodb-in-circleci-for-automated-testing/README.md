# How to Use MongoDB in CircleCI for Automated Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, CircleCI, CI/CD, Testing, Automation

Description: Configure CircleCI pipelines with MongoDB service containers and orbs to run automated integration tests against a real database.

---

## Introduction

CircleCI supports Docker-based service containers that make integrating MongoDB into your test pipeline simple. This guide covers Docker service configuration, authenticated setups, and best practices for test isolation.

## Using Docker Executor with MongoDB Service

```yaml
# .circleci/config.yml
version: 2.1

jobs:
  integration-test:
    docker:
      - image: cimg/node:20.0
      - image: mongo:7.0
        environment:
          MONGO_INITDB_DATABASE: testdb

    environment:
      MONGODB_URI: mongodb://localhost:27017/testdb

    steps:
      - checkout
      - restore_cache:
          keys:
            - node-deps-{{ checksum "package-lock.json" }}

      - run:
          name: Install dependencies
          command: npm ci

      - save_cache:
          key: node-deps-{{ checksum "package-lock.json" }}
          paths:
            - node_modules

      - run:
          name: Wait for MongoDB
          command: |
            for i in $(seq 1 30); do
              nc -z localhost 27017 && echo "MongoDB ready" && break
              echo "Waiting..."
              sleep 2
            done

      - run:
          name: Run integration tests
          command: npm run test:integration

      - store_test_results:
          path: test-results

      - store_artifacts:
          path: test-results
```

## Authenticated MongoDB Setup

```yaml
jobs:
  integration-test:
    docker:
      - image: cimg/node:20.0
      - image: mongo:7.0
        environment:
          MONGO_INITDB_ROOT_USERNAME: admin
          MONGO_INITDB_ROOT_PASSWORD: $MONGO_TEST_PASSWORD

    environment:
      MONGODB_URI: mongodb://admin:$MONGO_TEST_PASSWORD@localhost:27017/testdb?authSource=admin
```

Store `MONGO_TEST_PASSWORD` as a CircleCI environment variable under Project Settings - Environment Variables.

## Python Tests with pytest

```yaml
pytest-integration:
  docker:
    - image: cimg/python:3.12
    - image: mongo:7.0

  environment:
    MONGODB_URI: mongodb://localhost:27017/testdb

  steps:
    - checkout
    - run:
        name: Wait for MongoDB
        command: |
          for i in $(seq 1 30); do
            nc -z localhost 27017 && echo "MongoDB ready" && break
            echo "Waiting..."
            sleep 2
          done

    - run:
        name: Install dependencies
        command: pip install -r requirements.txt

    - run:
        name: Run pytest
        command: |
          pytest tests/integration/ \
            --junitxml=test-results/junit.xml \
            -v

    - store_test_results:
        path: test-results
```

```python
# tests/integration/conftest.py
import pytest
from pymongo import MongoClient
import os

@pytest.fixture(autouse=True)
def clean_db():
    client = MongoClient(os.environ["MONGODB_URI"])
    db = client.testdb
    yield db
    # Clean up after each test
    for collection in db.list_collection_names():
        db[collection].delete_many({})
    client.close()
```

## Using Workflows for Multi-Stage Pipelines

```yaml
workflows:
  test-and-deploy:
    jobs:
      - unit-test
      - integration-test:
          requires:
            - unit-test
      - deploy:
          requires:
            - integration-test
          filters:
            branches:
              only: main
```

## Parallelism for Faster Tests

```yaml
jobs:
  integration-test:
    parallelism: 4
    docker:
      - image: cimg/node:20.0
      - image: mongo:7.0
    steps:
      - run:
          name: Run tests in parallel
          command: |
            TESTFILES=$(circleci tests glob "tests/integration/**/*.test.js" | \
              circleci tests split --split-by=timings)
            npm run test:integration -- $TESTFILES
```

## Summary

CircleCI's Docker executor makes MongoDB integration testing straightforward - list MongoDB as a secondary Docker image, set `MONGODB_URI` as an environment variable, and add a readiness wait step before running tests. Use `store_test_results` for test analytics, cache `node_modules` or Python packages to speed up builds, and leverage parallelism to distribute large test suites across multiple containers.
