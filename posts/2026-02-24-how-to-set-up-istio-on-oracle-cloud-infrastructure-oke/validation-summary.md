# Validation Summary: How to Set Up Istio on Oracle Cloud Infrastructure (OKE)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Oracle Kubernetes Engine (OKE)
- Oracle Cloud Infrastructure (OCI) CLI
- Kubernetes
- Istio
- OCI Load Balancer and Network Load Balancer
- OCI Monitoring

## Sources Consulted
- OCI OKE supported Kubernetes versions: https://docs.oracle.com/en-us/iaas/Content/ContEng/Concepts/contengaboutk8sversions.htm
- OCI CLI cluster create reference: https://docs.oracle.com/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/ce/cluster/create.html
- OCI CLI node pool create reference: https://docs.oracle.com/iaas/tools/oci-cli/latest/oci_cli_docs/cmdref/ce/node-pool/create.html
- OCI OKE load balancer annotations: https://docs.oracle.com/en-us/iaas/Content/ContEng/Tasks/contengcreatingloadbalancer_topic-Summaryofannotations.htm
- OCI OKE load balancer shape annotations: https://docs.oracle.com/en-us/iaas/Content/ContEng/Tasks/contengcreatingloadbalancers-subtopic.htm
- OCI OKE network resource examples: https://docs.oracle.com/en-us/iaas/Content/ContEng/Concepts/contengnetworkconfigexample.htm
- OCI OKE metrics: https://docs.oracle.com/en-us/iaas/Content/ContEng/Reference/contengmetrics.htm
- OCI custom metric publishing: https://docs.oracle.com/iaas/Content/Monitoring/Tasks/publishingcustommetrics.htm
- Istio 1.30 release announcement and Kubernetes compatibility: https://istio.io/latest/news/releases/1.30.x/announcing-1.30/
- Istio download instructions: https://istio.io/latest/docs/setup/additional-setup/download-istio-release/
- Istio install with istioctl: https://istio.io/latest/docs/setup/install/istioctl/
- Istio secure ingress gateway TLS secret documentation: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/

## Issues Found
- The post used OKE Kubernetes `v1.30.1`, which is no longer supported for new OKE clusters. Updated the cluster and node pool examples to `v1.35.2`, which is currently supported by OKE and compatible with Istio 1.30.
- The post installed Istio `1.24.0`, whose support ended in 2025. Updated the install command and directory to Istio `1.30.0`, the current release as of this review.
- The node pool placement example used `AD-1`, which is not the usual public OCI availability domain name format. Replaced it with a placeholder that indicates the user must provide their actual region availability domain name.
- The worker subnet network guidance said to allow load balancer traffic to ports 80 and 443 on worker nodes. OKE load balancers normally reach managed nodes through NodePorts and kube-proxy health checks, so the text and example were corrected to 30000-32767 and 10256 from the load balancer subnet CIDR.
- The TLS section implied an OCI Certificates resource could be referenced directly by Istio `credentialName`. Istio expects a Kubernetes secret for ingress gateway TLS, so the example was changed to create a Kubernetes TLS secret.
- The OCI monitoring agent manifest URL returned 404 and is not a valid install command. Replaced it with accurate guidance: OKE emits `oci_oke` metrics automatically, while Istio metrics require a custom metric pipeline or collector that publishes to OCI Monitoring.

## Review Notes
- The IstioOperator and OCI load balancer annotation snippets match current documentation.
- The security list example still needs users to preserve their existing rules when running `oci network security-list update`; the post now calls this out because the update operation replaces the ingress rule list.
