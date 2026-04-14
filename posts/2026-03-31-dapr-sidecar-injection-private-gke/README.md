# How to Fix Dapr Sidecar Injection on Private GKE Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, GKE, Kubernetes, Sidecar Injection, Private Cluster

Description: Fix Dapr sidecar injection failures on private GKE clusters by configuring firewall rules to allow the admission webhook traffic.

---

Private GKE clusters restrict communication between the control plane and node pools. This breaks Dapr's admission webhook, which requires the GKE control plane to reach the sidecar injector service on your nodes.

## Why Private GKE Clusters Break Dapr Injection

In a standard GKE cluster, the Kubernetes API server (control plane) can reach node pods directly. In a private cluster, the control plane is in a separate VPC and can only reach nodes on specific ports allowed by firewall rules.

Dapr's admission webhook listens on port 4000 (injector) by default. If GKE's control plane cannot reach this port, pod creation hangs and times out:

```text
Error from server (Timeout): error when creating "deployment.yaml":
Timeout: request did not complete within requested timeout
```

## Creating the Firewall Rule

Find your cluster's master IP range:

```bash
gcloud container clusters describe <cluster-name> \
  --zone <zone> \
  --format="value(privateClusterConfig.masterIpv4CidrBlock)"
```

Get the node network tag:

```bash
gcloud container clusters describe <cluster-name> \
  --zone <zone> \
  --format="value(nodeConfig.tags)"
```

Create the firewall rule allowing the control plane to reach the Dapr webhook:

```bash
gcloud compute firewall-rules create allow-dapr-webhook \
  --network <your-vpc-network> \
  --allow tcp:4000 \
  --source-ranges <master-ip-cidr> \
  --target-tags <node-network-tag> \
  --description "Allow GKE control plane to reach Dapr sidecar injector webhook"
```

## Verifying the Webhook Service Port

Confirm what port the Dapr injector service uses:

```bash
kubectl get svc dapr-sidecar-injector -n dapr-system \
  -o jsonpath='{.spec.ports[*].port}'
```

If you installed Dapr via Helm and customized the port, check your Helm values:

```bash
helm get values dapr -n dapr-system | grep -i port
```

## Alternative: Adjust the Webhook Failure Policy

If you cannot modify firewall rules immediately, you can set the webhook failure policy so that pod creation proceeds even when the injector is unreachable. GKE private clusters allow ports 443 and 10250 from the control plane by default, and the Dapr injector listens on port 4000, which is not in this list:

```bash
helm upgrade dapr dapr/dapr -n dapr-system \
  --set dapr_sidecar_injector.webhookFailurePolicy=Ignore \
  --reuse-values
```

Note that with this setting, pods will start without Dapr sidecars when the injector is unreachable. This is a temporary workaround, not a fix. The recommended solution is the firewall rule described above.

## Using Autopilot GKE

GKE Autopilot manages node infrastructure and firewall rules automatically. You can still create VPC firewall rules that apply to Autopilot node network tags. Use the same approach as standard private clusters: identify the control plane CIDR and node network tags, then create a firewall rule allowing TCP port 4000. Verify the rule is applied by testing sidecar injection on a sample pod.

## Testing After the Fix

Create a test deployment with Dapr enabled and verify injection occurs:

```bash
kubectl run test-dapr \
  --image=nginx \
  --annotations="dapr.io/enabled=true,dapr.io/app-id=test"

kubectl describe pod test-dapr | grep daprd
```

The pod should show the `daprd` sidecar container.

## Summary

Dapr sidecar injection on private GKE clusters requires a firewall rule allowing the GKE control plane IP range to reach the Dapr injector service on port 4000. Identify your master IP CIDR and node network tags, create the firewall rule, and verify injection works on a test pod. This is a one-time setup required for all private GKE clusters running Dapr.
