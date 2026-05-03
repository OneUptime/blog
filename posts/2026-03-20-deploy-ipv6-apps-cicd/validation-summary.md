# Validation Summary: How to Deploy IPv6 Applications from CI/CD Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes (dual-stack networking, Service `ipFamilyPolicy`/`ipFamilies`)
- kubectl (JSONPath, rollout status)
- GitHub Actions (`actions/checkout@v4`, `docker/metadata-action@v5`, `docker/build-push-action@v5`, `azure/setup-kubectl@v3`, self-hosted runners)
- GitLab CI (jobs, tags, environments, predefined variables like `CI_COMMIT_SHA`)
- Docker / container registries
- Python (`pytest`, `urllib.request`, `socket` with `AF_INET6`)
- IPv6 networking (literal-address URL bracket notation, dual-stack semantics)

## Sources Consulted
- Kubernetes JSONPath reference: https://kubernetes.io/docs/reference/kubectl/jsonpath/ (specifically the "Regular expressions in JSONPath" note)
- Kubernetes dual-stack documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/ (covers `ipFamilies`, `ipFamilyPolicy`, and `clusterIPs` ordering)
- Kubernetes Service spec reference: https://kubernetes.io/docs/reference/kubernetes-api/service-resources/service-v1/
- GitHub Actions `runs-on` array (label-matching) docs: https://docs.github.com/en/actions/using-jobs/choosing-the-runner-for-a-job
- `docker/metadata-action` v5 outputs (`tags`, `version`): https://github.com/docker/metadata-action
- `docker/build-push-action` v5 inputs: https://github.com/docker/build-push-action
- GitLab CI `CI_COMMIT_SHA` predefined variable: https://docs.gitlab.com/ee/ci/variables/predefined_variables.html
- pytest `addoption` / fixtures: https://docs.pytest.org/en/stable/how-to/parametrize.html
- Python `socket.AF_INET6`: https://docs.python.org/3/library/socket.html
- RFC 3986 §3.2.2 (IPv6 literals in URIs use brackets): https://datatracker.ietf.org/doc/html/rfc3986

## Issues Found
1. **kubectl JSONPath used unsupported `=~` regex operator** (GitHub Actions "Verify IPv6 Service Endpoints" step).
   - Original: `jsonpath='{.status.loadBalancer.ingress[?(@.ip =~ ":")].ip}'`
   - Problem: The Kubernetes JSONPath docs explicitly state regex is not supported and that this exact pattern (`=~`) does not work; the filter would silently fail and `IPV6_LB` would always be empty.
   - Fix: Replaced with a `range` JSONPath that emits one IP per line, then `grep ':' | head -n1` to pick an IPv6 address. Added a brief comment explaining why the regex form was avoided.

2. **`clusterIPs[1]` used as the IPv6 address — actually IPv4 with the given manifest** (both the GitHub Actions smoke-test step and the GitLab CI verification step).
   - Original: `kubectl get svc myapp -o jsonpath='{.spec.clusterIPs[1]}'`
   - Problem: The manifest declares `ipFamilies: [IPv6, IPv4]`. Per the Kubernetes dual-stack docs, `.spec.clusterIPs` order matches `.spec.ipFamilies`, so `clusterIPs[0]` is the IPv6 address and `clusterIPs[1]` is IPv4. The smoke tests and verification would have run against the IPv4 ClusterIP.
   - Fix: Changed both occurrences to `clusterIPs[0]` and added a short comment noting why.

## Review Notes
- `azure/setup-kubectl@v3` still works but `@v4` is the current major version. Not changed because v3 is not broken.
- `${CI_COMMIT_SHA:0:8}` is a bash-specific substring expansion. The `bitnami/kubectl:latest` image is minideb-based and ships bash, but if a reader swaps to an Alpine-based kubectl image the script's default `sh` shell will reject this syntax. Worth flagging in a future revision.
- Listening on `::` typically also accepts IPv4 connections via IPv4-mapped IPv6 unless `IPV6_V6ONLY` is set; behavior depends on OS / framework. The post's framing as "IPv6" listener is reasonable but readers running on systems with `bindv6only=1` (or Java/Go defaults) may see different behavior.
- The LoadBalancer IPv6 detection now relies on `grep` being present in the runner image; that holds for `ubuntu-latest` and self-hosted Linux runners used here.
- The `socket.send` call in `test_ipv6_only_connection` does not handle short writes (it should arguably be `sendall`), and the response parsing only reads the first 1024 bytes. Functional for a smoke test but not robust; left as-is since correcting style was out of scope.
