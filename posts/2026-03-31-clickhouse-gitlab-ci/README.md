# How to Set Up ClickHouse in GitLab CI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, GitLab CI, CI/CD, Testing, Automation

Description: Learn how to run ClickHouse as a service in GitLab CI pipelines for integration testing, schema validation, and data quality checks.

---

## ClickHouse as a GitLab CI Service

GitLab CI supports Docker service containers linked to pipeline jobs. ClickHouse starts alongside the test runner and is accessible by its service alias hostname.

```yaml
# .gitlab-ci.yml

default:
  image: python:3.12-slim

variables:
  CLICKHOUSE_HOST: clickhouse
  CLICKHOUSE_PORT: "8123"

stages:
  - test

integration-tests:
  stage: test
  services:
    - name: clickhouse/clickhouse-server:24.3
      alias: clickhouse
  before_script:
    - apt-get update -q && apt-get install -y --no-install-recommends wget
    - pip install -q -r requirements.txt
    - |
      echo "Waiting for ClickHouse..."
      for i in $(seq 1 30); do
        wget -qO- http://$CLICKHOUSE_HOST:$CLICKHOUSE_PORT/ping && break
        sleep 2
      done
      echo "ClickHouse is ready"
  script:
    - python scripts/migrate.py
    - pytest tests/integration/ -v --junitxml=report.xml
  artifacts:
    reports:
      junit: report.xml
    expire_in: 1 week
  only:
    - main
    - merge_requests
```

## Multi-Version Testing with Parallel Jobs

```yaml
.integration-base:
  stage: test
  before_script:
    - apt-get update -q && apt-get install -y --no-install-recommends wget
    - pip install -q -r requirements.txt
    - until wget -qO- http://clickhouse:8123/ping; do sleep 2; done
  script:
    - pytest tests/integration/ -v

test-clickhouse-24-3:
  extends: .integration-base
  services:
    - name: clickhouse/clickhouse-server:24.3
      alias: clickhouse

test-clickhouse-24-8:
  extends: .integration-base
  services:
    - name: clickhouse/clickhouse-server:24.8
      alias: clickhouse
```

## Running Schema Migration Validation

```yaml
schema-validation:
  stage: test
  image: clickhouse/clickhouse-server:24.3
  services:
    - name: clickhouse/clickhouse-server:24.3
      alias: clickhouse
  before_script:
    - until clickhouse-client --host clickhouse --query "SELECT 1" >/dev/null 2>&1; do sleep 2; done
  script:
    - |
      for f in $(ls migrations/*.sql | sort); do
        echo "Applying $f"
        clickhouse-client --host clickhouse --query "$(cat $f)"
      done
      echo "All migrations applied successfully"
```

## Caching Python Dependencies

```yaml
integration-tests:
  cache:
    key: pip-$CI_COMMIT_REF_SLUG
    paths:
      - .cache/pip/
  before_script:
    - pip install --cache-dir .cache/pip -r requirements.txt
```

## Environment Variables for Multiple Environments

```yaml
variables:
  CLICKHOUSE_HOST: clickhouse
  CLICKHOUSE_PORT: "8123"
  CLICKHOUSE_DB: "ci_test_db"

# Override for staging
.staging-vars:
  variables:
    CLICKHOUSE_HOST: ch.staging.internal
    CLICKHOUSE_DB: analytics
```

## Summary

GitLab CI runs ClickHouse as a service container accessible via the `alias` hostname. Use `before_script` to wait for ClickHouse readiness before running migrations and tests. Extend base job templates with `extends` to test against multiple ClickHouse versions in parallel. Export JUnit XML test reports as CI artifacts for integration with GitLab's test summary view.
