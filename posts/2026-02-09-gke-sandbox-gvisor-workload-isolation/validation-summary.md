# Validation Summary: How to Use GKE Sandbox (gVisor) for Untrusted Workload Isolation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine
- GKE Sandbox
- gVisor / runsc
- Kubernetes RuntimeClass
- Kubernetes Pods, Deployments, Jobs, ResourceQuota
- Google Cloud CLI
- Terraform Google provider
- Kaniko

## Sources Consulted
- Google Cloud GKE Sandbox concepts: https://cloud.google.com/kubernetes-engine/docs/concepts/sandbox-pods
- Google Cloud GKE Sandbox configuration guide: https://cloud.google.com/kubernetes-engine/docs/how-to/sandbox-pods
- Google Cloud SDK `gcloud container node-pools create` reference: https://cloud.google.com/sdk/gcloud/reference/container/node-pools/create
- HashiCorp Terraform Google provider `google_container_cluster` / `google_container_node_pool` docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster
- gVisor platform guide: https://gvisor.dev/docs/architecture_guide/platforms/
- gVisor production guide: https://gvisor.dev/docs/user_guide/production/
- gVisor Docker quick start verification note: https://gvisor.dev/docs/user_guide/quick_start/docker/
- gVisor observability guide: https://gvisor.dev/docs/user_guide/observability/

## Issues Found
- The post gave a fixed 10-30 percent performance overhead. I changed this to workload-dependent overhead, because official GKE and gVisor guidance describes performance tradeoffs by workload type rather than a fixed range.
- The `gcloud container node-pools create` example did not set `--image-type=cos_containerd`. I added it because GKE Sandbox requires the Container-Optimized OS with containerd node image.
- The Terraform example created only a sandbox-enabled node pool after removing the default node pool. I added a non-sandbox `system_pool`, because GKE Standard clusters using GKE Sandbox must retain at least one non-sandbox node pool.
- The Terraform sandbox block used the deprecated `sandbox_type = "gvisor"` field. I updated it to `type = "GVISOR"` for the current Google provider schema.
- The verification section relied on `dmesg` output from inside the sandbox. I changed the primary verification to read `.spec.runtimeClassName` from the Kubernetes API, which Google documents as the trustworthy verification method.
- The compatibility section missed documented GKE Sandbox incompatibilities. I added HostPath volumes and privileged containers, and removed the unsupported generalization about IPv6.
- The performance tuning section showed `--sandbox type=gvisor,platform=ptrace` and claimed a KVM default. I removed that command because the current GKE `--sandbox` flag only supports `type=gvisor`, and gVisor's current default platform outside GKE is systrap rather than ptrace or KVM.
- The CI/CD Docker socket example used a HostPath volume, which is incompatible with GKE Sandbox and weakens isolation. I replaced it with a self-contained sandboxed job and retained Kaniko as the image-build recommendation.
- The monitoring section showed a Prometheus `ServiceMonitor` for a non-existent default `app: gvisor` service. I replaced it with the documented Kubernetes API RuntimeClass listing and node log checks.

## Review Notes
The remaining examples use illustrative image names such as `builder:latest`, `myapp:latest`, and `tenant-a/app:latest`. These are acceptable placeholders for a tutorial, but a future production-focused revision should pin images and include registry paths, Workload Identity Federation, and node taints or admission policies to keep untrusted workloads on sandbox-enabled nodes.
