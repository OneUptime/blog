# How to Implement Private Endpoints for Vertex AI Prediction with VPC Peering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, VPC Peering, Private Endpoint, Security

Description: A practical guide to configuring private prediction endpoints on Vertex AI using VPC peering to keep model inference traffic off the public internet.

---

By default, Vertex AI prediction endpoints are accessible over the public internet. For many production workloads - especially in healthcare, finance, and government - this is not acceptable. Prediction requests might contain sensitive data like patient records, financial transactions, or classified information that should never traverse the public internet.

Private endpoints solve this by routing prediction traffic through VPC peering, keeping all communication within Google's private network. Your client applications connect to the endpoint through a private inference URI that is reachable only from the peered VPC or connected networks, and the data does not traverse the public internet.

## How Private Endpoints Work

When you create a private endpoint, Vertex AI uses the private services access peering connection between your VPC network and Google's service producer network. Prediction requests flow through this peered connection using private IP addresses.

```mermaid
graph LR
    subgraph "Your VPC"
        A[Client Application] --> B[Private inference URI]
    end

    subgraph "VPC Peering"
        B --> C[Peered Connection]
    end

    subgraph "Google Service Network"
        C --> D[Vertex AI Endpoint]
        D --> E[Model Replica 1]
        D --> F[Model Replica 2]
    end

    style C fill:#e1f5fe
```

## Prerequisites: Setting Up VPC Peering

Before creating a private endpoint, you need to set up VPC peering with Google's service network. This is a one-time setup per VPC network.

These commands configure the VPC peering:

```bash
# Reserve an IP range for Google's service network

gcloud compute addresses create vertex-ai-range \
    --global \
    --purpose=VPC_PEERING \
    --addresses=10.0.0.0 \
    --prefix-length=16 \
    --network=your-vpc-network \
    --project=your-project-id

# Create the VPC peering connection
gcloud services vpc-peerings connect \
    --service=servicenetworking.googleapis.com \
    --ranges=vertex-ai-range \
    --network=your-vpc-network \
    --project=your-project-id

# Verify the peering is established
gcloud compute networks peerings list \
    --network=your-vpc-network
```

The IP range you reserve determines which private addresses Vertex AI can use. A /16 range provides 65,536 addresses, which is plenty for most deployments.

## Creating a Private Endpoint

With VPC peering in place, create an endpoint that uses the private network.

This code creates a private Vertex AI endpoint:

```python
from google.cloud import aiplatform

aiplatform.init(project="your-project-id", location="us-central1")

# Get the full network resource name
network = "projects/your-project-number/global/networks/your-vpc-network"

# Create a private endpoint
endpoint = aiplatform.PrivateEndpoint.create(
    display_name="fraud-detection-private",
    network=network,  # This makes the endpoint private
    description="Private endpoint for fraud detection - no public access"
)

print(f"Private endpoint created: {endpoint.resource_name}")
print(f"Network: {network}")
```

## Deploying a Model to the Private Endpoint

Model deployment to a private endpoint is similar to public endpoints. The main differences are that private services access endpoints support one deployed model per endpoint and do not support traffic splitting.

This code deploys a model to the private endpoint:

```python
from google.cloud import aiplatform

aiplatform.init(project="your-project-id", location="us-central1")

# Upload your model (same as usual)
model = aiplatform.Model.upload(
    display_name="fraud-detector-v3",
    artifact_uri="gs://your-bucket/models/fraud-v3/",
    serving_container_image_uri="us-docker.pkg.dev/vertex-ai/prediction/sklearn-cpu.1-5:latest"
)

# Get the private endpoint
endpoint = aiplatform.PrivateEndpoint(
    "projects/your-project-id/locations/us-central1/endpoints/PRIVATE_ENDPOINT_ID"
)

# Deploy to the private endpoint
model.deploy(
    endpoint=endpoint,
    deployed_model_display_name="fraud-v3-private",
    machine_type="n1-standard-4",
    min_replica_count=2,  # Higher minimum for production
    max_replica_count=10
)

print("Model deployed to private endpoint")
```

## Calling the Private Endpoint

Private endpoints are only accessible from within the peered VPC or from networks connected to it (like Cloud VPN or Cloud Interconnect). You cannot call them from the public internet.

This code calls the private endpoint from a VM within the VPC:

```python
# predict_private.py - Call from a VM or GKE pod within the VPC

from google.cloud import aiplatform

aiplatform.init(
    project="your-project-id",
    location="us-central1"
)

# Get the private endpoint
endpoint = aiplatform.PrivateEndpoint(
    "projects/your-project-id/locations/us-central1/endpoints/PRIVATE_ENDPOINT_ID"
)

# Send prediction request - traffic uses the private path
instances = [
    {
        "transaction_amount": 5432.10,
        "merchant_category": "electronics",
        "time_since_last_purchase": 0.5,
        "device_fingerprint_score": 0.92,
        "account_age_days": 365
    }
]

response = endpoint.predict(instances=instances)

for prediction in response.predictions:
    print(f"Fraud probability: {prediction}")
```

## Calling from GKE

If your application runs on GKE, the pods can call the private endpoint directly since GKE clusters run within your VPC.

This Kubernetes deployment shows the setup:

```yaml
# deployment.yaml - Application that calls private Vertex AI endpoint
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fraud-detection-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: fraud-detection
  template:
    metadata:
      labels:
        app: fraud-detection
    spec:
      serviceAccountName: vertex-ai-caller
      containers:
        - name: app
          image: us-central1-docker.pkg.dev/your-project/apps/fraud-service:v1
          env:
            - name: VERTEX_ENDPOINT_ID
              value: "projects/your-project-id/locations/us-central1/endpoints/PRIVATE_ENDPOINT_ID"
            - name: PROJECT_ID
              value: "your-project-id"
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
```

