# How to Use Atlas CLI with CI/CD Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, CLI, CI/CD, Automation

Description: Learn how to integrate the Atlas CLI into GitHub Actions, GitLab CI, and other pipelines to automate cluster and user management.

---

## Atlas CLI in CI/CD

The Atlas CLI is designed for non-interactive use. All authentication can be provided through environment variables, and output can be formatted as JSON for programmatic parsing. This makes it a natural fit for GitHub Actions, GitLab CI, CircleCI, and other pipeline tools.

## Authentication via Environment Variables

Never hardcode credentials in pipeline files. Use secrets:

```bash
export MONGODB_ATLAS_PUBLIC_API_KEY=${{ secrets.ATLAS_PUBLIC_KEY }}
export MONGODB_ATLAS_PRIVATE_API_KEY=${{ secrets.ATLAS_PRIVATE_KEY }}
export MONGODB_ATLAS_ORG_ID=${{ secrets.ATLAS_ORG_ID }}
```

## GitHub Actions - Install and Configure

```yaml
name: Deploy to Atlas

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Atlas CLI
        run: |
          wget https://fastdl.mongodb.org/mongocli/mongodb-atlas-cli_1.14.0_linux_x86_64.deb
          sudo dpkg -i mongodb-atlas-cli_1.14.0_linux_x86_64.deb

      - name: Verify credentials
        env:
          MONGODB_ATLAS_PUBLIC_API_KEY: ${{ secrets.ATLAS_PUBLIC_KEY }}
          MONGODB_ATLAS_PRIVATE_API_KEY: ${{ secrets.ATLAS_PRIVATE_KEY }}
          MONGODB_ATLAS_ORG_ID: ${{ secrets.ATLAS_ORG_ID }}
        run: atlas projects list
```

## Creating a Test Cluster in CI

Spin up a temporary cluster for integration tests:

```yaml
      - name: Create test cluster
        env:
          MONGODB_ATLAS_PUBLIC_API_KEY: ${{ secrets.ATLAS_PUBLIC_KEY }}
          MONGODB_ATLAS_PRIVATE_API_KEY: ${{ secrets.ATLAS_PRIVATE_KEY }}
          MONGODB_ATLAS_PROJECT_ID: ${{ secrets.ATLAS_PROJECT_ID }}
        run: |
          atlas clusters create ci-${{ github.run_id }} \
            --tier M10 \
            --provider AWS \
            --region US_EAST_1

          atlas clusters watch ci-${{ github.run_id }}

          CONNECTION_STRING=$(atlas clusters connectionStrings describe \
            ci-${{ github.run_id }} --output json | jq -r '.standardSrv')

          echo "MONGODB_URI=${CONNECTION_STRING}" >> $GITHUB_ENV
```

## Granting CI Runner Network Access

```yaml
      - name: Add CI IP to access list
        run: |
          MY_IP=$(curl -s https://api.ipify.org)
          atlas accessLists create "$MY_IP" \
            --comment "GitHub Actions ${{ github.run_id }}"
```

## Applying Search Index Changes

Deploy search index changes as part of a deployment pipeline:

```bash
#!/bin/bash
for index_file in search-indexes/*.json; do
  INDEX_NAME=$(jq -r '.name' "$index_file")
  DB=$(jq -r '.database' "$index_file")
  COLLECTION=$(jq -r '.collectionName' "$index_file")

  EXISTING=$(atlas clusters search indexes list \
    --clusterName "$CLUSTER_NAME" \
    --db "$DB" \
    --collection "$COLLECTION" \
    --output json | jq -r ".[] | select(.name==\"$INDEX_NAME\") | .indexID")

  if [ -n "$EXISTING" ]; then
    atlas clusters search indexes update "$EXISTING" \
      --clusterName "$CLUSTER_NAME" \
      --file "$index_file"
  else
    atlas clusters search indexes create \
      --clusterName "$CLUSTER_NAME" \
      --file "$index_file"
  fi
done
```

## Teardown After Tests

Clean up the temporary cluster and access list entry:

```yaml
      - name: Teardown CI resources
        if: always()
        run: |
          atlas clusters delete ci-${{ github.run_id }} --force
          MY_IP=$(curl -s https://api.ipify.org)
          atlas accessLists delete "$MY_IP" --force
```

## GitLab CI Example

```yaml
stages:
  - test

integration_test:
  stage: test
  image: ubuntu:22.04
  before_script:
    - apt-get update -qq
    - wget -q https://fastdl.mongodb.org/mongocli/mongodb-atlas-cli_1.14.0_linux_x86_64.deb
    - dpkg -i mongodb-atlas-cli_1.14.0_linux_x86_64.deb
  script:
    - atlas clusters list
  variables:
    MONGODB_ATLAS_PUBLIC_API_KEY: $ATLAS_PUBLIC_KEY
    MONGODB_ATLAS_PRIVATE_API_KEY: $ATLAS_PRIVATE_KEY
    MONGODB_ATLAS_PROJECT_ID: $ATLAS_PROJECT_ID
```

## Summary

Using the Atlas CLI in CI/CD pipelines requires only environment variables for authentication and standard shell scripting for logic. Create ephemeral test clusters, add temporary IP access, run your tests, and tear everything down - all within a single pipeline job. Store API keys as encrypted secrets and never expose them in pipeline logs.
