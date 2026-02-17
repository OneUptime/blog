# How to Use Cloud Deploy Custom Targets for Non-GKE Deployment Destinations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Deploy, Custom Targets, DevOps, Deployment

Description: Learn how to use Cloud Deploy custom targets to deploy applications to destinations beyond GKE and Cloud Run, including VMs, third-party platforms, and custom infrastructure.

---

Google Cloud Deploy natively supports GKE clusters and Cloud Run services as deployment destinations. But what if you need to deploy to a VM fleet, an on-premises server, a third-party platform, or some other custom infrastructure? That is where custom targets come in. Custom targets let you extend Cloud Deploy to work with any deployment destination by defining your own render and deploy logic.

This guide walks through setting up custom targets for non-standard deployment scenarios.

## What Are Custom Targets?

A custom target in Cloud Deploy uses a CustomTargetType resource to define how rendering and deployment work. Instead of Cloud Deploy using its built-in GKE or Cloud Run deployers, it delegates to your custom logic. You provide container images that handle the render and deploy phases.

This means you can use Cloud Deploy's pipeline management, approval gates, and promotion workflow while deploying to literally anything.

## The Architecture of Custom Targets

Custom targets have two main components:

1. A render action - transforms your configuration into deployment-ready artifacts
2. A deploy action - takes the rendered artifacts and applies them to the target environment

Both actions are executed as Cloud Build jobs, giving you full control over the execution environment.

## Defining a Custom Target Type

Start by creating a CustomTargetType resource. This defines the render and deploy actions.

```yaml
# custom-target-type.yaml - Custom target type for VM deployments
apiVersion: deploy.cloud.google.com/v1
kind: CustomTargetType
metadata:
  name: vm-deploy
description: Custom target type for deploying to VM fleets
customActions:
  renderAction: render-vm-config
  deployAction: deploy-to-vms
```

Register it with Cloud Deploy.

```bash
# Register the custom target type
gcloud deploy apply --file=custom-target-type.yaml --region=us-central1
```

## Creating a Target That Uses the Custom Target Type

Now create a target that references this custom target type instead of specifying a GKE cluster or Cloud Run service.

```yaml
# vm-target.yaml - Target using the custom target type
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: vm-prod
description: Production VM fleet
customTarget:
  customTargetType: vm-deploy
deployParameters:
  instance-group: my-prod-instance-group
  zone: us-central1-a
  project: my-project
```

```bash
# Register the target
gcloud deploy apply --file=vm-target.yaml --region=us-central1
```

## Implementing the Render Action

The render action is defined in your Skaffold configuration. It runs a container that produces the deployment artifacts.

```yaml
# skaffold.yaml - Skaffold config with custom render and deploy actions
apiVersion: skaffold/v4beta7
kind: Config
metadata:
  name: vm-app
customActions:
- name: render-vm-config
  containers:
  - name: render
    image: us-central1-docker.pkg.dev/my-project/my-repo/vm-renderer:latest
    command: ["sh"]
    args: ["-c", "/render.sh"]
- name: deploy-to-vms
  containers:
  - name: deploy
    image: us-central1-docker.pkg.dev/my-project/my-repo/vm-deployer:latest
    command: ["sh"]
    args: ["-c", "/deploy.sh"]
```

The render script processes your configuration and writes the output to the path specified by Cloud Deploy.

```bash
#!/bin/sh
# render.sh - Renders VM deployment configuration
# Cloud Deploy provides these environment variables:
# CLOUD_DEPLOY_OUTPUT_PATH - where to write rendered artifacts
# CLOUD_DEPLOY_RELEASE - the release name
# CLOUD_DEPLOY_TARGET - the target name

echo "Rendering configuration for target: $CLOUD_DEPLOY_TARGET"

# Create the output directory
mkdir -p "$CLOUD_DEPLOY_OUTPUT_PATH"

# Generate the deployment configuration
# In this example, we produce a startup script and instance template config
cat > "$CLOUD_DEPLOY_OUTPUT_PATH/deploy-config.json" << EOF
{
  "instanceGroup": "$CLOUD_DEPLOY_project",
  "image": "$CLOUD_DEPLOY_IMAGE",
  "version": "$CLOUD_DEPLOY_RELEASE",
  "startupScript": "#!/bin/bash\ndocker pull $CLOUD_DEPLOY_IMAGE\ndocker run -d -p 8080:8080 $CLOUD_DEPLOY_IMAGE"
}
EOF

echo "Render complete. Output written to $CLOUD_DEPLOY_OUTPUT_PATH"
```

## Implementing the Deploy Action

