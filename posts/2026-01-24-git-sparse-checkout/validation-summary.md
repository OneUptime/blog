# Validation Summary: How to Configure Git Sparse Checkout

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Git sparse checkout
- Git cone mode and non-cone mode
- Git partial clone
- GitHub Actions checkout action
- Monorepo workflows

## Sources Consulted
- Git sparse-checkout documentation: https://git-scm.com/docs/git-sparse-checkout
- Git clone documentation: https://git-scm.com/docs/git-clone
- Git configuration documentation for `index.sparse`: local `git config --help`
- GitHub actions/checkout documentation: https://github.com/actions/checkout
- Local Git CLI help and smoke tests with Git 2.43.0

## Issues Found
- The post used `git sparse-checkout init --cone` and `git sparse-checkout init --no-cone` in several modern examples. Current Git documentation marks `init` as deprecated because `git sparse-checkout set` now enables the necessary configuration. Updated modern examples to use `git sparse-checkout set --cone ...` or `git sparse-checkout set --no-cone ...`.
- Several cone-mode examples passed individual files such as `package.json`, `README.md`, and `tsconfig.json` to `git sparse-checkout set`. Cone mode expects directory paths, and local validation showed file arguments fail with a fatal error. Removed those file arguments from cone-mode examples.
- The team configuration example used command substitution with `git sparse-checkout set $(cat .sparse-checkout-frontend)`. Replaced it with `git sparse-checkout set --stdin < .sparse-checkout-frontend`, which matches the official command's newline-delimited input support and handles path lists more correctly.

## Review Notes
- The examples using `--filter=blob:none`, `--sparse`, `git sparse-checkout add`, `git sparse-checkout list`, `git sparse-checkout reapply`, and `git sparse-checkout disable` are consistent with official Git documentation.
- The GitHub Actions sparse checkout example is structurally valid for `actions/checkout`, though the official README now shows newer major versions than `v4`.
