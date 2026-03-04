# How to Migrate Amazon ECS Fargate Services to Google Cloud Run

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud Run, AWS ECS, Fargate, Containers, Serverless, Cloud Migration

Description: A practical guide to migrating containerized services from Amazon ECS Fargate to Google Cloud Run, covering task definition conversion, networking, and deployment strategies.

---

Amazon ECS Fargate and Google Cloud Run are both serverless container platforms, but they approach things differently. Fargate runs your containers within the ECS task orchestration framework - you define task definitions, services, and deal with load balancer configuration. Cloud Run takes a simpler approach - you give it a container image and it handles scaling, networking, and HTTPS termination automatically.

This simplification is one of the main benefits of the migration, but it does mean you need to adapt some patterns that ECS handles differently.

## How the Concepts Map

| ECS Fargate Concept | Cloud Run Equivalent |
|--------------------|---------------------|
| Task Definition | Cloud Run service revision |
| Service | Cloud Run service |
| Task | Cloud Run instance |
| ALB / Target Group | Built-in HTTPS endpoint |
| Service Discovery | Cloud Run service URL |
| ECS Cluster | No equivalent needed |
| ECR | Artifact Registry |
| Task IAM Role | Service account |
| Container port mapping | PORT environment variable |

## Step 1: Inventory Your ECS Services

Document all your Fargate services and their configurations.

```bash
# List all ECS clusters
aws ecs list-clusters --output table

# List services in a cluster
aws ecs list-services \
  --cluster my-cluster \
  --output table

# Get full service configuration
aws ecs describe-services \
  --cluster my-cluster \
  --services my-web-app \
  --query 'services[0].{
    Name:serviceName,
    TaskDef:taskDefinition,
    DesiredCount:desiredCount,
    LaunchType:launchType,
    NetworkConfig:networkConfiguration
  }'

# Get the task definition details
aws ecs describe-task-definition \
  --task-definition my-web-app:latest \
  --query 'taskDefinition.{
    CPU:cpu,
    Memory:memory,
    Containers:containerDefinitions[*].{
      Name:name,
      Image:image,
      CPU:cpu,
      Memory:memory,
      Ports:portMappings,
      Env:environment,
      Secrets:secrets,
      HealthCheck:healthCheck
    }
  }'
```

## Step 2: Push Container Images to Artifact Registry

First, set up Artifact Registry and push your container images.

```bash
# Create an Artifact Registry repository
gcloud artifacts repositories create my-containers \
  --repository-format=docker \
  --location=us-central1

# Configure Docker to authenticate with Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev

# Pull from ECR and push to Artifact Registry
docker pull 123456.dkr.ecr.us-east-1.amazonaws.com/my-web-app:latest
docker tag 123456.dkr.ecr.us-east-1.amazonaws.com/my-web-app:latest \
  us-central1-docker.pkg.dev/my-project/my-containers/my-web-app:latest
docker push us-central1-docker.pkg.dev/my-project/my-containers/my-web-app:latest
```

## Step 3: Convert Task Definitions to Cloud Run Services

Here is a typical ECS Fargate task definition and its Cloud Run equivalent.

ECS task definition (JSON):

```json
{
  "family": "my-web-app",
  "cpu": "512",
  "memory": "1024",
  "networkMode": "awsvpc",
  "containerDefinitions": [
    {
      "name": "web",
      "image": "123456.dkr.ecr.us-east-1.amazonaws.com/my-web-app:v1.2.3",
      "portMappings": [
        { "containerPort": 8080, "protocol": "tcp" }
      ],
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        { "name": "LOG_LEVEL", "value": "info" }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456:secret:db-url"
        }
      ],
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      },
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/my-web-app"
        }
      }
    }
  ]
}
```

Deploy the equivalent on Cloud Run:

```bash
# Deploy the service to Cloud Run
gcloud run deploy my-web-app \
  --image=us-central1-docker.pkg.dev/my-project/my-containers/my-web-app:v1.2.3 \
  --region=us-central1 \
  --platform=managed \
  --port=8080 \
  --cpu=1 \
  --memory=1Gi \
  --min-instances=1 \
  --max-instances=10 \
  --set-env-vars=NODE_ENV=production,LOG_LEVEL=info \
  --set-secrets=DATABASE_URL=db-url:latest \
  --service-account=my-web-app-sa@my-project.iam.gserviceaccount.com \
  --allow-unauthenticated
```

## Step 4: Handle Multi-Container Tasks

ECS task definitions can have multiple containers (sidecars). Cloud Run now supports sidecar containers.

