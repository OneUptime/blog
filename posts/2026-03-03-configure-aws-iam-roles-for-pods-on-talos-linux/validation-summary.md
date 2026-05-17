# Validation Summary: How to Configure AWS IAM Roles for Pods on Talos Linux

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Talos Linux (machine config patching, `talosctl`)
- Kubernetes (`kubectl`, service accounts, projected tokens, OIDC discovery)
- AWS IAM (OIDC identity providers, `sts:AssumeRoleWithWebIdentity`, trust policies)
- AWS STS (web-identity token exchange)
- AWS S3 (public hosting of OIDC discovery + JWKS)
- AWS CLI
- Amazon EKS Pod Identity Webhook
- cert-manager (added as a prerequisite for the webhook)
- IRSA (IAM Roles for Service Accounts) flow

## Sources Consulted
- AWS IAM OIDC IdP thumbprint docs: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc_verify-thumbprint.html
- AWS S3 Block Public Access docs: https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html
- AWS S3 Object Ownership (ACL-disabled default since April 2023): https://docs.aws.amazon.com/AmazonS3/latest/userguide/about-object-ownership.html
- aws/eks-charts repository contents: https://github.com/aws/eks-charts/tree/master/stable
- aws/amazon-eks-pod-identity-webhook upstream repo + SELF_HOSTED_SETUP: https://github.com/aws/amazon-eks-pod-identity-webhook and https://github.com/aws/amazon-eks-pod-identity-webhook/blob/master/SELF_HOSTED_SETUP.md
- Talos v1alpha1 config reference (`cluster.apiServer.extraArgs`): https://www.talos.dev/v1.9/reference/configuration/v1alpha1/config/
- Talos `talosctl patch` reference: https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/system-configuration/patching
- Kubernetes OIDC discovery KEP-1393 / `--service-account-jwks-uri`: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/

## Issues Found

1. **Pod Identity Webhook helm chart does not exist (fixed).** The post instructed `helm repo add eks https://aws.github.io/eks-charts` and `helm install ... eks/amazon-eks-pod-identity-webhook`. The `aws/eks-charts` repository does not publish an `amazon-eks-pod-identity-webhook` chart — AWS only documents kustomize/manifest installs from the upstream `aws/amazon-eks-pod-identity-webhook` repo, and the webhook requires cert-manager. Replaced the helm steps with `kubectl apply -k github.com/aws/amazon-eks-pod-identity-webhook/deploy` and added a cert-manager install + readiness wait step.

2. **Thumbprint extraction was for the leaf cert, not the intermediate CA (fixed).** The original `openssl s_client ... | openssl x509 -fingerprint` pipeline extracted the fingerprint of the S3 endpoint's leaf certificate. AWS documents that `--thumbprint-list` must be the SHA-1 fingerprint of the *top intermediate CA* that signed the IdP's server certificate. Updated the command to use `-showcerts` and an `awk` filter to select the second certificate in the chain (the intermediate CA), and pinned `-sha1` explicitly. Also added a short note that since July 2023 IAM automatically validates the IdP's root CA against AWS's trusted CA library for S3-hosted JWKS endpoints, so the thumbprint is now effectively cosmetic — but the CLI parameter is still required.

3. **S3 public hosting step was incomplete (fixed).** The original instructions only disabled the bucket's public access block. Since April 2023, new S3 buckets default to "Bucket owner enforced" object ownership, which disables ACLs entirely; `--acl public-read` is silently ignored, and removing the public-access-block alone does not grant anonymous read. Without an explicit bucket policy, requests to `/.well-known/openid-configuration` and `/openid/v1/jwks` would return 403 and IAM OIDC verification would fail. Added a `put-bucket-policy` step that grants `s3:GetObject` to `Principal: "*"` on the two specific discovery object paths.

## Review Notes
- The Talos config path `cluster.apiServer.extraArgs` and the `talosctl patch machineconfig --patch @file.yaml --nodes <ip>` syntax are correct.
- The Kubernetes `--service-account-issuer` and `--service-account-jwks-uri` kube-apiserver flags used in the patch are correct and well-supported in current Kubernetes versions.
- The IAM trust policy condition keys (`<provider>:sub` and `<provider>:aud`) and the `system:serviceaccount:<ns>:<sa>` subject format are correct.
- The bucket policy added in the fix scopes anonymous reads to just the two discovery object paths rather than the whole bucket, which is the minimum surface required for IRSA verification.
- cert-manager being a prerequisite for the pod-identity-webhook deployment is an important detail that wasn't in the original post; it is now called out.
- Readers should be aware that publishing the JWKS to S3 means key rotations require re-uploading `openid/v1/jwks` after rotating the service account signing key on the control plane — a caveat that is implicit but not stated.
