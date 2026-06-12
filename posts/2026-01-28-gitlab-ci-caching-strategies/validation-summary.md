# Validation Summary: How to Configure GitLab CI Caching Strategies

## Status
validated

## Post Type
Guide

## Technologies Covered
- GitLab CI/CD
- GitLab CI cache
- GitLab CI artifacts
- npm dependency caching
- YAML configuration

## Sources Consulted
- GitLab Docs: Caching in GitLab CI/CD: https://docs.gitlab.com/ci/caching/
- GitLab Docs: CI/CD caching examples: https://docs.gitlab.com/ci/caching/examples/
- GitLab Docs: CI/CD YAML syntax reference: https://docs.gitlab.com/ci/yaml/

## Issues Found
- The basic npm cache example cached `node_modules/` while running `npm ci`. GitLab's official npm caching example recommends moving npm's cache into the project directory and caching `.npm/`, because cache paths must be in the local working copy. Changed the example to cache `.npm/` and run `npm ci --cache .npm --prefer-offline`.
- The fallback keys section described fallback keys but did not use GitLab's `fallback_keys` keyword. Added `fallback_keys` entries so the snippet matches the described behavior.
- The fallback keys example used `~/.npm`, which is outside the project directory and is not a valid GitLab cache path. Changed it to `.npm/`.
- The snippets used top-level `cache`, which GitLab's YAML reference marks as deprecated when not in the `default` section. Updated global cache examples to use `default: cache:`.

## Review Notes
- GitLab's `policy: pull-push` is the default cache policy, but keeping it explicit is technically valid.
- The post correctly distinguishes cache from artifacts at a high level. GitLab artifacts are automatically downloaded by later-stage jobs by default, with behavior controlled by `dependencies` or `needs`.
