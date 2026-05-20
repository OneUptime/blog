# Validation Summary: How to Deploy ArgoCD in High Availability Mode

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Argo CD
- Kubernetes
- Helm
- Redis HA with Sentinel
- ingress-nginx
- AWS EBS CSI storage classes

## Sources Consulted
- Argo CD High Availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD HA install manifest: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/ha/install.yaml
- Argo CD ingress documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/ingress/
- Argo CD ApplicationSet installation and HA documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Getting-Started/
- Argo Helm chart values for argo-cd 7.7.5: https://github.com/argoproj/argo-helm/blob/argo-cd-7.7.5/charts/argo-cd/values.yaml
- Argo Helm application controller template for argo-cd 7.7.5: https://github.com/argoproj/argo-helm/blob/argo-cd-7.7.5/charts/argo-cd/templates/argocd-application-controller/statefulset.yaml
- redis-ha chart values: https://github.com/DandyDeveloper/charts/blob/master/charts/redis-ha/values.yaml
- AWS EBS CSI driver StorageClass examples: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/tree/master/examples/kubernetes/storageclass

## Issues Found
- The post described the official HA manifest as deploying 3 server replicas, 2 controller replicas, 3 repo-server replicas, and PodDisruptionBudgets. The current stable HA manifest deploys 2 server replicas, 1 application-controller replica, 2 repo-server replicas, 3 Redis server replicas, and 3 Redis HAProxy replicas, and it does not include PodDisruptionBudgets. Updated the manifest summary.
- The post described application-controller HA as lease-based leader election with standby controllers. Argo CD documents application-controller scale-out as cluster sharding. Replaced the leader election section with controller sharding guidance and the supported `controller.sharding.algorithm` setting.
- The Helm values example manually set `ARGOCD_CONTROLLER_REPLICAS`. The argo-cd Helm chart sets this environment variable from `controller.replicas`, so the duplicate manual setting was removed.
- The `redis-ha.topologySpreadConstraints` example used Kubernetes list syntax, but the redis-ha chart used by argo-cd 7.7.5 expects an object with `enabled`, `maxSkew`, `topologyKey`, and `whenUnsatisfiable`. Updated the values example.
- The `notifications.replicas` key is not a chart value in argo-cd 7.7.5. Replaced it with `notifications.enabled`.
- The Helm values example scaled the ApplicationSet controller to 2 replicas without enabling ApplicationSet leader election. Added `configs.params.applicationsetcontroller.enable.leader.election: true`.
- The ingress example mixed `backend-protocol: "HTTPS"` with SSL passthrough. Argo CD's ingress-nginx SSL passthrough example uses SSL passthrough and force SSL redirect for a single hostname. Updated the annotations accordingly.
- The Redis persistence section said Redis HA needs persistent storage to survive pod restarts. Argo CD documents Redis as a disposable cache, so the wording now says persistence is optional if Redis data should survive pod restarts.
- The AWS EBS StorageClass used the deprecated in-tree `kubernetes.io/aws-ebs` provisioner and an unsuitable gp3 parameter. Updated it to use the EBS CSI provisioner `ebs.csi.aws.com` and gp3 `iops`.
- The pod deletion test commands would delete all matching running pods before piping output to `head -1`. Updated them to select a single pod name with `jsonpath` and delete only that pod.

## Review Notes
The tutorial remains version-specific because it pins Helm chart version 7.7.5. Future updates should re-check chart values before changing the pinned chart version.
