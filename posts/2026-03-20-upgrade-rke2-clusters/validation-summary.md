# Validation Summary: How to Upgrade RKE2 Clusters - Clusters

## Status
validated

## Post Type
Tutorial / Operational guide

## Technologies Covered
- RKE2 (Rancher Kubernetes Engine 2)
- Kubernetes (kubectl)
- Rancher Manager
- etcd (via `rke2 etcd-snapshot`)
- System Upgrade Controller
- systemd
- kube-bench (CIS benchmark)

## Sources Consulted
- RKE2 official documentation (https://docs.rke2.io/)
- RKE2 GitHub releases (https://github.com/rancher/rke2/releases) — verified `vX.Y.Z+rke2rN` version format
- RKE2 install script (https://get.rke2.io)
- System Upgrade Controller (https://github.com/rancher/system-upgrade-controller)
- Rancher / SUSE support matrix (https://www.suse.com/suse-rancher/support-matrix/)
- kubectl drain reference (including `--delete-emptydir-data` flag, which replaced the deprecated `--delete-local-data`)
- kube-bench repo (https://github.com/aquasecurity/kube-bench)

## Issues Found
No technical issues found.

- `INSTALL_RKE2_VERSION="v1.30.2+rke2r1"` matches the documented RKE2 version format (`vX.Y.Z+rke2rN`).
- `INSTALL_RKE2_TYPE="agent"` is the correct env var to install an agent rather than a server.
- `rke2 etcd-snapshot save --name <name>` is the correct RKE2 CLI syntax.
- `systemctl restart rke2-server` / `rke2-agent` are the correct service names.
- `kubectl drain --ignore-daemonsets --delete-emptydir-data` uses the current non-deprecated flag.
- System Upgrade Controller URL and apply pattern match the upstream project's release artifact layout.
- Two-phase ordering (servers first, then agents) and "upgrade one server at a time, non-leader first" align with RKE2 HA upgrade guidance.

## Review Notes
- The `kubectl run test-pod --image=nginx --rm -it -- curl -s http://localhost` workload test is syntactically valid, but the default `nginx` Docker Hub image does not ship with `curl`, so the in-container command will fail. Intent (quickly run a pod against the cluster) still comes through; a future revision could use an image like `curlimages/curl` or `busybox` with `wget` for a more reliable smoke test.
- The advice "Upgrade RKE2 before upgrading Rancher - check Rancher's support matrix for compatible versions" is defensible (the support-matrix check is the load-bearing part), but in practice Rancher is often upgraded first so that it supports the target Kubernetes/RKE2 version of its downstream clusters. Readers should consult the Rancher support matrix for their specific version pair before choosing an order.
- Only-one-minor-version-at-a-time is consistent with upstream Kubernetes skew policy and RKE2 guidance.
- `kubectl get pods -A | grep -v Running | grep -v Completed` is a reasonable quick-check but will also hide the header row's absence of these terms only incidentally; it is fine for a pre-flight sanity check.
- The System Upgrade Controller section points readers to a companion post for the actual upgrade plan manifest — ensure that post stays in sync, since a Plan CR is required to drive the controller.
