# Validation Summary: Enable EFS CSI FIPS TLS While Avoiding Unsupported STS FIPS Endpoints

## Status

validated

## Post Type

Technical configuration and troubleshooting guide.

## Technologies Covered

- Amazon EFS and the AWS EFS CSI driver v3.5.0
- Amazon EKS, Kubernetes, and kubectl
- Helm chart 4.5.0
- AWS SDK endpoint selection, STS, and EC2
- TLS, FIPS cryptographic modes, efs-utils, AWS-LC-FIPS, and OpenSSL

## Sources Consulted

- [Driver v3.5.0 FIPS documentation](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/docs/fips.md)
- [Driver v3.5.0 FAQ and mount-only FIPS workaround](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/docs/faq.md#invalid-sts-fips-regional-endpoint-workaround-for-non-us-and-canada-regions)
- [Versioned Helm chart metadata](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/charts/aws-efs-csi-driver/Chart.yaml)
- [Versioned chart values](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/charts/aws-efs-csi-driver/values.yaml)
- [Node DaemonSet template](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/charts/aws-efs-csi-driver/templates/node-daemonset.yaml)
- [Controller Deployment template](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/charts/aws-efs-csi-driver/templates/controller-deployment.yaml)
- [Mount-helper configuration implementation](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/pkg/driver/efs_watch_dog.go)
- [Controller cleanup implementation](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/pkg/driver/controller.go)
- [Cloud client initialization and FIPS Region validation](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/pkg/cloud/cloud.go)
- [AWS FIPS endpoint list](https://aws.amazon.com/compliance/fips/)
- [AWS SDK dual-stack and FIPS endpoint settings](https://docs.aws.amazon.com/sdkref/latest/guide/feature-endpoints.html)
- [Amazon EFS mount troubleshooting](https://docs.aws.amazon.com/efs/latest/ug/troubleshooting-efs-mounting.html)
- [Amazon EFS encryption in transit](https://docs.aws.amazon.com/efs/latest/ug/encryption-in-transit.html)
- [Helm template command reference](https://helm.sh/docs/helm/helm_template/)
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [kubectl logs reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [kubectl exec reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/)
- [EKS version-specific add-on configuration schema API](https://docs.aws.amazon.com/cli/latest/reference/eks/describe-addon-configuration.html)

## Issues Found

No technical issues found.

## Review Notes

- README.md was left unchanged. The guide explicitly targets chart 4.5.0 and driver v3.5.0; chart metadata and the default image tag confirm that pairing.
- Rendered the published chart 4.5.0 with the post's exact YAML values. Both plugin images resolved to v3.5.0, the node plugin received the string FIPS_ENABLED=true, and neither plugin received AWS_USE_FIPS_ENDPOINT. The review used Helm's explicit --repo option to avoid depending on a locally registered repository alias.
- All Bash examples passed bash -n syntax checks. Command arguments were checked against the official CLI references. The article's Helm command assumes its repository alias is registered and reviewed-values.yaml contains the merged installation values. The exec example requires substituting a real node plugin pod name for efs-csi-node-example.
- The versioned mount-helper code reads FIPS_ENABLED into fips_mode_enabled. The chart independently controls AWS_USE_FIPS_ENDPOINT through useFIPS and passes through controller.env and node.env. Existing explicit environment overrides therefore require separate review.
- The controller source confirms that optional access-point root-directory cleanup mounts the file system with tls and iam. Applying the same mount-side setting to that controller is appropriate when cleanup is enabled.
- The driver documentation confirms the historical SDK endpoint behavior, newer startup rejection, and the distinction between AWS-LC-FIPS and older OpenSSL-based images. The post appropriately avoids treating the environment flag alone as evidence of whole-system compliance.
- The linked driver documentation, FAQ anchor, implementation source, and AWS endpoint resource resolve to the intended material. Endpoint availability and EKS-managed add-on schemas should be rechecked for the deployment's actual Region and add-on version.
- This was a documentation, source, shell-syntax, and local chart-rendering review. No live AWS credentials, Kubernetes rollout, PVC provisioning, TLS handshake, cryptographic certification, or file read/write test was performed. The fresh-mount and deployment-specific evidence requested by the article remains necessary in the target environment.
