# Validation Summary: How to Implement Private Endpoints for Vertex AI Prediction with VPC Peering

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Vertex AI online prediction
- Vertex AI private services access endpoints
- VPC Network Peering / Private Services Access
- Private Service Connect
- Google Cloud CLI
- Vertex AI Python SDK
- Google Kubernetes Engine and Workload Identity
- Cloud Monitoring
- Google Cloud firewall rules

## Sources Consulted
- Vertex AI: Use private services access endpoints for online inference: https://docs.cloud.google.com/vertex-ai/docs/predictions/using-private-endpoints
- Vertex AI: Set up VPC Network Peering: https://docs.cloud.google.com/vertex-ai/docs/general/vpc-peering
- Vertex AI: Use dedicated private endpoints based on Private Service Connect for online inference: https://docs.cloud.google.com/vertex-ai/docs/predictions/private-service-connect
- Vertex AI Python SDK: `google.cloud.aiplatform.PrivateEndpoint`: https://cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.PrivateEndpoint
- Vertex AI Python SDK: `google.cloud.aiplatform.Endpoint`: https://docs.cloud.google.com/python/docs/reference/aiplatform/latest/google.cloud.aiplatform.Endpoint
- Vertex AI prebuilt containers for inference: https://docs.cloud.google.com/vertex-ai/docs/predictions/pre-built-containers
- Google Cloud CLI reference: `gcloud services vpc-peerings connect`: https://docs.cloud.google.com/sdk/gcloud/reference/services/vpc-peerings/connect

## Issues Found
- The post described clients connecting to an internal IP and said data never leaves the VPC. I changed this to describe the private inference URI and private Google network path, because private services access uses peering to a Google service producer network and does not expose the endpoint through a simple client-owned internal IP.
- The explanation said Vertex AI establishes VPC peering when creating the endpoint. I changed it to say the endpoint uses the already configured private services access peering connection.
- The peering verification command used `gcloud services vpc-peerings list`. I changed it to `gcloud compute networks peerings list`, matching the Vertex AI private endpoint documentation's status check.
- The Python samples used `aiplatform.Endpoint` for private endpoints. I changed them to `aiplatform.PrivateEndpoint`, which is the SDK class documented for Vertex AI private endpoints.
- The network resource example used a project ID where the Vertex AI private services access docs show a project-number form for the fully qualified network name. I changed the placeholder to `your-project-number`.
- The model deployment section claimed private endpoint deployment works the same as public endpoints and included `traffic_percentage=100`. I changed the prose to mention one model per private services access endpoint and no traffic splitting, and removed the traffic split argument from the sample.
- The scikit-learn prebuilt prediction container used `sklearn-cpu.1-3`, whose end of availability has passed. I updated it to the currently supported `sklearn-cpu.1-5:latest` image.
- The GKE Workload Identity example omitted the Kubernetes service account creation and annotation. I added both commands and clarified that the Google service account needs the Vertex AI role.
- The Private Service Connect command tried to create a forwarding rule directly with a placeholder service attachment. I changed the snippet to show retrieving the generated service attachment after model deployment, reserving an internal address, and creating the forwarding rule with that service attachment.
- The firewall example allowed ports `443` and `8080` for private services access endpoints. I changed it to `tcp:80`, matching the documented HTTP private inference URI for private services access endpoints.
- The monitoring sample queried the public online prediction count metric. I changed it to the documented private endpoint metric `aiplatform.googleapis.com/prediction/online/private/response_count`.
- The troubleshooting section referred to internal DNS resolution and repeated the old peering verification command. I changed it to focus on using the private inference URI from the deployed model and checking peering with `gcloud compute networks peerings list`.
- The closing paragraph said application code does not need to change at all. I changed it to say the prediction payload workflow is similar, but the application uses the private endpoint path.

## Review Notes
The `gcloud` CLI was not installed in the local environment, so command validation was performed against official Google Cloud CLI and Vertex AI documentation rather than local `--help` output.
