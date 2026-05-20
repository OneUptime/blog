# Validation Summary: How to Use ArgoCD with IBM Cloud Kubernetes Service

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- IBM Cloud Kubernetes Service
- IBM Cloud Container Registry
- IBM Cloud Secrets Manager
- External Secrets Operator
- IBM Cloud VPC load balancers
- Kubernetes Ingress
- Helm OCI registries

## Sources Consulted
- IBM Cloud Docs: VPC load balancers for IBM Cloud Kubernetes Service, https://cloud.ibm.com/docs/containers?topic=containers-vpclb-about
- IBM Cloud Docs: Setting up an Application Load Balancer for VPC, https://cloud.ibm.com/docs/containers?topic=containers-setup_vpc_alb
- IBM Cloud Docs: Setting up Ingress, https://cloud.ibm.com/docs/containers?topic=containers-managed-ingress-setup
- IBM Cloud Docs: Setting up an image registry for IBM Cloud Kubernetes Service, https://cloud.ibm.com/docs/containers?topic=containers-registry
- IBM Cloud Docs: Container Registry CLI, https://cloud.ibm.com/docs/Registry?topic=Registry-containerregcli
- IBM Cloud Docs: Accessing Container Registry, https://cloud.ibm.com/docs/Registry?topic=Registry-registry_access
- External Secrets Operator Docs: IBM Secrets Manager provider, https://external-secrets.io/latest/provider/ibm-secrets-manager/
- External Secrets Operator Docs: API specification, https://external-secrets.io/latest/api/spec/
- Argo CD Docs: declarative setup and repository secrets, https://argo-cd.readthedocs.io/
- Kubernetes Docs: Services, Ingress, Secrets, and kubectl usage, https://kubernetes.io/docs/
- Helm Docs: OCI registries, https://helm.sh/docs/topics/registries/

## Issues Found
- Removed the VPC load balancer `proxy-protocol` annotation from the Argo CD Service example. IBM documents this annotation as optional and notes that back-end applications must be configured to accept PROXY protocol; the post did not configure Argo CD for that.
- Corrected the Classic cluster ingress description from "Cloudflare-based Ingress ALBs" to IBM-provided NGINX Ingress ALBs, matching IBM's documented `public-iks-k8s-nginx` and `private-iks-k8s-nginx` classes.
- Updated the IBM Cloud Container Registry pull secret copy command to use `kubectl create -n my-app -f -`, matching IBM's documented copy pattern.
- Changed the Argo CD ICR Helm repository URL from `us.icr.io/my-namespace` to `us.icr.io/my-charts` so it matches the namespace created and used by the Helm push example.
- Updated External Secrets Operator examples from `external-secrets.io/v1beta1` and chart `0.9.x` to the current `external-secrets.io/v1` API and `2.x` chart series.
- Corrected the IBM Cloud Secrets Manager `serviceUrl` to use the instance-specific endpoint format `https://<SECRETS_MANAGER_ID>.<REGION>.secrets-manager.appdomain.cloud`.
- Corrected IBM Secrets Manager `ExternalSecret` remote references to use `arbitrary/<SECRET_ID>` without a `payload` property, which matches the IBM provider's documented arbitrary secret format.
- Corrected the troubleshooting note that claimed VPC load balancers require worker subnets with public gateways. IBM documents that public gateways are not required for inbound public VPC load balancer traffic, but are required when workloads need public egress.

## Review Notes
The post is technically relevant and generally accurate after the corrections. The sample commands still use placeholder cluster, namespace, and secret values, so readers must substitute their own IBM Cloud resources before applying them.
