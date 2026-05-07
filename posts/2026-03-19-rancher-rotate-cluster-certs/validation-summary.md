# Validation Summary: How to Rotate Cluster Certificates in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- RKE (RKE1)
- RKE2
- Kubernetes
- TLS certificates
- Prometheus / Rancher Monitoring

## Sources Consulted
- Rancher certificate rotation docs: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/manage-clusters/rotate-certificates
- Rancher v2.11 certificate rotation docs for RKE1/RKE2 service lists: https://ranchermanager.docs.rancher.com/v2.11/how-to-guides/new-user-guides/manage-clusters/rotate-certificates
- Rancher v3 API guide: https://documentation.suse.com/cloudnative/rancher-manager/v2.8/en/api/v3-rancher-api-guide.html
- Rancher note on RKE1 end-of-life and Rancher 2.12+ support removal: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/upgrade-kubernetes-without-upgrading-rancher
- RKE1 certificate management docs: https://rke.docs.rancher.com/cert-mgmt
- RKE2 certificate management docs: https://docs.rke2.io/security/certificates
- RKE2 metrics docs: https://docs.rke2.io/reference/metrics
- RKE2 CLI tools docs: https://docs.rke2.io/reference/cli_tools
- RKE2 cluster access docs: https://docs.rke2.io/cluster_access
- Official Rancher source for the `rotateCertificates` action and input schema:
  https://github.com/rancher/rancher/blob/main/pkg/schemas/management.cattle.io/v3/schema.go
  https://github.com/rancher/rancher/blob/main/pkg/apis/management.cattle.io/v3/cluster_types.go

## Issues Found
- The original `kubectl` example inspected the `extension-apiserver-authentication` ConfigMap CA bundle, which is not the API server certificate. I replaced it with an RKE2 certificate warning event check and kept node-level certificate inspection commands for exact expiration dates.
- The original RKE2 section said restart-based rotation happened within 90 days of expiry. Current RKE2 certificate management docs say certificates are automatically renewed on restart when expired or within 120 days of expiry; 90 days applies only to older releases. I corrected the version-sensitive explanation.
- The original “force rotation” workflow deleted `dynamic-cert.json`. That is not the documented RKE2 certificate rotation procedure. I replaced it with the supported `rke2 certificate rotate` workflow.
- The original manual etcd guidance deleted files under `/var/lib/rancher/rke2/server/tls/etcd`. The documented procedure is `rke2 certificate rotate --service etcd`. I updated the commands accordingly.
- The Rancher API example used a Bearer token header. The official v3 API guide documents HTTP basic authentication with API keys. I corrected the auth pattern and added a note to follow the action URL exposed in the cluster resource’s `actions` map.
- The original verification commands assumed specific RKE2 certificate file paths for etcd and kubelet. I replaced those checks with the documented `rke2 certificate check --output table` command and retained API health checks.
- The original monitoring rule used the Kubernetes API server client certificate expiration histogram, which does not directly represent RKE2’s cluster certificate inventory. I replaced it with the RKE2-specific `rke2_certificate_expiration_seconds` metric and noted the `supervisor-metrics: true` prerequisite.
- The original kubeconfig guidance said Rancher users should always download a new kubeconfig after certificate rotation. That overstates the requirement. I narrowed the guidance to node-generated RKE2 admin kubeconfigs after `admin` certificate or CA rotation.
- The original post treated RKE1 as a normal current-path option without caveat. I added the current support note that RKE1 is end-of-life and Rancher 2.12.0+ no longer manage downstream RKE1 clusters.
- The Rancher UI steps used `Rotate` as the final action button. The documented UI flow uses `Save`. I corrected the wording.

## Review Notes
- The dedicated RKE2 certificate management page and the more general RKE2 advanced configuration page are inconsistent on the restart-renewal threshold. The certificate management page is the more specific source and reflects the current 120-day behavior, with 90 days applying to older releases.
- The post remains technically relevant after correction, but its RKE1 guidance is only applicable to older Rancher deployments that still manage downstream RKE1 clusters.
