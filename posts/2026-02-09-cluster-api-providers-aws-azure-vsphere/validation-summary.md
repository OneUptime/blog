# Validation Summary: How to Use Cluster API Providers for AWS, Azure, and vSphere

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- Kubernetes
- Cluster API and `clusterctl`
- Cluster API Provider AWS (CAPA)
- Cluster API Provider Azure (CAPZ)
- Cluster API Provider vSphere (CAPV)
- AWS, Azure, and VMware vSphere infrastructure resources
- Kubernetes YAML manifests and CLI workflows

## Sources Consulted
- Cluster API Book: `clusterctl init` command, https://cluster-api.sigs.k8s.io/clusterctl/commands/init.html
- Cluster API Book: `clusterctl generate cluster` command, https://cluster-api.sigs.k8s.io/clusterctl/commands/generate-cluster
- Cluster API Book: `clusterctl get kubeconfig` command, https://cluster-api.sigs.k8s.io/clusterctl/commands/get-kubeconfig.html
- Cluster API Book: `clusterctl describe cluster` command, https://cluster-api.sigs.k8s.io/clusterctl/commands/describe-cluster.html
- CAPA documentation: `clusterawsadm bootstrap credentials`, https://cluster-api-aws.sigs.k8s.io/clusterawsadm/clusterawsadm_bootstrap_credentials
- CAPA documentation: External AWS cloud provider and EBS CSI driver, https://cluster-api-aws.sigs.k8s.io/topics/external-cloud-provider-with-ebs-csi-driver
- CAPA CRD reference and MachinePool documentation, https://cluster-api-aws.sigs.k8s.io/crd/ and https://cluster-api-aws.sigs.k8s.io/topics/machinepools
- CAPZ identities documentation, https://capz.sigs.k8s.io/topics/identities
- CAPZ VM identity, OS disk, data disk, and managed cluster documentation, https://capz.sigs.k8s.io/self-managed/vm-identity, https://capz.sigs.k8s.io/self-managed/os-disk, https://capz.sigs.k8s.io/self-managed/data-disks, and https://capz.sigs.k8s.io/managed/managedcluster
- CAPZ v1beta1 API reference, https://capz.sigs.k8s.io/reference/v1beta1-api
- CAPV API references for `VSphereMachine`, `VSphereMachineTemplate`, clone modes, and thumbprint fields, https://doc.crds.dev/github.com/kubernetes-sigs/cluster-api-provider-vsphere/infrastructure.cluster.x-k8s.io/VSphereMachine/v1beta1 and https://pkg.go.dev/sigs.k8s.io/cluster-api-provider-vsphere/apis/v1beta1
- Kubernetes release information and EOL status, https://kubernetes.io/releases/ and https://kubernetes.io/releases/1.28/
- Kubernetes cloud provider integration changes, https://kubernetes.io/blog/2023/12/14/cloud-provider-integration-changes

## Issues Found
- The AWS credential encoding command incorrectly base64-encoded `AWS_ACCESS_KEY_ID:AWS_SECRET_ACCESS_KEY`. Changed it to `clusterawsadm bootstrap credentials encode-as-profile`, which is the CAPA-supported format for `AWS_B64ENCODED_CREDENTIALS`.
- Kubernetes examples used `v1.28.0`, which reached EOL on 2024-10-22. Updated examples to `v1.36.0`, a current Kubernetes release as of the validation date.
- The AWS kubeadm examples used `cloud-provider: aws` and included an API server cloud-provider flag. Updated the configuration to `cloud-provider: external`, removed the API server flag, and added a note that AWS CCM and CSI must be deployed separately.
- The Azure setup only exported environment variables for credentials. CAPZ no longer supports using environment variables as the credential mechanism, so the setup now creates the service principal Secret and sets the identity-related environment variables used by generated templates.
- The Azure snippets were missing `identityRef` on `AzureCluster` and `AzureManagedControlPlane`. Added `AzureClusterIdentity` references.
- Azure SSH key placeholders did not make it clear that `sshPublicKey` expects the base64-encoded public key value used by CAPZ templates. Updated the placeholders.
- The Azure worker data disk example used `nameSuffix: etcd`, which is misleading for a worker machine. Changed it to `nameSuffix: data`.
- The vSphere TLS thumbprint command used SHA-256 and stripped colons. CAPV expects a colon-separated SHA-1 thumbprint, so the command now uses `-sha1` and preserves colons.
- The vSphere examples referenced an old Ubuntu/Kubernetes template name and used `linkedClone` while specifying custom disk sizes. Updated the template name to match the current Kubernetes example and changed clone mode to `fullClone`, since linked clones ignore `diskGiB` changes.
- The vSphere identity reference omitted `apiVersion`; added `apiVersion: v1` for the Secret reference.
- The provider-specific vSphere example used a standalone `VSphereVM` with incomplete required fields. Replaced it with a `VSphereMachineTemplate` resource for workload-specific VM sizing.
- The troubleshooting section used `kubectl get conditions cluster/${CLUSTER_NAME}`, which is not a standard kubectl command. Replaced it with `kubectl describe cluster ${CLUSTER_NAME}`.

## Review Notes
The post is technically relevant and valid after correction. Some snippets remain representative excerpts rather than complete end-to-end manifests; this is acceptable because the guide uses `clusterctl generate cluster` as the source of complete manifests and then highlights provider-specific resource shapes.
