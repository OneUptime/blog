# Validation Summary: How to Set Up Linkerd Tap and Viz Dashboard for Real-Time Traffic Inspection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linkerd
- Linkerd Viz extension
- Linkerd Tap
- Kubernetes
- Kubernetes RBAC
- Prometheus metrics
- jq

## Sources Consulted
- Linkerd Viz CLI reference: https://linkerd.io/docs/reference/cli/viz/
- Linkerd Getting Started guide: https://linkerd.io/docs/getting-started/
- Linkerd Securing Linkerd Tap guide: https://linkerd.io/2.17/tasks/securing-linkerd-tap/
- Linkerd proxy metrics reference: https://linkerd.io/2.10/reference/proxy-metrics/
- Linkerd releases and versions: https://linkerd.io/releases/
- Linkerd Tap proxy API Go reference: https://pkg.go.dev/github.com/linkerd/linkerd2-proxy-api/go/tap

## Issues Found
- The Linkerd core installation example skipped `linkerd install --crds`, which current Linkerd installation docs require before `linkerd install`. Added the CRD installation command.
- The Viz verification command used `linkerd check --proxy`, which checks the data plane rather than specifically validating the Viz extension. Changed it to `linkerd viz check`.
- The Viz pod expected output listed component names as if they were exact pod names. Updated the wording to describe expected components instead.
- The post described `--path` as regex matching. Official CLI docs define `--path` as a prefix filter, so the regex example was replaced with a prefix example.
- Several examples used a nonexistent `linkerd viz tap --status` flag. Replaced those with `-o json` and `jq` filters against response status metadata.
- The request header filtering example treated headers as a map. Updated it to filter the header list by name.
- The body inspection guidance referenced a generic debug sidecar. Reworded it to clarify that Tap exposes metadata, not bodies, and that body inspection needs application logging or a dedicated debugging proxy.
- The service-only tap example omitted the required tap target resource. Changed it to tap the namespace while filtering with `--to svc/database-proxy`.
- The slow request example parsed human-readable output unreliably. Replaced it with JSON duration filtering.
- The CI examples used the removed `--status` flag, an outdated stable CLI image tag, and a mismatched ServiceAccount name. Updated the examples to use JSON filtering, a current edge-style CLI image, and `tap-viewer`.
- The RBAC example created a namespaced Role with broad `tap.linkerd.io` resources. Updated it to bind the ServiceAccount to Linkerd's installed `linkerd-linkerd-viz-tap-admin` ClusterRole, matching Linkerd's documented tap access model.
- The token/context example implied that writing a token file creates a kubeconfig context. Replaced it with an RBAC verification command and guidance to use an authenticated context or in-cluster Job.
- The "Stream tap data to Prometheus" ConfigMap described a nonexistent tap exporter configuration. Replaced it with guidance to use Linkerd's existing Prometheus metrics alongside tap.
- The performance section said Tap samples at the proxy level, conflicting with the post's earlier "without sampling" claim and Linkerd's metadata-oriented Tap behavior. Reworded it to say Tap observes metadata and does not serialize bodies.
- The troubleshooting RBAC check used an invalid resource name (`tap`). Changed it to `deployments.tap.linkerd.io`.

## Review Notes
The post is now technically aligned with current Linkerd CLI documentation. Some examples still assume a cluster with matching workload names and a CLI image available for the chosen Linkerd release; production CI jobs should pin the CLI image to the same Linkerd release family installed in the cluster.
