# Validation Summary: How to Set Up Performance Testing in GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions
- k6
- Artillery
- Lighthouse CI
- Preact compressed-size-action
- hyperfine
- Docker Compose
- JavaScript
- YAML

## Sources Consulted
- Grafana k6 thresholds documentation: https://grafana.com/docs/k6/latest/using-k6/thresholds/
- Grafana k6 JSON output documentation: https://grafana.com/docs/k6/latest/results-output/real-time/json/
- Grafana k6 custom summary documentation: https://grafana.com/docs/k6/latest/results-output/end-of-test/custom-summary/
- Artillery ensure plugin documentation: https://www.artillery.io/docs/reference/extensions/ensure
- Artillery reported metrics documentation: https://www.artillery.io/docs/reference/reported-metrics
- Artillery HTTP engine documentation: https://www.artillery.io/docs/reference/engines/http
- Lighthouse CI GitHub Action documentation: https://github.com/treosh/lighthouse-ci-action
- Lighthouse performance budgets documentation: https://web.dev/articles/use-lighthouse-for-performance-budgets
- GitHub Actions service containers documentation: https://docs.github.com/actions/tutorials/communicating-with-docker-service-containers
- GitHub Actions artifact documentation: https://docs.github.com/en/actions/tutorials/store-and-share-data
- preactjs/compressed-size-action documentation: https://github.com/preactjs/compressed-size-action
- hyperfine documentation: https://github.com/sharkdp/hyperfine

## Issues Found
- Some k6 commands placed output flags after the script path. k6 documentation shows `k6 run --out json=results.json script.js`, so the commands were updated to put output flags before the script path.
- The k6 threshold gate tried to detect failed thresholds by grepping piped console output. k6 already exits non-zero when thresholds fail, and piping through `tee` can mask that status. The workflow now captures `${PIPESTATUS[0]}` and sets the GitHub Actions output from the k6 process exit code.
- The k6 summary parsing used fields like `metrics.http_req_duration.avg`. k6 summary objects store aggregate values under `values`, so the PR comment and regression comparison now use paths such as `metrics.http_req_duration.values['p(95)']`.
- The Artillery `ensure` example used the backwards-compatible v1-style `config.ensure` form. Artillery's current documentation recommends the `plugins.ensure.thresholds` and `plugins.ensure.conditions` structure, so the snippet was updated accordingly.

## Review Notes
- The workflow examples assume that the application image, Docker Compose setup, npm scripts, and test endpoints exist in the reader's project.
- GitHub token permissions for PR comments may need to be configured explicitly in repositories with restricted default workflow permissions.