```yaml
# Cloud Run service YAML with sidecar containers
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: my-web-app
spec:
  template:
    metadata:
      annotations:
        # Set scaling parameters
        autoscaling.knative.dev/minScale: '1'
        autoscaling.knative.dev/maxScale: '10'
    spec:
      containers:
        # Main application container (ingress container)
        - image: us-central1-docker.pkg.dev/my-project/my-containers/my-web-app:v1.2.3
          ports:
            - containerPort: 8080
          env:
            - name: NODE_ENV
              value: production
          resources:
            limits:
              cpu: '1'
              memory: 512Mi

        # Sidecar container (e.g., log processor or proxy)
        - image: us-central1-docker.pkg.dev/my-project/my-containers/log-agent:latest
          env:
            - name: LOG_ENDPOINT
              value: https://logs.example.com
          resources:
            limits:
              cpu: '0.5'
              memory: 256Mi
```

Deploy using the YAML file:

```bash
gcloud run services replace service.yaml --region=us-central1
```

## Step 5: Configure Networking

ECS Fargate services sit in a VPC with security groups. Cloud Run services are publicly accessible by default but can be connected to a VPC for private access.

```bash
# Connect Cloud Run to a VPC for accessing private resources
gcloud run deploy my-web-app \
  --image=us-central1-docker.pkg.dev/my-project/my-containers/my-web-app:v1.2.3 \
  --region=us-central1 \
  --vpc-connector=my-vpc-connector \
  --vpc-egress=private-ranges-only

# Create the VPC connector first if it does not exist
gcloud compute networks vpc-access connectors create my-vpc-connector \
  --network=my-vpc \
  --region=us-central1 \
  --range=10.8.0.0/28
```

For internal-only services (no public access):

```bash
# Deploy as internal-only service
gcloud run deploy my-internal-api \
  --image=us-central1-docker.pkg.dev/my-project/my-containers/my-internal-api:latest \
  --region=us-central1 \
  --ingress=internal \
  --no-allow-unauthenticated
```

## Step 6: Handle Load Balancing and Custom Domains

ECS Fargate services typically sit behind an ALB. Cloud Run provides a built-in HTTPS endpoint, but you can also put it behind a Google Cloud Load Balancer for custom domains.

```bash
# Map a custom domain to Cloud Run
gcloud run domain-mappings create \
  --service=my-web-app \
  --domain=app.example.com \
  --region=us-central1

# Or use a Global HTTPS Load Balancer with a serverless NEG
gcloud compute network-endpoint-groups create my-web-app-neg \
  --region=us-central1 \
  --network-endpoint-type=serverless \
  --cloud-run-service=my-web-app

gcloud compute backend-services create my-web-app-backend \
  --global \
  --load-balancing-scheme=EXTERNAL_MANAGED

gcloud compute backend-services add-backend my-web-app-backend \
  --global \
  --network-endpoint-group=my-web-app-neg \
  --network-endpoint-group-region=us-central1
```

## Step 7: Update Health Checks

ECS container health checks are defined in the task definition. Cloud Run uses startup probes and liveness probes.

```yaml
# Health check configuration in Cloud Run service YAML
spec:
  template:
    spec:
      containers:
        - image: us-central1-docker.pkg.dev/my-project/my-containers/my-web-app:latest
          # Startup probe - checks if the container has started
          startupProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
            failureThreshold: 3
          # Liveness probe - checks if the container is still healthy
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            periodSeconds: 30
```

## Step 8: Set Up Monitoring and Logging

Cloud Run automatically sends logs to Cloud Logging (no log driver configuration needed like in ECS).

```bash
# View Cloud Run logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=my-web-app" \
  --limit=50 \
  --format='table(timestamp, textPayload)'

# Set up an alert for high error rates
gcloud monitoring policies create \
  --display-name="Cloud Run Error Rate" \
  --condition-display-name="High 5xx rate" \
  --condition-filter='resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/request_count" AND metric.labels.response_code_class="5xx"' \
  --condition-threshold-value=10 \
  --condition-threshold-comparison=COMPARISON_GT
```

## Things Cloud Run Handles Differently

A few differences to be aware of:

- Cloud Run scales to zero by default. If your service needs to always be warm, set `--min-instances=1`.
- Cloud Run has a request timeout (default 5 minutes, max 60 minutes). Long-running background tasks may need Cloud Run jobs instead of services.
- Cloud Run containers must listen on the PORT environment variable (set automatically).
- There is no persistent local storage. Use Cloud Storage or Filestore for persistent data.

## Summary

Migrating from ECS Fargate to Cloud Run often simplifies your architecture. You lose some of the fine-grained control that ECS provides (task placement, capacity providers, service mesh integration), but you gain a simpler operational model with built-in HTTPS, automatic scaling, and pay-per-request pricing. The biggest adjustments are moving from ALB-based routing to Cloud Run's built-in endpoints and adapting to the scale-to-zero behavior.
