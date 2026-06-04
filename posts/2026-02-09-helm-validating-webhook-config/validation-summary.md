# Validation Summary: How to Build Helm Charts That Generate K8s ValidatingWebhookConfiguration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Helm
- Kubernetes ValidatingWebhookConfiguration
- Kubernetes admission webhooks
- Kubernetes RBAC and Jobs
- cert-manager Certificate and CA injection
- ingress-nginx kube-webhook-certgen
- Go

## Sources Consulted
- Kubernetes ValidatingWebhookConfiguration API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-webhook-configuration-v1/
- Kubernetes Dynamic Admission Control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes AdmissionReview v1 API reference: https://kubernetes.io/docs/reference/config-api/apiserver-admission.v1
- Helm chart hooks documentation: https://helm.sh/docs/topics/charts_hooks/
- cert-manager Certificate documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager CA injector documentation: https://cert-manager.io/docs/concepts/ca-injector/
- ingress-nginx Helm chart webhook certgen usage: https://github.com/kubernetes/ingress-nginx/tree/main/charts/ingress-nginx
- Kubernetes image registry migration notice: https://kubernetes.io/blog/2023/03/10/image-registry-redirect/
- Go io/ioutil package documentation: https://pkg.go.dev/io/ioutil

## Issues Found
- The webhook service namespace value defaulted to `default`, which could make the ValidatingWebhookConfiguration point at the wrong Service when the Helm release is installed into another namespace. Removed that value and made the webhook clientConfig use `.Release.Namespace`.
- The self-signed certificate flow rendered `caBundle` from a Secret that does not exist during first-install template rendering. Changed self-signed mode to use a post-install/post-upgrade patch job, matching the hook timing documented by Helm and the ingress-nginx certgen pattern.
- The cert generation image used the legacy `k8s.gcr.io` registry and an older tag. Updated it to `registry.k8s.io/ingress-nginx/kube-webhook-certgen:v1.6.9`.
- The patch job needs permission to update cluster-scoped ValidatingWebhookConfiguration resources and needs its hook ServiceAccount/RBAC available during post-install/post-upgrade. Added ClusterRole/ClusterRoleBinding and extended hook annotations for the RBAC resources.
- The Deployment referenced a webhook ServiceAccount that the post never created. Removed the reference so the sample Deployment can run with the namespace default ServiceAccount.
- The cert-manager Certificate used `commonName` for a DNS name. Removed it and kept DNS names in SANs, which is the current cert-manager-recommended form.
- The ValidatingWebhookConfiguration advertised both `v1` and `v1beta1` AdmissionReview versions while the Go sample only returns `admission.k8s.io/v1`. Restricted `admissionReviewVersions` to `["v1"]`.
- The Go sample used deprecated `io/ioutil`. Replaced it with `io.ReadAll`.
- The webhook rules included both Deployments and Pods, but the Go sample only decoded Deployments. Added Pod handling and shared PodSpec validation so registered resources are handled correctly.
- The Go sample could panic on an AdmissionReview with a nil request. Added a nil request check and guarded UID assignment.
- The values file omitted `webhook.image` and `webhook.resources`, even though later templates referenced them. Added minimal defaults.

## Review Notes
- I could not run `gofmt` because `gofmt` is not installed in this environment. The Go sample was reviewed manually for syntax and API correctness.