The Google service account used by the pod needs the `roles/aiplatform.user` IAM role to call the endpoint:

```bash
# Create a Kubernetes service account bound to a GCP service account
kubectl create serviceaccount vertex-ai-caller \
    --namespace=default

gcloud iam service-accounts create vertex-caller \
    --display-name="Vertex AI Endpoint Caller"

# Grant the prediction permission
gcloud projects add-iam-policy-binding your-project-id \
    --member="serviceAccount:vertex-caller@your-project-id.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"

# Bind the GKE service account to the GCP service account
gcloud iam service-accounts add-iam-policy-binding \
    vertex-caller@your-project-id.iam.gserviceaccount.com \
    --role="roles/iam.workloadIdentityUser" \
    --member="serviceAccount:your-project-id.svc.id.goog[default/vertex-ai-caller]"

kubectl annotate serviceaccount vertex-ai-caller \
    --namespace=default \
    iam.gke.io/gcp-service-account=vertex-caller@your-project-id.iam.gserviceaccount.com
```

## Using Private Service Connect (Alternative to VPC Peering)

For more granular control, you can use Private Service Connect instead of VPC peering. PSC creates a dedicated endpoint in your VPC that forwards to the Vertex AI online inference service. Create the Vertex AI endpoint with Private Service Connect enabled, deploy the model, then use the generated service attachment to create the forwarding rule.

```bash
# Get the service attachment after deploying the model
gcloud ai endpoints describe ENDPOINT_ID \
    --project=your-project-id \
    --region=us-central1 \
    --format="value(deployedModels.privateEndpoints.serviceAttachment)"

# Reserve an internal IP address for the PSC forwarding rule
gcloud compute addresses create vertex-ai-psc-ip \
    --project=your-project-id \
    --region=us-central1 \
    --subnet=your-subnet

# Create a Private Service Connect forwarding rule
gcloud compute forwarding-rules create vertex-ai-psc \
    --project=your-project-id \
    --region=us-central1 \
    --network=your-vpc-network \
    --address=vertex-ai-psc-ip \
    --target-service-attachment=SERVICE_ATTACHMENT_URI
```

The advantage of PSC over VPC peering is that you get a single, predictable IP address for the endpoint, which simplifies firewall rules and network policies.

## Network Firewall Configuration

Even with private endpoints, you should restrict which resources in your VPC can call the endpoint.

This creates a firewall rule to allow only specific subnets:

```bash
# Allow prediction traffic only from the application subnet
gcloud compute firewall-rules create allow-vertex-ai-prediction \
    --network=your-vpc-network \
    --direction=EGRESS \
    --action=ALLOW \
    --rules=tcp:80 \
    --destination-ranges=10.0.0.0/16 \
    --target-tags=vertex-ai-caller \
    --priority=1000

# Deny all other traffic to the Vertex AI IP range
gcloud compute firewall-rules create deny-vertex-ai-default \
    --network=your-vpc-network \
    --direction=EGRESS \
    --action=DENY \
    --rules=tcp:80 \
    --destination-ranges=10.0.0.0/16 \
    --priority=2000
```

## Monitoring Private Endpoint Traffic

Monitor your private endpoint to ensure traffic is flowing through the private path and not accidentally hitting public endpoints.

```python
from google.cloud import monitoring_v3
import datetime

def check_private_endpoint_metrics(project_id, endpoint_id):
    """Query prediction metrics for a private endpoint."""
    client = monitoring_v3.MetricServiceClient()
    now = datetime.datetime.now(datetime.timezone.utc)

    interval = monitoring_v3.TimeInterval({
        "start_time": {"seconds": int((now - datetime.timedelta(hours=1)).timestamp())},
        "end_time": {"seconds": int(now.timestamp())}
    })

    # Check private response count
    results = client.list_time_series(
        request={
            "name": f"projects/{project_id}",
            "filter": (
                f'resource.type="aiplatform.googleapis.com/Endpoint" '
                f'AND resource.labels.endpoint_id="{endpoint_id}" '
                f'AND metric.type="aiplatform.googleapis.com/prediction/online/private/response_count"'
            ),
            "interval": interval,
            "aggregation": monitoring_v3.Aggregation(
                alignment_period={"seconds": 3600},
                per_series_aligner=monitoring_v3.Aggregation.Aligner.ALIGN_SUM
            )
        }
    )

    for series in results:
        for point in series.points:
            print(f"Responses in last hour: {point.value.int64_value}")

check_private_endpoint_metrics("your-project-id", "ENDPOINT_ID")
```

## Troubleshooting Private Endpoints

The most common issue is connectivity failures. If your client cannot reach the private endpoint, check these things in order.

First, verify the VPC peering is active. Run `gcloud compute networks peerings list --network=your-vpc-network` and confirm the state is ACTIVE.

Second, check that your client VM or GKE cluster is in the same VPC network (or a connected network) as the one you peered.

Third, verify that you are using the private inference URI from the deployed model and calling it from within the VPC or connected network.

Fourth, check firewall rules. Ensure egress traffic to the reserved IP range is allowed from your client's subnet.

Private endpoints add a layer of security that many regulated industries require. The setup is more involved than public endpoints, but once configured, the prediction payload workflow is similar - your application uses the private endpoint path instead of the public endpoint path.
