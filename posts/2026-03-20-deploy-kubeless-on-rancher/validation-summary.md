# Validation Summary: How to Deploy Kubeless on Rancher

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Kubeless (Kubernetes-native serverless framework)
- Rancher (Kubernetes management platform)
- Kubernetes (CRDs, kubectl)
- Python (function runtime)
- Kafka (event trigger)
- HTTP/Ingress triggers

## Sources Consulted
- Kubeless GitHub archive: https://github.com/vmware-archive/kubeless
- Kubeless releases page: https://github.com/vmware-archive/kubeless/releases (latest v1.0.8, archived 2021-12-15)
- Kubeless quick-start docs: https://github.com/vmware-archive/kubeless/blob/master/docs/quick-start.md
- Kubeless HTTP triggers docs: https://github.com/vmware-archive/kubeless/blob/master/docs/http-triggers.md
- Kubeless Kafka triggers docs: https://github.com/vmware-archive/kubeless/blob/master/docs/use-existing-kafka.md

## Issues Found
No technical issues found.

- Installation manifest naming `kubeless-non-rbac-$RELEASE.yaml` matches the actual release artifact pattern.
- `kubeless function deploy` syntax with `--runtime python3.8`, `--from-file`, and `--handler` matches the official quick-start example verbatim.
- Python handler signature `def hello(event, context)` is the documented Kubeless Python runtime contract.
- `kubeless function call --data` is the correct invocation flag.
- `kubeless trigger http create` flags `--function-name`, `--hostname`, and `--path` all match the official HTTP trigger documentation.
- `kubeless trigger kafka create` with `--function-selector` and `--trigger-topic` matches the documented Kafka trigger CLI usage.
- The `kubectl proxy` service URL pattern `localhost:8001/api/v1/namespaces/<ns>/services/<svc>:<port>/proxy/` is the correct Kubernetes API proxy syntax.

## Review Notes
- Kubeless was archived by VMware on 2021-12-15 and is no longer actively maintained. The post correctly references the `vmware-archive` GitHub organization rather than the original `kubeless/kubeless` location. Readers should be aware the project receives no updates and consider alternatives (Knative, OpenFaaS, Fission) for new production workloads.
- Latest Kubeless release is v1.0.8 (January 2021). The dynamic `RELEASE` resolution via the GitHub API will continue to work as long as that endpoint serves the archive.
- `brew install kubeless` may eventually be removed from Homebrew given the upstream archive status; the Linux zip artifact path remains the more durable installation method.
- The post does not cover RBAC explicitly — for production Rancher clusters, the RBAC manifest (`kubeless-$RELEASE.yaml`) should be preferred over `kubeless-non-rbac-$RELEASE.yaml`.
