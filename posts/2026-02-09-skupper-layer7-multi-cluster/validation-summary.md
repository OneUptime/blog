# Validation Summary: How to Use Skupper for Layer 7 Multi-Cluster Service Networking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Skupper v1 CLI
- Kubernetes Deployments, Services, StatefulSets, and NetworkPolicies
- Multi-cluster service networking
- HTTP, HTTP/2, gRPC, and TCP proxying
- Istio sidecar injection controls

## Sources Consulted
- Skupper v1 CLI documentation: https://skupper.io/v1/docs/cli/index.html
- Skupper v1 `skupper init` reference: https://skupper.io/v1/docs/kubernetes-reference/skupper_init.html
- Skupper v1 `skupper expose` reference: https://skupper.io/v1/docs/kubernetes-reference/skupper_expose.html
- Skupper v1 token documentation: https://skupper.io/v1/docs/cli/tokens.html
- Skupper releases page: https://skupper.io/releases/index.html
- Skupper v2 migration notes for v1/v2 command differences: https://skupper.io/docs/overview/migrating.html
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio resource labels reference: https://istio.io/latest/docs/reference/config/labels/
- Local Skupper CLI help output for v1.5.0 and v1.9.5 (`skupper init --help`, `skupper expose --help`, `skupper token create --help`, `skupper link status --help`, `skupper service status --help`)

## Issues Found
- The installation commands used Skupper 1.5.0, which is stale for the v1 CLI line. Updated the commands to Skupper 1.9.5 and clarified that the tutorial uses Skupper v1 CLI semantics.
- The headless service example used `skupper expose service/database --headless`, but `--headless` is valid only for StatefulSet targets in Skupper v1. Changed the command to expose `statefulset/database` with `--headless --port 5432`.
- The load-balancing example omitted `--protocol http` while the expected output showed `http`. Added `--protocol http` to both `skupper expose deployment/api` commands and narrowed the wording to HTTP requests.
- The NetworkPolicy example combined namespace and pod selectors in a way that was broader than "only Skupper routers" in the same namespace, and a follow-up edit briefly left invalid YAML indentation. Replaced it with a same-namespace Skupper router pod selector and verified the indentation.
- The three-cluster topology section called the example a fully connected mesh even though cluster 1 and cluster 2 were not directly linked. Changed the wording to "connected topology" and noted that a full mesh requires a direct link for every pair of clusters.
- The Istio example placed sidecar injection control on a Service, which does not control pod sidecar injection. Replaced it with a Deployment pod-template label using the current `sidecar.istio.io/inject: "false"` label form.

## Review Notes
The post intentionally remains a Skupper v1 tutorial. Current Skupper v2 uses different commands and concepts (`skupper site create`, `skupper token issue/redeem`, listeners, and connectors), so a future refresh could rewrite the article for Skupper v2 rather than preserving the v1 `skupper init` and `skupper expose` workflow.
