# Validation Summary: How to Configure Per-Cluster Registry Access in Portainer for Kubernetes (2)

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer Business Edition
- Kubernetes
- `kubectl`
- Kubernetes Secrets and `imagePullSecrets`
- Kubernetes ServiceAccounts
- Container registries
- Amazon ECR
- Amazon EKS

## Sources Consulted
- Portainer Kubernetes cluster registries: https://docs.portainer.io/sts/user/kubernetes/cluster/registries
- Portainer Kubernetes registry policy: https://docs.portainer.io/admin/environments/policies/kubernetes-policies/kubernetes-registry-policy
- Portainer Kubernetes application form: https://docs.portainer.io/sts/user/kubernetes/applications/add
- Portainer AWS ECR registry setup: https://docs.portainer.io/admin/registries/add/ecr
- Kubernetes `kubectl create secret docker-registry`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Kubernetes private registry image pulls: https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/
- Kubernetes service accounts and `imagePullSecrets`: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- Kubernetes Secret types: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes kubelet image credential providers: https://kubernetes.io/docs/tasks/administer-cluster/kubelet-credential-provider/
- Amazon ECR private registry authentication: https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- Amazon ECR images with Amazon EKS: https://docs.aws.amazon.com/AmazonECR/latest/userguide/ECR_on_EKS.html
- AWS CLI `sts get-caller-identity`: https://docs.aws.amazon.com/en_us/cli/latest/reference/sts/get-caller-identity.html

## Issues Found
- The Portainer navigation and access model in Step 2 were inaccurate. The post originally described a cluster-level allow list under `Settings -> Environments`, but Portainer's documented Kubernetes workflow is `Cluster -> Registries`, where access is managed per registry and assigned to namespaces within the selected environment. I corrected the instructions and example to match the official UI and behavior.
- The introduction and conclusion overstated enforcement. Registry access in Portainer controls which configured registries are available in the selected Kubernetes environment and namespace, but enforcement of approved image sources requires a Kubernetes registry policy with `Restrict sources`. I revised that wording to avoid claiming stronger enforcement than the product actually provides by default.
- The note about automatic secret creation was too vague. Portainer documents that when registry access is added to a namespace, it creates a registry secret and adds it to the namespace's default ServiceAccount as an `imagePullSecret`. I updated the post to describe that behavior accurately.
- The sample `Deployment` manifest in Step 4 was invalid for `apps/v1` because it omitted `.spec.selector` and matching pod labels. I added the required selector and labels so the manifest is valid Kubernetes configuration.
- The base64 command in Step 5 used GNU-specific `base64 -w0`, which is not portable across common environments. I replaced it with `base64 < /tmp/dockerconfig.json | tr -d '\n'` so the example works more broadly.
- The ECR section mixed outdated guidance with an incomplete example. The original text suggested `aws-ecr-credential-helper` for Kubernetes pulls and used an undefined `AWS_ACCOUNT` variable in the sample. I updated the section to reflect current AWS guidance: on EKS, prefer node IAM or Fargate execution roles; when using a Secret-based flow, refresh the ECR-backed `docker-registry` Secret before the 12-hour token expiry. The example now derives the account ID explicitly and uses valid AWS CLI and `kubectl` commands.
- The verification section implied the registry dropdown alone enforces allowed image sources. Portainer's application form still allows manual image entry through Advanced mode unless a registry policy is used. I clarified that distinction and pointed readers to `Restrict sources` when they need enforcement.

## Review Notes
- Portainer's stronger enforcement path relies on Kubernetes registry policies and `ValidatingAdmissionPolicy`; Portainer documents that `Restrict sources` requires Kubernetes 1.30 or later.
- Kubernetes also supports kubelet image credential provider plugins, which can be preferable to long-lived image pull secrets on clusters where node-level credential providers are available.
