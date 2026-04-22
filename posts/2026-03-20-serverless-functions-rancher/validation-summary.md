# Validation Summary: How to Deploy Serverless Functions on Rancher - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher Manager
- Kubernetes Jobs and CronJobs
- Kubernetes ConfigMaps and Secrets
- Knative Serving
- OpenFaaS
- Fission
- Kubeless
- KEDA
- Apache Kafka
- GitHub Actions
- Docker
- kubectl

## Sources Consulted
- Rancher Manager, Access a Cluster with Kubectl and kubeconfig: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/manage-clusters/access-clusters/use-kubectl-and-kubeconfig
- Knative Serving scale bounds: https://knative.dev/docs/serving/autoscaling/scale-bounds/
- Knative Serving autoscaling targets: https://knative.dev/docs/serving/autoscaling/autoscaling-targets/
- Knative Serving scale to zero: https://knative.dev/docs/serving/autoscaling/scale-to-zero/
- Knative Serving traffic management: https://knative.dev/docs/serving/traffic-management/
- Kubernetes Jobs: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes CronJobs: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes Object Names and IDs: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/
- Kubernetes ConfigMaps in Pods: https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/
- Kubernetes Secrets as environment variables: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes kubeconfig and KUBECONFIG: https://kubernetes.io/docs/tasks/access-application-cluster/configure-access-multiple-clusters/
- kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- KEDA ScaledObject specification: https://keda.sh/docs/2.19/reference/scaledobject-spec/
- KEDA Apache Kafka scaler: https://keda.sh/docs/2.19/scalers/apache-kafka/
- OpenFaaS autoscaling: https://docs.openfaas.com/architecture/autoscaling/
- Fission executor architecture: https://fission.io/docs/architecture/executor/
- Kubeless archived repository notice: https://github.com/vmware-archive/kubeless
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax

## Issues Found
- The introduction implied Rancher serverless deployments provide pay-per-use billing. Rancher-managed Kubernetes can provide serverless patterns such as scale-to-zero and autoscaling, but not automatic per-invocation billing, so the wording was changed to "serverless computing patterns."
- The framework comparison table overstated or omitted current caveats. OpenFaaS scale-to-zero is an opt-in Pro/Edge capability, Fission can scale to zero with the NewDeploy executor and `minscale` 0 but has higher cold starts in that mode, and Kubeless is no longer actively maintained. Updated the table to reflect those details.
- The Kubernetes Job example used `metadata.name: data-processor-$(date +%Y%m%d%H%M%S)`. Kubernetes does not evaluate shell substitutions in YAML, and that value is not a valid object name. Replaced it with `metadata.generateName: data-processor-`, which Kubernetes supports for generated unique names on create requests.
- The GitHub Actions example set `KUBECONFIG` directly to the secret content. Kubernetes documents `KUBECONFIG` as a list of file paths, so `kubectl` would treat the raw kubeconfig as a path and fail in the common secret-content setup. Updated the workflow to write the secret to `$HOME/.kube/config`, restrict permissions, and export `KUBECONFIG` to that file path.

## Review Notes
- The examples assume the `functions` namespace, referenced Secrets, ConfigMaps, container images, Knative Serving CRDs, and KEDA CRDs already exist.
- The Job manifest now uses `generateName`, which is intended for create requests. Use `kubectl create -f` for that manifest, or switch to a fixed valid `metadata.name` if managing it with `kubectl apply`.
- The container registry, Kafka endpoint, and image names are placeholders and must be replaced for a real deployment.
- Local `kubectl`, `kubeconform`, and `kubeval` were not installed in this environment. YAML fences were parsed locally with PyYAML, and API/field validation was performed against official documentation.
