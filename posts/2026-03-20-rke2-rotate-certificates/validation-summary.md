# Validation Summary: How to Rotate RKE2 Certificates - Rotate Certificates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RKE2
- Kubernetes
- TLS certificates
- RKE2 certificate CLI
- systemd
- kubectl
- etcd / etcdctl
- cron

## Sources Consulted
- RKE2 Certificate Management documentation: https://docs.rke2.io/security/certificates
- RKE2 Advanced Options and Configuration documentation: https://docs.rke2.io/advanced
- RKE2 Cluster Access documentation: https://docs.rke2.io/cluster_access
- RKE2 CLI Tools documentation: https://docs.rke2.io/reference/cli_tools
- RKE2 CIS Self-Assessment Guide, etcd certificate path examples: https://docs.rke2.io/security/cis_self_assessment110
- Kubernetes `kubectl config set-cluster` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_set-cluster/

## Issues Found
- The introduction said RKE2 certificates expire after one year by default. Updated it to specify that RKE2 client and server certificates are valid for 365 days, while RKE2-generated CA certificates are valid for 10 years and are not automatically renewed.
- The expiry-check section used direct OpenSSL loops as the primary way to check all certificates. Added the current official `rke2 certificate check --output table` command and clarified that the direct `openssl` commands inspect certificate files and CA certificates.
- The automatic renewal section said RKE2 rotates certificates within 90 days of expiry. Updated it to the current 120-day renewal window, added the May 2025 version caveat for older 90-day behavior, and clarified that automatic renewal extends existing certificates while reusing keys.
- The automatic renewal verification checked `server-ca.crt`, which is a CA certificate and is not automatically renewed. Replaced it with `rke2 certificate check --output table`.
- The forced rotation sequence rotated only the primary server node after stopping all servers. Updated the snippet to run stop, `rke2 certificate rotate`, start, and readiness verification on each server node.
- The API server service example used the invalid service name `kube-apiserver`. Changed it to the documented RKE2 service name `api-server`.
- The agent-node section described an agent restart as certificate rotation. Updated the wording to renewal, matching the RKE2 documentation that agent certificates are renewed when `rke2-agent` starts.
- The final verification loop only checked top-level server TLS files. Replaced it with `rke2 certificate check --output table`.
- The scheduling example described a periodic restart as certificate rotation and ran every six months, which would not necessarily enter the automatic renewal window. Updated it to a monthly restart for automatic renewal checks and corrected the wording.
- Added `mkdir -p ~/.kube` before copying the refreshed kubeconfig so the command works on systems where the default kubeconfig directory does not already exist.

## Review Notes
- Manual `rke2 certificate rotate` rotates RKE2 client and server certificates. CA certificate rotation is a separate `rke2 certificate rotate-ca` workflow and remains outside this post.
- The RKE2 Certificate Management page is more specific than the generic Advanced Options page for the current renewal window; the post now follows the version-gated Certificate Management guidance.
- For RKE2 releases before the January 2025 release lines called out in the docs, manual certificate rotation had a stricter order requirement: etcd servers, control-plane servers, then agents.
