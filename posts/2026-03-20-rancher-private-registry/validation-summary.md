# Validation Summary: How to Configure a Private Registry in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Kubernetes
- RKE2
- Container registries
- `kubectl`
- Kubernetes Secrets and `imagePullSecrets`

## Sources Consulted
- SUSE Rancher Manager v2.13, Kubernetes Registry and Container Image Registry: https://documentation.suse.com/cloudnative/rancher-manager/v2.13/en/cluster-admin/kubernetes-resources/kubernetes-and-docker-registries.html
- SUSE Rancher Manager v2.13, Configuring a Global Default Private Registry: https://documentation.suse.com/cloudnative/rancher-manager/v2.13/en/rancher-admin/global-configuration/global-default-private-registry.html
- SUSE Rancher Manager v2.10, Secrets: https://documentation.suse.com/cloudnative/rancher-manager/v2.10/en/security/secrets-hub.html
- RKE2, Private Registry Configuration: https://docs.rke2.io/install/private_registry
- Kubernetes, Pull an Image from a Private Registry: https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/
- Kubernetes, Configure Service Accounts for Pods: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- Kubernetes, `kubectl create secret docker-registry` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry
- Kubernetes, `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The Rancher UI flow in Step 1 was outdated. The original post described project navigation and a `Secrets > Registry Credentials` flow that does not match current Rancher v2.6+ behavior. I updated it to the documented namespace-scoped flow under **Cluster Management** > **Explore** > **Secrets** > **Create** > **Registry**, and added the note that project-scoped registries require the `legacy` feature flag.
- The explanation of Rancher registry scope was inaccurate. The original text implied Rancher manages these registry credentials broadly at the cluster/project level. I corrected it to reflect current Rancher behavior: namespace-scoped registry secrets are the default, and workloads created with `kubectl` must still reference the secret explicitly.
- The Step 4 default-registry guidance was technically incorrect for authenticated registries. The original post said to use **Edit Config** to set a private registry URL and credentials as a default registry, which is not how Rancher documents this today. I changed the section to use the documented `system-default-registry` global setting for unauthenticated default registries and noted that authenticated cluster-scoped registry configuration is done during cluster creation.
- The RKE2 configuration snippet in Step 4 used an incorrect schema. The original `provisioning.cattle.io/v1` example contained fields such as `authConfigSecretName`, `insecureSkipVerify`, and `endpoints`, which do not match the documented RKE2 private registry configuration format. I replaced it with a valid `/etc/rancher/rke2/registries.yaml` example using `mirrors`, `endpoint`, `configs`, `auth`, and `tls.insecure_skip_verify`.
- The ServiceAccount inheritance statement in Step 5 overstated the behavior. I clarified that new pods using the default ServiceAccount inherit the registry secret unless they explicitly define their own `imagePullSecrets`.
- The troubleshooting `kubectl run` example omitted the namespace, which could cause the test pod to run outside the namespace where the secret exists. I added `-n my-namespace` and included `apiVersion` in the inline override for a more explicit `kubectl run` example.

## Review Notes
- The post is now technically accurate for Rancher behavior documented as of April 23, 2026.
- Rancher UI labels can vary slightly by release, but the updated navigation matches the current SUSE Rancher Manager documentation and the namespace-scoped registry model introduced in Rancher v2.6.
- `kubectl` was not installed in the review environment, so command syntax was verified against the official Kubernetes reference pages instead of local `--help` output.
