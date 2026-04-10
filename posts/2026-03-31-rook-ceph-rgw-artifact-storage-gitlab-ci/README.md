# How to Use Ceph RGW as Artifact Storage for GitLab CI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, GitLab, CI/CD, Artifact, S3, Storage

Description: Configure GitLab CI/CD to store job artifacts and caches in Ceph RGW S3-compatible object storage, replacing NFS or local storage with a scalable backend.

---

## Overview

GitLab CI pipelines generate job artifacts (test results, binaries, coverage reports) and caches (node_modules, build caches). By default these are stored on the GitLab server. Ceph RGW's S3 API allows GitLab to offload this storage to a scalable on-premises object store.

## Prepare Ceph RGW

Create user and bucket:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin user create \
  --uid=gitlab-ci \
  --display-name="GitLab CI" \
  --access-key=gitlabakey \
  --secret-key=gitlabskey

aws s3 mb s3://gitlab-artifacts \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph:80
aws s3 mb s3://gitlab-cache \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph:80
```

## Configure GitLab to Use S3

Edit `/etc/gitlab/gitlab.rb` on the GitLab server:

```ruby
# Artifacts
gitlab_rails['artifacts_enabled'] = true
gitlab_rails['artifacts_object_store_enabled'] = true
gitlab_rails['artifacts_object_store_remote_directory'] = "gitlab-artifacts"
gitlab_rails['artifacts_object_store_connection'] = {
  'provider' => 'AWS',
  'region' => 'us-east-1',
  'aws_access_key_id' => 'gitlabakey',
  'aws_secret_access_key' => 'gitlabskey',
  'endpoint' => 'http://rook-ceph-rgw-my-store.rook-ceph:80',
  'path_style' => true
}
```

Apply the configuration:

```bash
gitlab-ctl reconfigure
```

## Configure GitLab Runner Cache with S3

CI/CD cache is configured on the GitLab Runner, not the GitLab server. Edit the runner's `config.toml`:

```toml
[[runners]]
  [runners.cache]
    Type = "s3"
    Path = "runner-cache"
    Shared = true
    [runners.cache.s3]
      ServerAddress = "rook-ceph-rgw-my-store.rook-ceph:80"
      AccessKey = "gitlabakey"
      SecretKey = "gitlabskey"
      BucketName = "gitlab-cache"
      Insecure = true
```

## Use Artifacts in .gitlab-ci.yml

```yaml
stages:
  - build
  - test

variables:
  MAVEN_OPTS: "-Dmaven.repo.local=.m2/repository"

build:
  stage: build
  script:
    - mvn clean package -DskipTests
  artifacts:
    paths:
      - target/*.jar
    expire_in: 7 days
  cache:
    key: "$CI_COMMIT_REF_SLUG"
    paths:
      - .m2/repository

test:
  stage: test
  script:
    - mvn test
  artifacts:
    reports:
      junit: target/surefire-reports/*.xml
  cache:
    key: "$CI_COMMIT_REF_SLUG"
    paths:
      - .m2/repository
```

## Verify Artifacts in Ceph

```bash
aws s3 ls s3://gitlab-artifacts/ \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph:80 \
  --recursive | head -20
```

## For GitLab Helm Chart (Kubernetes)

```yaml
global:
  appConfig:
    artifacts:
      bucket: gitlab-artifacts
      connection:
        provider: AWS
        region: us-east-1
        aws_access_key_id: gitlabakey
        aws_secret_access_key: gitlabskey
        endpoint: "http://rook-ceph-rgw-my-store.rook-ceph:80"
        path_style: true
```

## Summary

GitLab CI artifact and cache storage in Ceph RGW removes disk pressure from GitLab servers and provides a central, scalable storage backend. The S3-compatible configuration is identical to AWS S3, making it easy to switch between cloud and on-premises storage without pipeline changes.
