# How to Use Ceph RGW as Artifact Storage for GitHub Actions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, GitHub Action, CI/CD, Artifact, S3, Storage

Description: Store GitHub Actions build artifacts and caches in Ceph RGW using S3-compatible actions, enabling self-hosted runners to use on-premises object storage.

---

## Overview

GitHub Actions stores artifacts and caches by default in GitHub's cloud infrastructure. When running self-hosted runners, you can redirect artifact and cache storage to Ceph RGW using community S3 actions, keeping your build data on-premises and reducing GitHub storage costs.

## Prerequisites

- Self-hosted GitHub Actions runners on Kubernetes
- Ceph RGW endpoint accessible from runner pods
- Ceph user with a bucket

## Set Up Ceph Bucket

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin user create \
  --uid=github-actions \
  --display-name="GitHub Actions" \
  --access-key=ghaakey \
  --secret-key=ghaskey

aws s3 mb s3://github-actions-artifacts \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph:80
aws s3 mb s3://github-actions-cache \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph:80
```

## Configure GitHub Secrets

In your GitHub repository settings, add secrets:

```text
CEPH_ENDPOINT=http://rook-ceph-rgw-my-store.rook-ceph:80
CEPH_ACCESS_KEY=ghaakey
CEPH_SECRET_KEY=ghaskey
CEPH_BUCKET=github-actions-artifacts
```

## Upload Artifacts to Ceph in a Workflow

```yaml
name: Build and Store Artifacts

on: [push]

jobs:
  build:
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v4

      - name: Build
        run: mvn clean package -DskipTests

      - name: Upload artifact to Ceph
        uses: shallwefootball/s3-upload-action@v1.3.0
        with:
          aws_key_id: ${{ secrets.CEPH_ACCESS_KEY }}
          aws_secret_access_key: ${{ secrets.CEPH_SECRET_KEY }}
          aws_bucket: ${{ secrets.CEPH_BUCKET }}
          source_dir: target/
          destination_dir: ${{ github.run_id }}/target/
          endpoint: ${{ secrets.CEPH_ENDPOINT }}
```

## Cache Dependencies in Ceph

Use the AWS CLI to save and restore cache:

```yaml
      - name: Restore cache from Ceph
        run: |
          aws s3 sync s3://github-actions-cache/${{ hashFiles('pom.xml') }}/ ~/.m2/repository/ \
            --endpoint-url ${{ secrets.CEPH_ENDPOINT }} || true
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.CEPH_ACCESS_KEY }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.CEPH_SECRET_KEY }}
          AWS_DEFAULT_REGION: us-east-1

      - name: Build
        run: mvn package -DskipTests

      - name: Save cache to Ceph
        run: |
          aws s3 sync ~/.m2/repository/ s3://github-actions-cache/${{ hashFiles('pom.xml') }}/ \
            --endpoint-url ${{ secrets.CEPH_ENDPOINT }}
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.CEPH_ACCESS_KEY }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.CEPH_SECRET_KEY }}
          AWS_DEFAULT_REGION: us-east-1
```

## Download Artifacts from a Previous Run

```yaml
      - name: Download artifact from Ceph
        run: |
          aws s3 cp s3://${{ secrets.CEPH_BUCKET }}/${{ github.run_id }}/target/app.jar \
            /tmp/app.jar \
            --endpoint-url ${{ secrets.CEPH_ENDPOINT }}
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.CEPH_ACCESS_KEY }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.CEPH_SECRET_KEY }}
          AWS_DEFAULT_REGION: us-east-1
```

## Summary

Self-hosted GitHub Actions runners can use Ceph RGW as a drop-in artifact and cache store using standard AWS CLI commands and community S3 upload actions. This approach keeps build data on-premises, reduces GitHub storage billing, and leverages Ceph's redundancy for artifact durability.
