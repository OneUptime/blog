# Validation Summary: How to Install NeuVector on Kubernetes

## Status
validated

## Post Type
Tutorial / Step-by-step installation guide

## Technologies Covered
- NeuVector (container security platform, v5.3.x images)
- Kubernetes (v1.19+: Deployments, DaemonSets, Services, ServiceAccounts, ClusterRoles, ClusterRoleBindings, CRDs, NodePort)
- kubectl
- YAML manifests
- Container runtimes (Docker, containerd, CRI-O)
- Linux host paths used by the enforcer (`/proc`, `/sys/fs/cgroup`, `/var/neuvector`, `/run/containerd/containerd.sock`)

## Sources Consulted
- NeuVector manifests repository: https://github.com/neuvector/manifests
- NeuVector combined Kubernetes manifest (5.3.0): https://raw.githubusercontent.com/neuvector/manifests/main/kubernetes/5.3.0/neuvector-k8s.yaml
- NeuVector CRD manifest (5.3.0): https://raw.githubusercontent.com/neuvector/manifests/main/kubernetes/5.3.0/crd-k8s-1.19.yaml
- NeuVector versioned manifest folders: `kubernetes/5.0.0`, `kubernetes/5.2.0`, `kubernetes/5.3.0`, `kubernetes/5.4.0`, `kubernetes/latest`
- Kubernetes RBAC reference (ClusterRole / ClusterRoleBinding / ServiceAccount): https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
1. **Broken RBAC URLs in Step 2.** The post pointed to `https://raw.githubusercontent.com/neuvector/manifests/main/kubernetes/5.x/rbac/cluster-role.yaml` and `.../cluster-role-binding.yaml`. Neither path exists in the upstream `neuvector/manifests` repo — there is no `5.x` directory (only versioned folders such as `5.3.0`, `5.4.0`) and there is no separate `rbac/` subdirectory; RBAC is bundled inside the combined `neuvector-k8s.yaml`. Both broken URLs return 404. Removed the URL-based shortcut and folded the manual RBAC YAML directly into the step so the instructions actually apply.
2. **Missing `enforcer` ServiceAccount in the manual RBAC.** The Step 4 DaemonSet sets `serviceAccountName: enforcer`, but the manual RBAC YAML in Step 2 only created a `controller` ServiceAccount. Applying the post as written caused the enforcer pods to fail to schedule with `error looking up service account neuvector/enforcer`. Added an `enforcer` ServiceAccount and added it as a subject of the `neuvector-binding-app` ClusterRoleBinding so the enforcer also gets the necessary read access (which the official combined manifest grants via its own per-component bindings).
3. **CRD URL used the non-existent `5.x` path.** Step 3 referenced `https://raw.githubusercontent.com/neuvector/manifests/main/kubernetes/5.x/crd-k8s-1.19.yaml`, which 404s. Versioned CRDs live under `kubernetes/5.3.0/crd-k8s-1.19.yaml` (and similarly for other 5.x.x versions). Updated the URL to point at `kubernetes/5.3.0/crd-k8s-1.19.yaml` to match the rest of the post, which pins images at `5.3.0`.

## Review Notes
- The pod naming (`neuvector-controller-pod`, `neuvector-enforcer-pod`, `neuvector-manager-pod`), service name `neuvector-svc-controller`, controller cluster ports 18300/TCP and 18301/TCP+UDP, headless `clusterIP: None` for the controller service, manager web UI on 8443, default `admin/admin` credentials, the enforcer's `hostPID: true` + `privileged: true`, and the host volume mounts (`/var/neuvector`, `/run/containerd/containerd.sock`, `/proc`, `/sys/fs/cgroup`) all match the upstream `neuvector-k8s.yaml` for 5.3.0.
- The post does not give the manager Deployment an explicit `serviceAccountName`; it will use the namespace's `default` ServiceAccount. This works because the manager talks to the controller over the cluster service rather than the Kubernetes API, but the upstream manifest assigns it the `basic` ServiceAccount. Not a correctness issue — just a divergence from the official layout.
- The webui Service uses port name `manager-443` while the upstream manifest names it `manager`. Port names are arbitrary so this is valid, just inconsistent with the official convention.
- NeuVector 5.3.0 was released in 2023; 5.4.x is current as of 2026-04-28. The pinned `5.3.0` image tags still pull and the manifest schema in this guide remains compatible with 5.4.x, but readers should bump the tags and CRD path to a newer version (e.g. `5.4.0`) for fresh production installs.
- For real production use, the post correctly notes Helm is preferable; the manual kubectl path here intentionally omits the scanner and updater components that the upstream combined manifest installs.
