# Validation Summary: How to Set Up Istio on IBM Cloud Kubernetes Service

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IBM Cloud Kubernetes Service (IKS)
- IBM Cloud CLI and Kubernetes Service plug-in
- IBM Cloud VPC networking and load balancers
- Kubernetes
- Istio and istioctl
- IBM Cloud Logs
- IBM Cloud Monitoring / Sysdig agent
- IBM Cloud Secrets Manager
- Helm

## Sources Consulted
- IBM Cloud Kubernetes Service CLI installation docs: https://cloud.ibm.com/docs/containers?topic=containers-cli-install
- IBM Cloud VPC cluster creation docs: https://cloud.ibm.com/docs/containers?topic=containers-cluster-create-vpc-gen2
- IBM Cloud Kubernetes version information: https://cloud.ibm.com/docs/containers?topic=containers-cs_versions
- IBM Cloud VPC load balancer docs: https://cloud.ibm.com/docs/containers?topic=containers-vpclb-about
- IBM Cloud Logs for IKS docs: https://cloud.ibm.com/docs/containers?topic=containers-logging
- IBM Cloud Logs agent deployment docs: https://cloud.ibm.com/docs/cloud-logs?topic=cloud-logs-kube2logs
- IBM Cloud Monitoring Kubernetes agent docs: https://cloud.ibm.com/docs/monitoring?topic=monitoring-kubernetes_cluster
- IBM Cloud Secrets Manager certificate docs: https://cloud.ibm.com/docs/secrets-manager?topic=secrets-manager-certificates
- Istio install with istioctl docs: https://istio.io/latest/docs/setup/install/istioctl/
- Istio installation compatibility docs: https://istio.io/latest/docs/setup/install/
- Istio gateway installation docs: https://istio.io/latest/docs/setup/additional-setup/gateway/

## Issues Found
- The post said the IBM managed Istio add-on had been deprecated. IBM Cloud still documents a managed Istio add-on, so the introduction now says IKS offers a managed add-on and clarifies that this guide installs upstream Istio manually.
- The IBM Cloud Kubernetes Service plug-in install command used `kubernetes-service`. IBM's current docs use `ibmcloud plugin install ks`, so the command was updated.
- The login setup did not target the `us-south` region before creating `us-south-1` VPC resources. Added `ibmcloud target -r us-south`.
- The cluster example used Kubernetes `1.30`, which is no longer a supported IKS version as of May 21, 2026. Updated the example to `1.34`, a current supported default version.
- The Istio example used `istio-1.24.0`, which is outside the current Istio compatibility range. Updated the directory to `istio-1.29.2`, matching the current Istio documentation checked during review.
- The VPC load balancer annotations were left unquoted and the post did not mention that VPC NLB services return an IP instead of the default VPC ALB hostname. Quoted the annotation values and added a note about using `.status.loadBalancer.ingress[0].ip` for NLB.
- The logging section referenced deprecated IBM Log Analysis and used an invalid `ibmcloud ks logging config create --type ibm` example. Replaced it with IBM Cloud Logs and the documented Helm-based logging agent flow.
- The monitoring section used `ibmcloud ks observe monitoring config create`, which is not in the current documented flow. Replaced it with the documented Sysdig Helm chart installation pattern.
- The TLS section referenced IBM Cloud Certificate Manager. Current IBM Cloud certificate storage guidance is through IBM Cloud Secrets Manager, so the section was updated.
- The multi-zone section described the shown `DestinationRule` as locality-aware routing. The snippet configures traffic policy features such as outlier detection, so the sentence was corrected.

## Review Notes
The post is now technically accurate for the current IBM Cloud and Istio documentation reviewed on May 21, 2026. For production use, the guide could later add more detail on creating `logs-values.yaml`, obtaining IBM Cloud Logs ingestion endpoints, and choosing between VPC ALB and per-zone VPC NLB designs, but those are expansion opportunities rather than correctness blockers.