The deploy action receives the rendered artifacts and performs the actual deployment.

```bash
#!/bin/sh
# deploy.sh - Deploys to VM instance group
# CLOUD_DEPLOY_INPUT_PATH contains the rendered artifacts
# Deploy parameters from the target are available as environment variables

echo "Starting deployment to VM fleet"

# Read the rendered configuration
CONFIG_FILE="$CLOUD_DEPLOY_INPUT_PATH/deploy-config.json"

# Extract values from the config
INSTANCE_GROUP=$(cat "$CONFIG_FILE" | jq -r '.instanceGroup')
IMAGE=$(cat "$CONFIG_FILE" | jq -r '.image')

# Use gcloud to update the instance group with the new image
echo "Updating instance template with new image: $IMAGE"

# Create a new instance template with the updated container image
TEMPLATE_NAME="app-template-$(date +%s)"
gcloud compute instance-templates create-with-container "$TEMPLATE_NAME" \
  --container-image="$IMAGE" \
  --region=us-central1

# Update the managed instance group to use the new template
gcloud compute instance-groups managed set-instance-template "$INSTANCE_GROUP" \
  --template="$TEMPLATE_NAME" \
  --zone="$CLOUD_DEPLOY_zone"

# Start a rolling update
gcloud compute instance-groups managed rolling-action start-update "$INSTANCE_GROUP" \
  --version="template=$TEMPLATE_NAME" \
  --zone="$CLOUD_DEPLOY_zone" \
  --max-surge=3 \
  --max-unavailable=0

echo "Rolling update started for instance group $INSTANCE_GROUP"

# Wait for the update to complete
gcloud compute instance-groups managed wait-until "$INSTANCE_GROUP" \
  --version-target-reached \
  --zone="$CLOUD_DEPLOY_zone"

echo "Deployment complete"
```

## Building the Custom Action Containers

Package your render and deploy scripts into container images.

```dockerfile
# Dockerfile.renderer - Container for the render action
FROM google/cloud-sdk:slim
RUN apt-get update && apt-get install -y jq
COPY render.sh /render.sh
RUN chmod +x /render.sh
```

```dockerfile
# Dockerfile.deployer - Container for the deploy action
FROM google/cloud-sdk:slim
RUN apt-get update && apt-get install -y jq
COPY deploy.sh /deploy.sh
RUN chmod +x /deploy.sh
```

Build and push both images.

```bash
# Build and push the custom action containers
docker build -f Dockerfile.renderer -t us-central1-docker.pkg.dev/my-project/my-repo/vm-renderer:latest .
docker push us-central1-docker.pkg.dev/my-project/my-repo/vm-renderer:latest

docker build -f Dockerfile.deployer -t us-central1-docker.pkg.dev/my-project/my-repo/vm-deployer:latest .
docker push us-central1-docker.pkg.dev/my-project/my-repo/vm-deployer:latest
```

## Wiring It All Into a Pipeline

Create a delivery pipeline that uses the custom target just like any other target.

```yaml
# pipeline.yaml - Pipeline with custom target stages
apiVersion: deploy.cloud.google.com/v1
kind: DeliveryPipeline
metadata:
  name: vm-app-pipeline
serialPipeline:
  stages:
  - targetId: vm-staging
    profiles:
    - staging
  - targetId: vm-prod
    profiles:
    - prod
```

## Use Cases for Custom Targets

Custom targets open up many possibilities. Here are some real-world examples:

- Deploying to Compute Engine managed instance groups (as shown above)
- Deploying to on-premises Kubernetes clusters via a jump host
- Updating AWS Lambda functions or ECS services from GCP
- Deploying Terraform configurations
- Updating Firebase hosting or Firestore rules
- Deploying to edge devices via IoT Core

The pattern is always the same: define a CustomTargetType, implement render and deploy containers, and plug them into your pipeline.

## Passing Parameters to Custom Targets

Deploy parameters on the target become environment variables in your custom action containers. This lets you pass environment-specific values without changing your custom action code.

```yaml
# Different targets with different deploy parameters
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: vm-staging
customTarget:
  customTargetType: vm-deploy
deployParameters:
  instance-group: staging-instance-group
  zone: us-central1-b
  max-surge: "1"
```

## Summary

Custom targets extend Cloud Deploy beyond GKE and Cloud Run to support any deployment destination. By implementing render and deploy actions as containers, you maintain full control over how your application gets deployed while benefiting from Cloud Deploy's pipeline management, approval workflows, and release tracking. If you can script a deployment, you can make it a Cloud Deploy custom target.
