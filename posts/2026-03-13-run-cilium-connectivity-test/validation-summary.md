# Validation Summary: Run Cilium Connectivity Tests

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Cilium (cilium-cli)
- Kubernetes (kubectl, NetworkPolicy, DaemonSet, Deployment)
- eBPF (referenced as the underlying datapath technology)
- DNS

## Sources Consulted
- [cilium connectivity test command reference (Cilium 1.20.0-dev docs)](https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/)
- [End-To-End Connectivity Testing — Cilium 1.19.3 documentation](https://docs.cilium.io/en/stable/contributing/testing/e2e/)
- [Cilium Command Cheatsheet (1.19.3)](https://docs.cilium.io/en/stable/cheatsheet/)
- [cilium/cilium-cli GitHub repository](https://github.com/cilium/cilium-cli)

## Issues Found
Three CLI flag inaccuracies were found and corrected against the official `cilium connectivity test` command reference:

1. **`--skip-tests "pod-to-world"`** — This flag does not exist on `cilium connectivity test`. Skipping tests is done via the `--test` flag with a `!` prefix (e.g., `--test '!pod-to-world'`). Updated the example accordingly.

2. **`--parallel-tests 4`** — This flag does not exist. The correct flag for running tests in parallel namespaces is `--test-concurrency`. Updated the example to `--test-concurrency 4` and adjusted the surrounding comment to describe what concurrency actually does (parallel test namespaces, not "workers").

3. **`--cleanup-on-exit`** — This flag does not exist on `cilium connectivity test`. The correct flag is `--cleanup`, which cleans up all connectivity test artifacts (namespaces, deployments, services) without running tests. Updated the example and clarified the comment.

## Review Notes
- The listed test names (`no-policies`, `no-policies-extra`, `allow-all-except-world`, `client-ingress`, `client-ingress-knp`, `echo-ingress`, `host-port`, `pod-to-world`, `pod-to-cidr`, `dns-only`) match real test cases in cilium-cli. The exact set of tests run varies between cilium-cli versions; readers should treat this as a representative sample rather than an exhaustive list.
- The post states the `--timeout` default is 5 minutes; this matches the default in the cilium-cli source. Note that individual readiness/wait operations have their own timeouts that may be hit independently of `--timeout`.
- The `cilium` CLI v0.15+ prerequisite is a reasonable minimum, but the cilium-cli has evolved significantly since then (current releases are v0.18.x). Future updates may want to bump this minimum to a more recent series that better supports `--test-concurrency` and the test names referenced.
- `cilium connectivity test --cleanup` is a standalone invocation (it cleans up and exits without running the test suite); the post's phrasing now reflects this correctly.
