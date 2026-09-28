# Validation Summary: How to Delete EFS Access Points and Their Data When Kubernetes PVCs Are Removed

## Status
validated

## Post Type
Technical guide with configuration and operational verification commands.

## Technologies Covered
- Amazon EFS access points, filesystem directories, IAM authorization, and NFS networking
- Kubernetes PersistentVolumes, PersistentVolumeClaims, StorageClasses, protection, and reclamation
- AWS EFS CSI driver v3.5.0 and external-provisioner
- Helm chart 4.5.0
- kubectl and Amazon EKS managed add-ons

## Sources Consulted
- Kubernetes persistent volume lifecycle, reclaim policies, and protection: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes get command: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes JSONPath syntax: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes delete command: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- Kubernetes logs command, including all-pods and since: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Helm template command: https://helm.sh/docs/helm/helm_template/
- Driver v3.5.0 DeleteVolume implementation: https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/pkg/driver/controller.go
- Driver parameters and default deletion behavior: https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/docs/parameters.md
- Released chart metadata confirming chart 4.5.0 and appVersion 3.5.0: https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/charts/aws-efs-csi-driver/Chart.yaml
- Released chart values, controller replicas, and privileged-mode requirement: https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/charts/aws-efs-csi-driver/values.yaml
- Controller deployment template and cleanup argument mapping: https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/charts/aws-efs-csi-driver/templates/controller-deployment.yaml
- Driver FAQ on deletion concurrency and controller resources: https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/docs/faq.md
- Amazon EFS IAM authorization and client permissions: https://docs.aws.amazon.com/efs/latest/ug/iam-access-control-nfs-efs.html
- Amazon EFS network access requirements: https://docs.aws.amazon.com/efs/latest/ug/network-access.html
- Updating EKS managed add-ons and their configuration: https://docs.aws.amazon.com/eks/latest/userguide/updating-an-add-on.html
- Official Helm chart repository used for local rendering: https://kubernetes-sigs.github.io/aws-efs-csi-driver/
- Locally installed helm template --help and kubectl logs --help.

## Issues Found
- The IAM sentence could imply that both the controller identity policy and filesystem policy must independently grant client permissions. Clarified that the controller needs effective permissions, which can be granted by either policy type, subject to applicable explicit denies. AWS explicitly documents that an allow is not required in both.
- The controller log command selected only one pod from the deployment. The released chart defaults to two controller replicas, so this could omit the pod performing cleanup. Added --all-pods=true to collect the efs-plugin logs from every controller pod.

## Review Notes
- Confirmed that ordinary DeleteVolume reclamation deletes the access point while preserving its directory unless root-directory deletion is enabled. Retain leaves administrative cleanup necessary.
- Verified the opt-in Helm setting, its false default, controller-wide scope, and privileged container requirement against the version-pinned sources.
- Confirmed that the enabled cleanup path describes the access point, mounts the filesystem root with tls and iam, removes the directory, unmounts, and deletes the access point. An already-missing access point returns success without recovering its old directory path, supporting the historical-cleanup caveat.
- Confirmed the client IAM actions, access-point policy implications, and TCP 2049 requirements. Application node mount success alone does not establish controller access.
- Rendered the published chart 4.5.0 locally with controller.deleteAccessPointRootDir=true. The rendered controller uses driver v3.5.0, privileged: true, two replicas, and --delete-access-point-root-dir=true. Used --repo with the official repository URL to avoid modifying local Helm repository configuration; the article assumes its repository alias is already configured.
- Checked shell snippet syntax and CLI options. Resource names, namespaces, the PV placeholder, and reviewed-values.yaml must correspond to the reader's installation. The log command requires a kubectl version supporting --all-pods.
- The version-pinned source files were fetched successfully from GitHub's raw-content endpoint when the browsing tool could not fetch the GitHub HTML pages. The referenced repository paths exist and match the claims.
- No live AWS filesystem or Kubernetes resources were created or deleted. The canary lifecycle, filesystem policy evaluation, network reachability, and backup restoration remain environment-dependent checks; this review does not claim an end-to-end cluster test.
