# Validation Summary: How to Fix Cloud SQL Private IP Instance Not Accessible from GKE Pods

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Google Cloud SQL
- Google Kubernetes Engine (GKE)
- Private services access
- VPC Network Peering
- Google Cloud VPC firewall rules
- Kubernetes pods and deployments
- Cloud SQL Auth Proxy
- gcloud CLI
- kubectl

## Sources Consulted
- Google Cloud SQL documentation: Configure private IP - https://cloud.google.com/sql/docs/mysql/configure-private-ip
- Google Cloud SQL documentation: Connect from Google Kubernetes Engine - https://cloud.google.com/sql/docs/mysql/connect-kubernetes-engine
- Google Cloud SQL documentation: Cloud SQL Auth Proxy - https://cloud.google.com/sql/docs/mysql/sql-proxy
- Google Cloud VPC documentation: Private services access - https://cloud.google.com/vpc/docs/private-services-access
- Google Cloud VPC documentation: Configure private services access - https://cloud.google.com/vpc/docs/configure-private-services-access
- Google Cloud VPC documentation: VPC firewall rules - https://cloud.google.com/firewall/docs/firewalls
- Google Cloud SDK reference: `gcloud services vpc-peerings` - https://cloud.google.com/sdk/gcloud/reference/services/vpc-peerings
- Google Cloud SDK reference: `gcloud compute networks peerings update` - https://cloud.google.com/sdk/gcloud/reference/compute/networks/peerings/update
- Kubernetes documentation: `kubectl run` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes documentation: `kubectl exec` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The post said a GKE cluster could be in a VPC peered to the Cloud SQL VPC. Private services access uses VPC peering to the Google-managed service producer network, and VPC peering is not transitive, so this was misleading for the normal Cloud SQL private IP path. Changed this to same VPC or Shared VPC.
- The firewall section implied a missing allow rule is normally a problem and gave an egress rule without a Cloud SQL destination range. Google Cloud VPC networks have an implied allow egress rule unless a deny or restrictive egress policy overrides it, and egress rules should constrain the destination range. Updated the explanation and command to include `--destination-ranges`.
- The route export section said private clusters generally need custom route export. Official private services access guidance only requires exporting custom routes for custom routed ranges, such as privately used public IP ranges or other non-subnet ranges. Updated the explanation and command to focus on `--export-custom-routes`.
- The Cloud SQL Auth Proxy section said the proxy handles private IP routing and avoids many networking issues. With `--private-ip`, the pod still needs VPC reachability to the instance private IP. Updated the text to say the proxy handles IAM authorization and SSL/TLS encryption while still requiring private-network connectivity.
- The Cloud SQL Auth Proxy example used the floating `latest` image tag and omitted an explicit port. Updated the example to a pinned v2 image tag and added `--port=5432` to match the application environment variable.
- The debugging flowchart repeated the same overbroad VPC peering and route export assumptions. Updated those labels to match the corrected guidance.

## Review Notes
Local `gcloud` help could not be checked because the Cloud SDK is not installed in this environment, so CLI details were verified against official Google Cloud SDK reference pages instead.
