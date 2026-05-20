# Validation Summary: How to Use ArgoCD with Linode Kubernetes Engine

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Linode Kubernetes Engine (LKE)
- Linode NodeBalancers
- Linode Block Storage CSI
- ingress-nginx
- cert-manager
- Let's Encrypt ACME HTTP-01
- Linode CLI
- s3cmd / S3-compatible Object Storage

## Sources Consulted
- Akamai TechDocs: Load balancing on LKE - https://techdocs.akamai.com/cloud-computing/docs/get-started-with-load-balancing-on-an-lke-cluster
- Akamai TechDocs: LKE CLI commands - https://techdocs.akamai.com/cloud-computing/docs/cli-commands-for-lke
- Akamai Linode API Reference: Create a Kubernetes cluster - https://techdocs.akamai.com/linode-api/reference/post-lke-cluster
- Akamai Linode API Reference: Update a node pool - https://techdocs.akamai.com/linode-api/reference/put-lke-node-pool-1
- Akamai TechDocs: Manage nodes and node pools - https://techdocs.akamai.com/cloud-computing/docs/manage-nodes-and-node-pools
- Akamai TechDocs: Block Storage - https://techdocs.akamai.com/cloud-computing/docs/block-storage
- Akamai TechDocs: Drain a node pool on LKE - https://techdocs.akamai.com/cloud-computing/docs/drain-a-node-pool-on-lke-cluster
- Akamai TechDocs: Get started with Object Storage - https://techdocs.akamai.com/cloud-computing/docs/getting-started-with-object-storage
- Argo CD documentation: Ingress configuration - https://argo-cd.readthedocs.io/en/release-3.2/operator-manual/ingress/
- Argo CD documentation: Private repositories - https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- ingress-nginx documentation: TLS/HTTPS and SSL passthrough - https://kubernetes.github.io/ingress-nginx/user-guide/tls/
- ingress-nginx documentation: Annotations - https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx documentation: Command line arguments - https://kubernetes.github.io/ingress-nginx/user-guide/cli-arguments/
- cert-manager documentation: Helm installation - https://cert-manager.io/v1.14-docs/installation/helm/
- cert-manager documentation: ACME HTTP-01 solver - https://cert-manager.io/docs/configuration/acme/http01/

## Issues Found
- The LKE cluster creation example used Kubernetes `1.29`, which is stale relative to current Akamai examples. Changed it to `1.33`, matching the current Akamai Linode API cluster creation sample.
- The direct NodeBalancer service example configured `protocol: "https"` with a TLS secret while forwarding to Argo CD's server port. Linode HTTPS mode terminates TLS at the NodeBalancer and forwards unencrypted traffic, while Argo CD's default server expects TLS on its HTTPS service. Changed the NodeBalancer port annotation to TCP passthrough.
- The ingress-nginx Application used `service.beta.kubernetes.io/linode-loadbalancer-proxy-protocol`, but Linode CCM documents the annotation suffix as `default-proxy-protocol`. Updated the annotation key.
- The ingress-nginx example used `ssl-passthrough` on the Argo CD Ingress but did not enable SSL passthrough on the controller. Added `extraArgs.enable-ssl-passthrough: "true"`, as required by ingress-nginx and Argo CD documentation.
- The ingress-nginx service enabled Proxy Protocol but did not configure ingress-nginx to consume it. Added `controller.config.use-proxy-protocol: "true"`.
- The cert-manager HTTP-01 ClusterIssuer used the legacy `class` field. Updated it to `ingressClassName`, which cert-manager recommends for modern ingress controllers.

## Review Notes
- The post remains technically relevant and was validated after targeted corrections.
- The `cert-manager` chart pin `v1.14.x` is valid for that documentation set, but future maintenance should consider updating the chart version and CRD management approach.
- ingress-nginx is now documented as retired after March 2026; existing deployments and artifacts remain available, but future revisions should consider mentioning Gateway API or another maintained ingress controller.
