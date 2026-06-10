# Validation Summary: How to Cache Dependencies in CircleCI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CircleCI (config 2.1, pipeline parameters, workflows, restore_cache/save_cache)
- Node.js (npm, Yarn)
- Python (pip, Poetry, venv)
- Java (Maven, Gradle)
- Go (Go Modules)
- Ruby (Bundler)
- TypeScript (incremental build cache)
- Docker convenience images (`cimg/*`)
- Mermaid diagrams

## Sources Consulted
- CircleCI Caching docs: https://circleci.com/docs/caching/
- CircleCI Caching Strategy docs: https://circleci.com/docs/caching-strategy/
- CircleCI config reference (restore_cache, save_cache, pipeline parameters)
- CircleCI convenience images: https://circleci.com/developer/images
- npm CLI docs (`npm ci`, `~/.npm`)
- Yarn docs (`--frozen-lockfile`, `~/.cache/yarn`)
- Poetry installation docs: https://install.python-poetry.org and https://python-poetry.org/docs/
- Maven docs (`dependency:go-offline`, `~/.m2/repository`)
- Gradle docs (`--no-daemon`, `~/.gradle/caches`)
- Go Modules docs (`GOMODCACHE`, `~/go/pkg/mod`)
- Bundler docs (`bundle config set --local`, deployment mode)

## Issues Found
1. **Time-Based Cache Invalidation example used unsupported shell variable expansion in cache keys.** The original example wrote `WEEK_NUM` to `$BASH_ENV` and then referenced it as `${WEEK_NUM}` inside `restore_cache`/`save_cache` keys. CircleCI cache keys only evaluate the documented template functions (`{{ checksum "..." }}`, `{{ .Branch }}`, `{{ arch }}`, `{{ epoch }}`, `{{ .Environment.VAR }}`, etc.) — they do **not** perform shell expansion, so `${WEEK_NUM}` would be treated as a literal string and the weekly rotation would never happen. Fixed by writing the week number to a file (`cache-week.txt`) and using `{{ checksum "cache-week.txt" }}` in the key, which is the documented pattern for dynamic / time-based cache keys.

## Review Notes
- The claim that `save_cache` skips upload when the exact key already exists is correct (CircleCI cache keys are immutable once written).
- `{{ arch }}` returns the architecture/OS combo (e.g. `amd64-linux`), so the "OS + Node version + dependencies" description (where `.nvmrc` checksum supplies the Node version) is accurate.
- The Gradle example only checksums `build.gradle`; users on the Kotlin DSL would need to switch to `build.gradle.kts`. This is not technically incorrect for a Groovy DSL example, so no change made.
- The Poetry installer URL (`https://install.python-poetry.org`) is the current official installer endpoint.
- All `cimg/*` Docker image tags (`cimg/node:18.17.0`, `cimg/python:3.11.4`, `cimg/openjdk:17.0.8`, `cimg/go:1.21.0`, `cimg/ruby:3.2.2`) are valid CircleCI convenience images. Newer point releases exist, but the pinned tags are correct and reproducible.
- The "Verifying Cache Contents" step uses `npm ls --depth=0 || { ... }` — `npm ls` can exit non-zero for peer-dep warnings even on a healthy install, so this may trigger false-positive cache busts in some projects. Behaviorally safe (worst case is a re-install), so no change made.
