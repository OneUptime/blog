# Validation Summary: How to Deploy Proxyless gRPC with Traffic Director on Google Cloud

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Google Cloud Traffic Director / Cloud Service Mesh
- Google Kubernetes Engine
- Proxyless gRPC and xDS
- Google Cloud Network Endpoint Groups
- Google Cloud CLI
- Workload Identity Federation for GKE
- Go gRPC

## Sources Consulted
- Cloud Service Mesh with proxyless gRPC services overview: https://cloud.google.com/service-mesh/docs/service-routing/proxyless-overview
- Set up Google Kubernetes Engine and proxyless gRPC services: https://docs.cloud.google.com/service-mesh/legacy/load-balancing-apis/set-up-proxyless-gke
- Configure advanced traffic management with proxyless gRPC services: https://docs.cloud.google.com/service-mesh/legacy/load-balancing-apis/proxyless-configure-advanced-traffic-management
- Prepare to set up Cloud Service Mesh with proxyless gRPC services: https://docs.cloud.google.com/service-mesh/legacy/load-balancing-apis/prepare-proxyless-grpc
- Authenticate to Google Cloud APIs from GKE workloads: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- gRPC Go basics tutorial: https://grpc.io/docs/languages/go/basics/
- gRPC health checking guide: https://grpc.io/docs/guides/health-checking/
- Go package documentation for google.golang.org/grpc/xds: https://pkg.go.dev/google.golang.org/grpc/xds

## Issues Found
- The client target used `xds:///grpc-backend` without a port. In proxyless gRPC, an omitted port defaults to 80, but the forwarding rule was configured for 50051. Updated the Kubernetes env var and Go fallback target to `xds:///grpc-backend:50051`.
- The URL map only had a default service. Official Traffic Director examples configure a host rule matching the `xds:///hostname:port` target, so I added `gcloud compute url-maps add-path-matcher` with `--new-hosts=grpc-backend:50051`.
- The setup lacked a firewall rule and node tag for Google Cloud health check probes. Added the `allow-health-checks` node tag and a firewall rule for the documented probe ranges.
- The gRPC health check used a fixed port rather than the serving port. Updated it to `--use-serving-port`, matching the GKE NEG proxyless setup guidance.
- The server example used `xds.NewGRPCServer()` and an xDS bootstrap even though the documented load-balancing setup only requires the client to use xDS; the backend server is registered through the NEG and can be a standard gRPC server. Updated the server deployment and Go server code accordingly.
- The health service only set status for `echo.EchoService`. Because the Google Cloud health check command did not specify a gRPC service name, the server should report overall health for the empty service name. Added `healthServer.SetServingStatus("", SERVING)`.
- The Go client used deprecated `grpc.Dial`. Updated it to the current `grpc.NewClient` API shown in the official Go gRPC documentation.
- The bootstrap generator version was `0.16.0` in the legacy load-balancing flow. Updated it to `0.19.0`, which is the current version shown by the official GKE proxyless guide for this setup.
- The prerequisites did not enable required APIs. Added `gcloud services enable` for GKE, Compute Engine, IAM Credentials, and Traffic Director.
- The wrap-up said Traffic Director's "full" traffic management capabilities were available. Updated this to "supported" capabilities because proxyless gRPC has compatibility limits compared with Envoy-based meshes.

## Review Notes
The post still uses the Traffic Director name, while current Google Cloud documentation increasingly presents this functionality under Cloud Service Mesh. The underlying API examples remain valid, but a future editorial refresh could align terminology more closely with current product naming.
