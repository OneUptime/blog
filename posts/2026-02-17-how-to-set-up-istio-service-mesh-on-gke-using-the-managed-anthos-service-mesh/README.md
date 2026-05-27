# How to Set Up Istio Service Mesh on GKE Using the Managed Anthos Service Mesh

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, GKE, Istio, Anthos Service Mesh, Service Mesh, Kubernetes, Microservice

Description: A complete guide to setting up Istio-based service mesh on GKE using Google's managed Anthos Service Mesh for traffic management, security, and observability.

---

Running a service mesh on Kubernetes is powerful but historically painful. Installing Istio from scratch means managing control plane upgrades, debugging configuration drift, and spending more time on infrastructure than on your actual application. Google's Cloud Service Mesh, formerly Anthos Service Mesh (ASM), changes that equation by giving you a fully managed Istio-based service mesh on GKE.

With managed ASM, Google handles the control plane lifecycle, upgrades, and scaling. You get all the benefits of Istio - mutual TLS, traffic management, observability - without the operational overhead of running the control plane yourself.

## Prerequisites

Before you start, make sure you have:

- A GKE cluster running a supported GKE version in a supported region
- The cluster should have Workload Identity enabled
- Enough node capacity for the managed mesh components and the sidecar proxies your workloads will run

Enable the required APIs:

```bash
# Enable the APIs needed for Anthos Service Mesh

gcloud services enable mesh.googleapis.com --project=my-project
```

## Enabling Fleet Membership

Managed ASM requires your cluster to be registered with a fleet. If your cluster is not already registered, do it now:

```bash
# Register the GKE cluster with the fleet
gcloud container clusters update my-cluster \
  --location us-central1-a \
  --fleet-project=my-project
```

Verify the membership:

```bash
# Check that the cluster appears in the fleet
gcloud container fleet memberships list
```

## Enabling Managed Anthos Service Mesh

Now enable the service mesh feature on the fleet:

```bash
# Enable the mesh feature for the fleet
gcloud container fleet mesh enable --project=my-project
```

Then apply the managed control plane configuration to your cluster membership:

```bash
# Enable automatic management of the service mesh for this cluster
gcloud container fleet mesh update \
  --management automatic \
  --memberships my-cluster \
  --project my-project \
  --location us-central1
```

The `automatic` management mode means Google will handle control plane provisioning and upgrades. This is the recommended option for most users. The `--location` value is the fleet membership location, which is usually the cluster region for a newly registered zonal cluster.

Check the status of the mesh provisioning:

```bash
# Check the provisioning status of the service mesh
gcloud container fleet mesh describe --project my-project
```

Wait until the status shows `ACTIVE` before proceeding.

## Enabling Sidecar Injection

The service mesh works by injecting an Envoy sidecar proxy into each pod. You enable this per namespace by adding a label.

For managed ASM, the label format depends on the revision. Find the current revision:

```bash
# List the control plane revisions available in the cluster
kubectl get controlplanerevision -n istio-system
```

Then label your namespace to enable automatic sidecar injection:

```bash
# Enable sidecar injection for the default namespace
kubectl label namespace default istio-injection=enabled --overwrite
kubectl label namespace default istio.io/rev- --overwrite
```

For revision-based injection (which gives you more control over upgrades):

```bash
# Enable injection using a specific ASM revision
kubectl label namespace default istio-injection- istio.io/rev=asm-managed --overwrite
```

Use the revision value from the `controlplanerevision` output, such as `asm-managed`, `asm-managed-rapid`, or `asm-managed-stable`.

After labeling the namespace, restart your existing pods so they pick up the sidecar:

```bash
# Restart deployments to inject the sidecar proxy
kubectl rollout restart deployment -n default
```

## Verifying the Mesh

Check that sidecars are running alongside your application containers:

```bash
# Verify pods have 2 containers (app + sidecar) instead of 1
kubectl get pods -n default
```

Each pod should show 2/2 in the READY column - one for your application container and one for the Envoy sidecar.

## Configuring Mutual TLS

One of the biggest benefits of a service mesh is automatic mutual TLS between services. With managed ASM, mTLS is enabled in permissive mode by default, meaning services accept both plain text and mTLS traffic.

To enforce strict mTLS across the entire mesh, apply a PeerAuthentication policy:

```yaml
# strict-mtls.yaml - Enforce mTLS for all services in the mesh
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

Apply it:

```bash
kubectl apply -f strict-mtls.yaml
```

You can also set mTLS mode per namespace or per workload if you need more granular control.

## Traffic Management

Service mesh gives you fine-grained control over traffic routing. Here is an example of splitting traffic between two versions of a service for a canary deployment.

First, define the available versions with a DestinationRule:

```yaml
# destination-rule.yaml - Define subsets for different versions of the service
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service
spec:
  host: my-service
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
```

Then create a VirtualService to split traffic:

```yaml
# virtual-service.yaml - Route 90% of traffic to v1 and 10% to v2
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-service
spec:
  hosts:
    - my-service
  http:
    - route:
        - destination:
            host: my-service
            subset: v1
          weight: 90
        - destination:
            host: my-service
            subset: v2
          weight: 10
```

## Observability

Managed ASM integrates with Cloud Monitoring and Cloud Logging out of the box, and can integrate with Cloud Trace when tracing is enabled. You can view service-level metrics in the Google Cloud Console under Cloud Service Mesh.

The mesh automatically collects metrics like request count, latency, and error rate for HTTP service-to-service traffic. You can view the service topology, identify bottlenecks, and trace requests across services when tracing is configured.

For access logging customization, managed Cloud Service Mesh supports a cluster-wide Telemetry resource in the root namespace:

```yaml
# telemetry.yaml - Configure access logging for all sidecars
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: mesh-default
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: stackdriver
```

## Authorization Policies

Control which services can talk to each other using AuthorizationPolicy:

```yaml
# auth-policy.yaml - Only allow the frontend service to call the backend
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: backend-policy
  namespace: default
spec:
  selector:
    matchLabels:
      app: backend
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/default/sa/frontend"]
      to:
        - operation:
            methods: ["GET", "POST"]
```

## Upgrading the Mesh

With managed ASM, control plane upgrades happen automatically. If the managed data plane is enabled, Google also rolls out new proxy versions according to the release channel your cluster is on. You can check the current version:

```bash
# Check the current ASM control plane version
kubectl get controlplanerevision -n istio-system -o yaml
```

If you need to control the upgrade timing, you can use a revision-based approach where you test the new version in a staging namespace before rolling it out to production.

## Practical Considerations

The sidecar proxies add latency and resource consumption. Their resource usage depends on traffic volume, cluster mode, and any custom injection settings. For large clusters with hundreds of pods, this adds up. Plan your node capacity accordingly.

Not every workload needs to be in the mesh. Jobs, CronJobs, and batch processing workloads often do not benefit from mesh features. You can exclude specific pods by annotating them with `sidecar.istio.io/inject: "false"`.

Managed ASM gives you the power of Istio without the operational burden. It is the most practical way to run a service mesh on GKE, and it keeps getting better with each release.
