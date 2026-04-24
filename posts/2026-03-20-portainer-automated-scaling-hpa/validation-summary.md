# Validation Summary: How to Automate Container Scaling with Portainer and HPA

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Kubernetes Horizontal Pod Autoscaler (HPA)
- Kubernetes Metrics Server
- Prometheus Adapter and the `custom.metrics.k8s.io` API
- KEDA
- Helm
- Redis-based event-driven autoscaling
- Cron-based autoscaling

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling concept docs: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HorizontalPodAutoscaler walkthrough: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/
- Metrics Server official docs: https://kubernetes-sigs.github.io/metrics-server/
- Prometheus Adapter official repository and configuration notes: https://github.com/kubernetes-sigs/prometheus-adapter
- KEDA deployment docs: https://keda.sh/docs/latest/deploy
- KEDA ScaledObject spec: https://keda.sh/docs/2.19/reference/scaledobject-spec/
- KEDA Redis Lists scaler docs: https://keda.sh/docs/2.19/scalers/redis-lists/
- KEDA Cron scaler docs: https://keda.sh/docs/2.19/scalers/cron/
- Portainer application inspection docs: https://docs.portainer.io/sts/user/kubernetes/applications/inspect
- Portainer application creation docs: https://docs.portainer.io/sts/user/kubernetes/applications/add
- Helm install command reference: https://helm.sh/docs/helm/helm_install/

## Issues Found
- The Portainer navigation in the post used `Kubernetes > Workloads` and `Kubernetes > Cluster > Events`, which does not match current Portainer Kubernetes documentation. I changed this to `Applications`, and pointed readers to the application details and `Events` tab because that is where replica state, auto-scaling policy, and application-related events are documented.
- The Prometheus Adapter section implied that installing the chart was sufficient for custom-metric HPA usage. I clarified that the metric must be exposed through the custom metrics API, added `helm repo update`, added `--create-namespace`, and added a `kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1"` verification step so the workflow reflects the adapter's documented behavior.
- The custom-metrics HPA example set `scaleUp.stabilizationWindowSeconds: 30` with the comment `Scale up quickly`. Kubernetes documents that scale-up stabilization defaults to `0`, and a nonzero stabilization window smooths or delays scaling decisions rather than making them faster. I changed the value to `0` and updated the comment to `Scale up immediately`.
- The KEDA installation snippet omitted `helm repo update`, which is part of the official Helm install flow. I added it so the command sequence matches the current KEDA deployment docs.
- The load-testing command used `alpine/bombardier`, which was not backed by the official Kubernetes walkthrough or upstream tool documentation used in this review. I replaced it with the official Kubernetes HPA walkthrough pattern that runs a temporary `busybox:1.28` pod generating repeated requests with `wget`.
- The KEDA cron example comment said `Scale down weekday 6 PM`, but KEDA's cron scaler defines the end of the active window and actual scale-to-zero is also affected by cooldown behavior. I changed the comment to `End weekday scale window at 6 PM` to make it technically accurate without restructuring the example.
- The conclusion referred to Portainer's `Kubernetes workloads view`, which does not match current Portainer Kubernetes UI docs. I updated it to reference the application details view instead.

## Review Notes
- Kubernetes recommends removing `spec.replicas` from a Deployment manifest once an HPA is managing that workload, to avoid reapplying a fixed replica count on future `kubectl apply` runs. The post's example still works for initial setup, but this is a useful operational caveat.
- The latest KEDA docs currently state that KEDA 2.19 requires Kubernetes 1.30 or newer. Because the post installs the current chart without pinning a version, readers should confirm version compatibility with their cluster before installing.
