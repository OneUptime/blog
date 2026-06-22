# Validation Summary: How to Configure Artillery for Load Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Artillery
- Load testing and performance testing
- Node.js and npm
- YAML test configuration
- JavaScript processor hooks
- WebSocket testing
- GitHub Actions CI/CD
- AWS Lambda and AWS Fargate distributed test execution

## Sources Consulted
- Artillery CLI setup documentation: https://www.artillery.io/docs/get-started/get-artillery
- Artillery test script reference: https://www.artillery.io/docs/reference/test-script
- Artillery HTTP engine reference: https://www.artillery.io/docs/reference/engines/http
- Artillery WebSocket engine reference: https://www.artillery.io/docs/reference/engines/websocket
- Artillery expect plugin reference: https://www.artillery.io/docs/reference/extensions/expect
- Artillery ensure plugin reference: https://www.artillery.io/docs/reference/extensions/ensure
- Artillery run command reference: https://www.artillery.io/docs/reference/cli/run
- Artillery report command reference: https://www.artillery.io/docs/reference/cli/report
- Artillery GitHub Actions guide: https://www.artillery.io/docs/cicd/github-actions
- Artillery distributed load testing guide: https://www.artillery.io/docs/load-testing-at-scale
- Artillery AWS Lambda distributed testing guide: https://www.artillery.io/docs/load-testing-at-scale/aws-lambda
- Local CLI check with `npx artillery --version`, `npx artillery run --help`, and `npx artillery report --help` using Artillery 2.0.33.

## Issues Found
- The installation section recommended installing Artillery as a dev dependency in application projects for CI/CD. Current Artillery docs recommend global installation or a dedicated performance test project/repository, so the wording and global install command were updated.
- The reporting examples used `artillery report` to generate local HTML reports. Current official docs mark `report` as removed in v2.0.22 and recommend Artillery Cloud or JSON reports, so the examples now save JSON reports instead.
- The shopping scenario used `expect` assertions without enabling the `expect` plugin. Added `plugins: expect: {}` to the sample configuration.
- The JavaScript processor sample called an undefined `generateToken()` function and used `substr()`. Added a small placeholder `generateToken()` helper and replaced `substr()` with `slice()`.
- The thresholds example used Artillery v1-style shorthand checks. Replaced it with the current `plugins.ensure.thresholds` syntax and verified the p95, p99, median, and max metric names with a local Artillery run.
- The GitHub Actions workflow generated and uploaded an HTML report with `artillery report`, then used a non-existent `--ensure` CLI flag. Updated the workflow to run once, rely on configured threshold checks for failure, and upload the JSON report artifact.
- The distributed testing section suggested manually running multiple local instances and combining reports with `artillery report`. Replaced that with current built-in distributed commands for AWS Lambda and AWS Fargate.

## Review Notes
- Artillery 2.0.33 still exposed `artillery report --help` locally, but the current official documentation says the command is no longer supported and was removed in v2.0.22. The article was corrected to match the official current documentation.
- The post's examples use placeholder domains such as `api.example.com`, which are appropriate for documentation examples but are not runnable without replacing the target services.
