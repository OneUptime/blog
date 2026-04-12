# How to Use MongoDB in GitLab CI/CD Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, GitLab, CI/CD, Testing, Service

Description: Configure GitLab CI/CD pipelines with MongoDB service containers to run integration tests against a real database in your pipeline.

---

## Introduction

GitLab CI/CD provides native service container support, allowing you to run a real MongoDB instance alongside your test jobs. This is ideal for integration tests that need actual database behavior. This guide covers configuring MongoDB services, handling authentication, and structuring your `.gitlab-ci.yml`.

## Basic Pipeline Configuration

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

variables:
  MONGODB_URI: "mongodb://localhost:27017/testdb"

integration_test:
  stage: test
  image: node:20-alpine
  services:
    - name: mongo:7.0
      alias: mongo
  variables:
    MONGODB_URI: "mongodb://mongo:27017/testdb"
  before_script:
    - npm ci
  script:
    - npm run test:integration
  coverage: '/Lines\s*:\s*(\d+\.?\d*)%/'
```

## Using Authentication

```yaml
integration_test:
  stage: test
  image: node:20-alpine
  services:
    - name: mongo:7.0
      alias: mongo
  variables:
    MONGO_INITDB_ROOT_USERNAME: admin
    MONGO_INITDB_ROOT_PASSWORD: $CI_MONGO_PASSWORD
    MONGODB_URI: "mongodb://admin:${CI_MONGO_PASSWORD}@mongo:27017/testdb?authSource=admin"
  script:
    - npm ci
    - npm run test:integration
```

Store `CI_MONGO_PASSWORD` as a masked CI/CD variable in GitLab Settings - CI/CD - Variables.

## Seeding Data Before Tests

```yaml
integration_test:
  stage: test
  image: node:20
  services:
    - name: mongo:7.0
      alias: mongo
  variables:
    MONGODB_URI: "mongodb://mongo:27017/testdb"
  before_script:
    - npm ci
    - |
      # Install mongosh (requires a glibc-based image, not Alpine)
      apt-get update && apt-get install -y gnupg
      curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
        gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
      echo "deb [signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | \
        tee /etc/apt/sources.list.d/mongodb-org-7.0.list
      apt-get update && apt-get install -y mongodb-mongosh
    - |
      # Wait for MongoDB to be ready
      until mongosh --host mongo --eval "print('MongoDB ready')"; do
        echo "Waiting for MongoDB..."
        sleep 2
      done
    - mongosh mongodb://mongo:27017/testdb < ./test/fixtures/seed.js
  script:
    - npm run test:integration
```

## Python Integration Tests

```yaml
pytest_integration:
  stage: test
  image: python:3.12-slim
  services:
    - name: mongo:7.0
      alias: mongo
  variables:
    MONGODB_URI: "mongodb://mongo:27017/testdb"
  before_script:
    - pip install -r requirements.txt
  script:
    - pytest tests/integration/ -v --tb=short --junitxml=report.xml
  artifacts:
    reports:
      junit: report.xml
```

```python
# tests/integration/test_user_repository.py
import pytest
from pymongo import MongoClient
import os

@pytest.fixture(scope="session")
def db():
    client = MongoClient(os.environ["MONGODB_URI"])
    database = client.testdb
    yield database
    client.close()

def test_insert_and_find_user(db):
    db.users.delete_many({})
    db.users.insert_one({"name": "Alice", "email": "alice@example.com"})
    user = db.users.find_one({"email": "alice@example.com"})
    assert user["name"] == "Alice"
```

## Parallel Test Jobs

```yaml
integration_test:
  stage: test
  parallel: 3
  script:
    - npm run test:integration -- --shard=$CI_NODE_INDEX/$CI_NODE_TOTAL
```

## Summary

GitLab CI/CD makes MongoDB integration testing straightforward with service containers. Use the `services` keyword to spin up MongoDB alongside your test image, configure environment variables for the connection URI, and add health-check loops in `before_script` to avoid race conditions. Store sensitive credentials as masked CI/CD variables and use `artifacts` to publish test reports.
