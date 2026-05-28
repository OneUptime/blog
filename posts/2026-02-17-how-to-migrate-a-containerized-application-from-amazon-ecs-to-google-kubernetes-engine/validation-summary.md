# Validation Summary: Migrate a Containerized Application from Amazon ECS to Google Kubernetes Engine

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Google Kubernetes Engine
- Kubernetes Deployments, Services, Ingress, probes, and HorizontalPodAutoscaler
- Amazon ECS task definitions and container dependencies
- Amazon ECR
- Google Artifact Registry
- Google Secret Manager and the GKE Secret Manager CSI add-on
- Workload Identity Federation for GKE
- Google Cloud CLI, AWS CLI, Docker, and kubectl

## Sources Consulted
- Google Cloud: Create an Autopilot cluster - https://cloud.google.com/kubernetes-engine/docs/how-to/creating-an-autopilot-cluster
- Google Cloud SDK: gcloud container clusters create - https://cloud.google.com/sdk/gcloud/reference/container/clusters/create
- Google Cloud: GKE cluster autoscaler - https://cloud.google.com/kubernetes-engine/docs/how-to/cluster-autoscaler
- Google Cloud: Authenticate to Google Cloud APIs from GKE workloads - https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Google Cloud: Artifact Registry repository creation - https://cloud.google.com/artifact-registry/docs/repositories/create-repos
- Google Cloud: Artifact Registry Docker image names - https://cloud.google.com/artifact-registry/docs/docker/names
- Google Cloud: Secret Manager add-on with GKE - https://cloud.google.com/secret-manager/docs/secret-manager-managed-csi-component
- Google Cloud SDK: gcloud secrets create - https://cloud.google.com/sdk/gcloud/reference/secrets/create
- Google Cloud: Configure Ingress for external Application Load Balancers - https://cloud.google.com/kubernetes-engine/docs/how-to/load-balance-ingress
- Kubernetes: Ingress - https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes API: Ingress v1 - https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/
- Kubernetes: Init containers and sidecar containers - https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- AWS CLI: ecr get-login-password - https://docs.aws.amazon.com/cli/latest/reference/ecr/get-login-password.html
- AWS ECS: Task definition parameters and dependsOn HEALTHY - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters_ec2.html

## Issues Found
- The Artifact Registry push flow omitted Docker credential configuration. Added `gcloud auth configure-docker us-central1-docker.pkg.dev` before the `docker push` step so the command sequence works for a fresh environment.
- The ECR image pull secret example implied a static secret was a durable option. Added a note that ECR authorization tokens are valid for 12 hours and that direct pulls should be used for testing or with automation that refreshes the secret.
- The post used the older shorthand "Workload Identity." Updated references to "Workload Identity Federation for GKE," matching current Google Cloud terminology.
- The Secret Manager CSI example used `provider: gcp` and did not show the required GKE add-on or pod volume mount for the current GKE-managed Secret Manager CSI integration. Updated the example to enable the Secret Manager add-on, use `provider: gke`, and mount the secret with the `secrets-store-gke.csi.k8s.io` CSI driver.

## Review Notes
- The GKE Standard cluster command is valid, but for regional clusters `--num-nodes`, `--min-nodes`, and `--max-nodes` apply per zone for the default node pool.
- Kubernetes does not provide a direct equivalent for ECS `dependsOn` with `HEALTHY` for ordinary app containers. The example remains acceptable as a high-level migration translation, but production migrations should evaluate init containers, startup probes, or application-level retry behavior when startup ordering matters.
- The Ingress example uses GKE's supported static IP annotation and a user-provided TLS Secret. Google-managed certificates or Gateway API may be preferable for some new deployments, but the shown configuration is still valid.
