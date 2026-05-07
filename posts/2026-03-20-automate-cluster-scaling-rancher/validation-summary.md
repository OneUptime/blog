# Validation Summary: How to Automate Cluster Scaling in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes Horizontal Pod Autoscaler (HPA)
- Kubernetes Vertical Pod Autoscaler (VPA)
- Kubernetes Cluster Autoscaler
- KEDA
- Amazon EKS / EC2 Auto Scaling Groups
- RKE2
- VMware vSphere

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling docs: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes field selectors docs: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes `kubectl` quick reference: https://kubernetes.io/docs/reference/kubectl/quick-reference
- Kubernetes Autoscaler VPA quickstart: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/quickstart.md
- Kubernetes Autoscaler VPA README: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/README.md
- Cluster Autoscaler Helm chart README: https://raw.githubusercontent.com/kubernetes/autoscaler/master/charts/cluster-autoscaler/README.md
- Cluster Autoscaler AWS provider README: https://raw.githubusercontent.com/kubernetes/autoscaler/master/cluster-autoscaler/cloudprovider/aws/README.md
- Cluster Autoscaler Cluster API provider README: https://raw.githubusercontent.com/kubernetes/autoscaler/master/cluster-autoscaler/cloudprovider/clusterapi/README.md
- Rancher provisioning API reference (`RKEMachinePool` fields): https://pkg.go.dev/github.com/rancher/rancher/pkg/apis/provisioning.cattle.io/v1
- Rancher vSphere cluster docs: https://ranchermanager.docs.rancher.com/v2.8/how-to-guides/new-user-guides/launch-kubernetes-with-rancher/use-new-nodes-in-an-infra-provider/vsphere
- KEDA ScaledObject / deployment scaling concepts: https://keda.sh/docs/2.19/concepts/scaling-deployments/
- KEDA Apache Kafka scaler docs: https://keda.sh/docs/2.19/scalers/apache-kafka/
- KEDA RabbitMQ scaler docs: https://keda.sh/docs/2.19/scalers/rabbitmq-queue/
- KEDA cron scaler docs: https://keda.sh/docs/2.19/scalers/cron/

## Issues Found
- The introduction treated KEDA as a separate scaling "level", but KEDA is an event-driven way to drive pod scaling rather than a fourth scaling target. I corrected the wording and renamed the KEDA section heading to keep the scaling model technically accurate.
- The VPA example targeted the same workload as the CPU/memory HPA example and used `updateMode: "Auto"`, which is deprecated. I changed the VPA example to a different workload and switched it to explicit `updateMode: "Recreate"` to match current VPA guidance.
- The Cluster Autoscaler install snippet omitted the Helm repository setup. I added `helm repo add` and `helm repo update`, and made `cloudProvider=aws` explicit for the AWS example.
- The Rancher machine-pool example was labeled as bare-metal even though it used `VmwarevsphereConfig`, and it used incorrect machine-pool fields (`roles`, `minSize`, `maxSize`). I corrected the wording to vSphere-backed RKE2 and updated the YAML to `workerRole`, `autoscalingMinSize`, and `autoscalingMaxSize`, which match Rancher’s provisioning API.
- The RabbitMQ KEDA example used deprecated trigger metadata (`queueLength`). I updated it to the current `mode: QueueLength` plus `value` format and added explicit protocol handling.
- The Cluster Autoscaler log command relied on a label selector that may not match the Helm deployment labels. I changed it to use the deployment name implied by the install command.
- The events command sorted by `.lastTimestamp`, which is not the recommended current field in Kubernetes docs. I updated it to sort by `.metadata.creationTimestamp` and narrowed the field selector to HPA rescale events.

## Review Notes
- Cluster Autoscaler versions should be aligned with the Kubernetes cluster minor version to avoid subtle scheduling and scale-up/scale-down behavior mismatches.
- For Rancher machine-pool autoscaling, the machine-pool bounds are only part of the setup; Cluster Autoscaler must also be running with the Cluster API provider configuration.
- Scale-from-zero behavior for Cluster API-backed node groups depends on the underlying infrastructure provider’s support and annotations.
