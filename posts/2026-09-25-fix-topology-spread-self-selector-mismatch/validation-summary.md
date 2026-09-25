# Validation Summary: How to Fix Topology Spread Constraints When Labels Do Not Match Their Own Pods

## Status

validated

## Post Type

Technical troubleshooting guide with shell commands and a Kubernetes Deployment manifest.

## Technologies Covered

- Kubernetes scheduling and Pod topology spread constraints
- Deployment templates, labels, selectors, and rolling updates
- kubectl
- Bash, jq, and YAML
- NGINX Docker Official Image
- Helm and Kustomize as sources of managed workload configuration

## Sources Consulted

- Kubernetes Pod Topology Spread Constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes Labels and Selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- kubectl rollout status reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- Kubernetes Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- jq manual: https://jqlang.org/manual/
- Docker Official Images NGINX metadata: https://raw.githubusercontent.com/docker-library/official-images/master/library/nginx
- Docker Hub NGINX 1.28 tag API: https://hub.docker.com/v2/repositories/library/nginx/tags/1.28
- Author profile link: https://github.com/nawazdhandala

## Issues Found

No technical issues found.

The README.md was left unchanged.

## Review Notes

- Confirmed that pods excluded by their own spread selector do not increase that group's counts, and that matching candidates are namespace-scoped. The documentation explicitly describes the ghost-pod behavior.
- Confirmed the constraint fields, strict versus preferred scheduling behavior, and the need for node topology labels. Counts also depend on eligible nodes; a matching pod on an excluded node does not necessarily contribute.
- Confirmed revision grouping with `matchLabelKeys`, the prohibition on duplicate keys across the two selector fields, and the warning against editing selected pod labels directly. Documentation describes default-enabled beta support from Kubernetes 1.27 and explicit selector merging from 1.34; the post appropriately directs readers to check their version and feature settings.
- A rollout does not guarantee permanent balance: deleting old replicas can leave uneven placement, and the scheduler does not automatically rebalance running pods. The post correctly calls for inspecting actual placement. Without `minDomains`, the example does not enforce a minimum number of zones.
- Confirmed that Deployment object labels are distinct from pod template labels, selector requirements combine with AND, the Deployment selector is immutable, and changing the pod template triggers a rollout.
- Verified `apps/v1`, the Deployment structure, matching selectors, and CPU/memory request syntax. Parsed the YAML successfully with PyYAML.
- All three Bash blocks passed `bash -n`. Executed the exact jq filter against representative pod JSON and confirmed the expected labels, spread, and node fields. Checked kubectl resource syntax and the namespace, output, selector, label-display, and rollout-status options against official references.
- Docker Hub returned an active `1.28` image tag. The example does not claim it is the newest NGINX version. Production image maintenance remains separate from demonstrating scheduling behavior.
- The referenced Kubernetes links resolve to the intended documentation; the author URL redirects to the expected GitHub profile.
- Commands assume installed kubectl and jq, appropriate cluster access, an existing production namespace, and substitution of a real pod name. Apply the namespace-less manifest in the intended namespace. No live cluster deployment, image execution, or server-side admission test was performed.
