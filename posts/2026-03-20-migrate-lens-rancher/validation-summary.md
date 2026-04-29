# Validation Summary: How to Migrate from Lens to Rancher Dashboard

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Lens IDE (Kubernetes desktop UI)
- Rancher / Rancher Dashboard
- Kubernetes (Deployments, PVCs, Pods, kubectl)
- Docker Compose / Docker Swarm / Amazon ECS (as source environments)
- kompose (Docker Compose → Kubernetes converter)
- Longhorn (storage class)
- AWS CLI / S3 / Route53
- Python + PyYAML
- Bash

## Sources Consulted
- kubectl wait reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#wait
- Pod lifecycle (phases vs. conditions): https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- kompose releases (verifying v1.31.0 asset name): https://github.com/kubernetes/kompose/releases/tag/v1.31.0
- Kubernetes Deployment reference (apps/v1): https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/deployment-v1/
- PersistentVolumeClaim reference: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- AWS Route 53 change-resource-record-sets reference: https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html
- Longhorn storage class docs: https://longhorn.io/docs/

## Issues Found
- **`kubectl wait --for=condition=Succeeded` is invalid syntax (Step 4).** "Succeeded" is a Pod *phase*, not a *condition* — Pod conditions are limited to `PodScheduled`, `Initialized`, `ContainersReady`, and `Ready`. Using `--for=condition=Succeeded` causes kubectl to wait for a condition that never appears and eventually time out. Replaced with `--for=jsonpath='{.status.phase}'=Succeeded`, which is the supported form (kubectl 1.23+) for waiting on a Pod's phase.

## Review Notes
- The post's framing has an editorial mismatch with its content: Lens is a desktop IDE for managing Kubernetes clusters, not a workload host, so a literal "migration from Lens to Rancher" would normally just mean importing existing clusters into Rancher (via cluster registration) and switching the management UI. The body instead walks through migrating workloads from Docker Compose / Swarm / ECS to a Kubernetes cluster managed by Rancher. The technical content within that scope is correct, so I did not rewrite the framing — but a future revision could clarify this in the introduction or retitle the post (e.g., "Migrating Container Workloads from Docker to Rancher (and switching off Lens)").
- The Python conversion script imports `subprocess` but never uses it — harmless but dead code.
- The port-mapping parser `int(p.split(":")[1] if ":" in str(p) else p)` only handles simple `host:container` forms; Docker Compose's extended port syntax (`HOST_IP:HOST_PORT:CONTAINER_PORT`, ranges, protocol suffixes like `8080:8080/tcp`, dict form) is not handled. Acceptable for a "basic example" caveat that's already implied.
- kompose v1.31.0 is a real release and the binary asset name `kompose-linux-amd64` is correct, but newer versions exist as of 2026 — readers may want to check the latest release.
- The validation-checklist line `kubectl get pods -n my-app | grep -c Running` would also match pod names containing the substring "Running"; using `-o jsonpath` or `--field-selector=status.phase=Running` would be more robust, but the current form is close enough for an at-a-glance script.
- `kubectl run ... --rm -it --restart=Never` is still valid and not yet deprecated; the `kubectl run` generator deprecations from earlier Kubernetes versions removed most generators but left this basic form intact.
