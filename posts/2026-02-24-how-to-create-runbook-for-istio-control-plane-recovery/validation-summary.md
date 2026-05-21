# Validation Summary: How to Create Runbook for Istio Control Plane Recovery

## Status
validated

## Post Type
Runbook / Operational guide

## Technologies Covered
- Istio control plane and istiod
- Kubernetes workloads, namespaces, secrets, webhooks, and rollouts
- istioctl diagnostics and installation commands
- Istio sidecar injection, workload certificates, and mesh configuration

## Sources Consulted
- Istio pilot-agent command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio install with istioctl documentation: https://istio.io/latest/docs/setup/install/istioctl/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio plug in CA certificates documentation: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio analyze documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Kubernetes kubectl set resources reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_resources/
- Kubernetes kubectl rollout restart reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/

## Issues Found
- The certificate rotation timing claimed rotation at 80% of a 24-hour lifetime. Istio's current pilot-agent reference documents a default certificate rotation grace-period ratio of 0.5, so the time-sensitivity statement was changed to describe the 24-hour default lifetime and the dependency on existing certificate age without giving an incorrect 80% rotation point.
- The OOM fix used a JSON patch `replace` operation for a memory limit path that may not exist. Replaced it with `kubectl set resources deployment/istiod -c discovery --limits=memory=4Gi`, which is the Kubernetes-supported command for updating container resource limits.
- The CA secret recovery notes implied any missing CA secret could be safely regenerated as self-signed. Updated the wording to distinguish custom `cacerts` from Istio's default self-signed CA secret and to warn that a regenerated trust root may require workload restarts.
- The full reinstallation procedure backed up `envoyfilters` but did not restore them, and backed up `istio-ca-secret` but only restored `cacerts`. Added `envoyfilters` to the restore loop, restored both CA backup files, and changed "all Istio configuration" to "common Istio configuration" because the listed resource set is not exhaustive for all current Istio APIs.
- The split-brain diagnostic used `kubectl exec ... curl` inside `istiod`, which assumes curl is present in the image. Replaced it with `kubectl get --raw` against the pod proxy endpoint through the Kubernetes API server.
- The cluster restore certificate check only handled the `cacerts` secret. Added an `istio-ca-secret` check for clusters using Istio's default self-signed CA.
- The workload restart loop only covered namespaces labeled `istio-injection=enabled`. Added a second loop for revision-labeled namespaces using `istio.io/rev`, which current Istio injection documentation supports.
- The proxy sync validation used `istioctl proxy-status | grep -v SYNCED`, which would also print the header and contradict the comment saying it should return no results. Replaced it with `istioctl proxy-status` and a correct instruction to verify all xDS status columns show `SYNCED`.
- The sidecar injection validation grepped dry-run pod YAML for `sidecar`, which is not the most reliable current Istio check. Replaced it with `istioctl x check-inject` for an injection-enabled namespace.
- The mesh metrics check used `kubectl exec ... curl` inside `istiod`, again assuming curl exists in the container. Replaced it with a `kubectl port-forward` based check and local `curl`.
- The prevention backup command only covered `cacerts`. Added a backup command for `istio-ca-secret` so both custom CA and default self-signed CA deployments are represented.

## Review Notes
The runbook is technically relevant and useful, but several procedures remain environment-dependent. In particular, full recovery should use the original Istio installation values, exact Istio version, and the organization's CA backup process. The "common Istio configuration" backup list is still not exhaustive for every Istio API or Gateway API resource a production cluster may use.
