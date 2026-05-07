# Validation Summary: How to Configure Admission Controllers in Rancher

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Rancher
- Kubernetes
- RKE2
- RKE1 (legacy)
- Admission controllers
- Admission webhooks
- ResourceQuota
- LimitRange
- kubectl

## Sources Consulted
- Kubernetes Admission Control in Kubernetes: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes Dynamic Admission Control: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes API Concepts: https://kubernetes.io/docs/reference/using-api/api-concepts/
- kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 CIS 1.7 Self-Assessment Guide: https://docs.rke2.io/security/cis_self_assessment17
- Rancher RKE Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/v2.14/reference-guides/cluster-configuration/rancher-server-configuration/rke1-cluster-configuration
- RKE1 Default Kubernetes Services: https://rke.docs.rancher.com/config-options/services
- RKE1 Extra Args, Extra Binds, and Extra Environment Variables: https://rke.docs.rancher.com/config-options/services/services-extras
- Rancher Cluster API Overview: https://ranchermanager.docs.rancher.com/v2.11/integrations-in-rancher/cluster-api/overview

## Issues Found
- The post described RKE2 defaults as a fixed list and used `PodSecurityAdmission` as a plugin name. I corrected this to reflect that RKE2 explicitly sets `NodeRestriction`, Kubernetes default plugins vary by release, and the plugin name is `PodSecurity`.
- The RKE2 `enable-admission-plugins` example incorrectly repeated a partial default plugin list. I replaced it with an override that preserves `NodeRestriction` and adds only the extra plugins being enabled.
- The RKE1 section needed a current support caveat and safer guidance for `extra_args`. I updated it to note that RKE1 is legacy/EOL for current Rancher releases and that overriding `enable-admission-plugins` requires including the full default list for the target Kubernetes version.
- The mutating webhook example registered a `label-injector` service without stating that the backing Deployment and Service must already exist. I added that requirement.
- Step 7 referred to both `ResourceQuota` and `LimitRange` as if they were only `ResourceQuota` admission-controller configuration. I retitled and clarified the section to match what the manifests actually configure.
- The ResourceQuota test used `kubectl run --limits`, which is not a current `kubectl run` flag. I replaced it with a valid Pod manifest applied through `kubectl apply -f -`.
- The AlwaysPullImages test used `nginx` without a tag, which already defaults to `imagePullPolicy: Always` even without the admission controller. I changed the test image to a non-`latest` tag so the test demonstrates the controller correctly.
- Step 5 said it was creating a webhook service even though the manifest creates both a Deployment and a Service. I corrected the wording.

## Review Notes
- Kubernetes default admission plugin sets change across Kubernetes releases. Version-specific examples should be checked against the exact kube-apiserver version in use.
- RKE1 is end-of-life and Rancher 2.12+ no longer supports provisioning or managing downstream RKE1 clusters, so RKE2 is the current default path for Rancher-managed clusters.
