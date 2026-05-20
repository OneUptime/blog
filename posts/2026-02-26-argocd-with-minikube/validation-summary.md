# Validation Summary: How to Use ArgoCD with Minikube

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD
- Kubernetes
- Minikube
- kubectl
- Helm
- Bitnami Helm charts
- NGINX Ingress

## Sources Consulted
- Argo CD installation documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/installation/
- Argo CD getting started documentation: https://argo-cd.readthedocs.io/en/release-3.4/getting_started/
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD OCI documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/oci/
- Argo CD CLI command references for login, initial-password, and cluster add: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_login/, https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_initial-password/, https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster/
- Argo CD reconciliation/FAQ documentation: https://argo-cd.readthedocs.io/en/latest/faq/
- Minikube access documentation: https://minikube.sigs.k8s.io/docs/handbook/accessing/
- Minikube service command reference: https://minikube.sigs.k8s.io/docs/commands/service/
- Minikube drivers documentation: https://minikube.sigs.k8s.io/docs/drivers/
- Minikube Docker driver documentation: https://minikube.sigs.k8s.io/docs/drivers/docker/
- Minikube registry documentation: https://minikube.sigs.k8s.io/docs/handbook/registry/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Bitnami NGINX Helm chart on Artifact Hub: https://artifacthub.io/packages/helm/bitnami/nginx
- Bitnami charts repository: https://github.com/bitnami/charts

## Issues Found
- The `minikube service argocd-server` option assumed the service had a NodePort. The standard Argo CD install creates `argocd-server` as a ClusterIP service, so I added a patch command to change it to `NodePort` before using `minikube service`.
- The ingress example included `nginx.ingress.kubernetes.io/ssl-passthrough` without enabling SSL passthrough on the ingress-nginx controller. I removed that annotation and kept `backend-protocol: "HTTPS"`, which is enough for the UI example.
- The ingress option did not mention that the Minikube ingress addon with the Docker driver is Linux-only. I added the Minikube-specific caveat and directed Docker Desktop users to port-forwarding or `minikube tunnel`.
- The Argo CD CLI login example used `localhost:8080` without context. I clarified that this login command applies when using the port-forwarding option.
- The registry addon snippet implied the ClusterIP was for pushing images to the registry. I changed the wording to clarify that the ClusterIP is for in-cluster pulls.
- The Helm chart example used the old Bitnami HTTP Helm repository and an outdated chart version. I updated it to Argo CD's documented OCI-style Bitnami repository URL and the current Bitnami NGINX chart version checked during review.

## Review Notes
The Kubernetes manifests use current API versions, and the Argo CD `Application` examples use valid fields. The fixed Bitnami chart version is current as of this review date; future reviews should re-check the latest available chart version because Helm chart versions change frequently.
