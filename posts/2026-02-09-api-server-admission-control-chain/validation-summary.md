# Validation Summary: How to Configure API Server Admission Control Chain Order and Plugins

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes API server
- Kubernetes admission controllers
- kubeadm configuration
- Admission webhooks
- Pod Security Admission
- Prometheus metrics

## Sources Consulted
- Kubernetes Admission Control documentation: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes Admission Webhook Good Practices: https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/
- Kubernetes MutatingWebhookConfiguration API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/mutating-webhook-configuration-v1/
- Kubernetes kubeadm v1beta4 configuration API reference: https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta4/
- Kubernetes kubeadm control plane customization documentation: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/control-plane-flags/
- Kubernetes kube-apiserver configuration API reference: https://kubernetes.io/docs/reference/config-api/apiserver-config.v1/
- Kubernetes PodSecurityPolicy removal documentation: https://kubernetes.io/docs/concepts/security/pod-security-policy/
- Kubernetes Pod Security Admission documentation: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics/

## Issues Found
- The kubeadm configuration examples used `kubeadm.k8s.io/v1beta3` with map-style `extraArgs`. Updated them to `kubeadm.k8s.io/v1beta4` and list-style `extraArgs`, which is the current kubeadm configuration format.
- The production admission plugin list included `PodSecurityPolicy`, which was deprecated in Kubernetes 1.21 and removed in Kubernetes 1.25. Replaced it with `PodSecurity` and added current default admission plugins that were missing, including `DefaultIngressClass` and `ValidatingAdmissionPolicy`.
- The example enabled plugin output still showed `PodSecurityPolicy`. Updated it to `PodSecurity`.
- The NodeRestriction section incorrectly implied that NodeRestriction controls kubelet access to Secrets and ConfigMaps. Removed that claim and replaced it with behavior documented for NodeRestriction: limiting kubelet changes to node and pod objects, including taint restrictions.
- The execution order section listed a specific order for built-in mutating and validating plugins that Kubernetes documentation does not present as configurable user-facing behavior. Rewrote the section to accurately describe the phase order, sequential mutating webhook calls, parallel validating webhook calls, and the warning not to rely on mutating webhook invocation order.
- The kubeadm admission config volume example was missing `pathType` and used the old `extraArgs` format. Updated the snippet to match the current kubeadm API.

## Review Notes
The post is technically relevant and contains substantial implementation detail. The remaining PSP subsection is acceptable because it is explicitly framed for older clusters and states that PSP was removed in Kubernetes 1.25.
