# How to Debug Virtual Machine Workloads in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Virtual Machines, Debugging, Service Mesh, Kubernetes

Description: A hands-on guide to troubleshooting Istio service mesh integration with virtual machine workloads running outside Kubernetes clusters.

---

Running Istio with virtual machines is one of the more advanced deployment patterns. You've got workloads outside Kubernetes that need to participate in the mesh - maybe legacy apps, databases, or services that can't be containerized yet. When things work, it's seamless. When they don't, debugging requires understanding a few extra moving parts that don't exist in pure Kubernetes deployments.

## How VM Integration Works

Before debugging, here's the quick rundown of the VM mesh architecture. A VM joins the Istio mesh by running an Envoy proxy that connects back to Istiod in the Kubernetes cluster. The key components are:

- **WorkloadEntry** - A Kubernetes resource that represents the VM workload, similar to how a Pod represents a container
- **WorkloadGroup** - A template for WorkloadEntries, like a Deployment is for Pods
- **Istio agent (pilot-agent)** - Runs on the VM alongside Envoy, handles bootstrapping, certificate rotation, and health checking
- **East-West Gateway** - An Istio gateway that exposes Istiod to VMs outside the cluster

The VM runs pilot-agent, which bootstraps Envoy with certificates and connects to Istiod through the east-west gateway to receive configuration.

## Checking VM Registration

First, verify that the VM registered with the mesh. Check for WorkloadEntries:

```bash
kubectl get workloadentries -n vm-namespace
```

You should see entries corresponding to your VMs:

```text
NAME              AGE    ADDRESS
my-vm-10.0.1.5   2d     10.0.1.5
```

If the WorkloadEntry is missing, the VM either hasn't started its Istio agent or failed to register. Check the WorkloadGroup:

```bash
kubectl get workloadgroup -n vm-namespace -o yaml
```

```yaml
apiVersion: networking.istio.io/v1
kind: WorkloadGroup
metadata:
  name: my-vm-group
  namespace: vm-namespace
spec:
  metadata:
    labels:
      app: my-vm-app
      version: v1
  template:
    serviceAccount: my-vm-sa
    network: vm-network
  probe:
    httpGet:
      path: /healthz
      port: 8080
    periodSeconds: 10
```

Make sure the serviceAccount exists and has the right permissions:

```bash
kubectl get serviceaccount my-vm-sa -n vm-namespace
```

## Debugging the VM-Side Agent

SSH into the VM and check the Istio agent status:

```bash
sudo systemctl status istio
```

Check the agent logs:

```bash
sudo journalctl -u istio -f --no-pager
```

Common errors you'll see:

**Certificate bootstrap failure.** The agent needs an initial token to authenticate with Istiod and get its first certificate. Check that the token file exists:

```bash
ls -la /var/run/secrets/tokens/istio-token
```

If it's missing or expired, regenerate it. The token is typically created during the VM onboarding process:

```bash
istioctl x workload entry configure \
  -f workloadgroup.yaml \
  -o /tmp/vm-config \
  --clusterID Kubernetes \
  --autoregister
```

This generates the files needed on the VM, including the bootstrap token, mesh config, and root certificate.

**Connection to Istiod failed.** The agent needs to reach Istiod through the east-west gateway. Check connectivity:

```bash
# From the VM
curl -v https://eastwest-gateway-ip:15012
```

If this times out, there's a network issue between the VM and the gateway. Check firewalls, security groups, and routing tables.

Verify the east-west gateway is running:

```bash
kubectl get svc -n istio-system istio-eastwestgateway
```

```bash
kubectl get pods -n istio-system -l istio=eastwestgateway
```

The gateway should have an external IP or load balancer address that the VM can reach.

## Checking Envoy on the VM

The Envoy proxy on the VM should be running and connected to Istiod. Check its status:

```bash
# On the VM
curl -s localhost:15000/server_info | python3 -m json.tool
```

Check if Envoy is receiving config from Istiod:

```bash
curl -s localhost:15000/config_dump | python3 -m json.tool | head -50
```

If the config dump is mostly empty (no clusters, no listeners), Envoy isn't connected to Istiod.

Check Envoy's connectivity to the control plane:

```bash
curl -s localhost:15000/clusters | grep xds
```

You should see xDS cluster entries pointing to Istiod through the east-west gateway.

## Verifying from the Cluster Side

From within the cluster, check if Istiod sees the VM proxy:

```bash
istioctl proxy-status
```

The VM should appear in the list with its WorkloadEntry name. If it's missing, Istiod hasn't received a connection from the VM's Envoy proxy.

If it appears but shows STALE:

```bash
istioctl proxy-status my-vm-10.0.1.5.vm-namespace
```

This shows what config is out of sync between Istiod and the VM proxy.

## DNS Resolution Issues

VMs need to resolve Kubernetes service names. Istio handles this by configuring Envoy's DNS proxy on the VM. Check if DNS is working:

```bash
# On the VM - this should resolve through Envoy
curl http://my-service.default.svc.cluster.local:8080/
```

If DNS resolution fails, check that the Istio DNS proxy is enabled in the mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
        ISTIO_META_DNS_AUTO_ALLOCATE: "true"
```

On the VM, verify that iptables rules are redirecting DNS traffic:

```bash
sudo iptables -t nat -L -n | grep 15053
```

You should see rules redirecting port 53 traffic to Envoy's DNS listener on port 15053.

## Network Connectivity

VM networking is the most common source of problems. The VM needs:

1. Outbound access to the east-west gateway (port 15012 for xDS, port 15443 for mTLS data plane)
2. If using auto-registration, outbound access on port 15012
3. Inbound access from cluster pods (through the east-west gateway) on the application port

Test connectivity step by step:

```bash
# From VM to east-west gateway (control plane)
nc -zv eastwest-gateway-ip 15012

# From VM to east-west gateway (data plane)
nc -zv eastwest-gateway-ip 15443
```

From a pod in the cluster, test reaching the VM:

```bash
kubectl exec sleep-pod -- curl http://my-vm-service.vm-namespace:8080/
```

If the pod can't reach the VM, check the ServiceEntry or auto-generated service:

```bash
kubectl get serviceentries -n vm-namespace
```

## Health Check Failures

If you defined health probes in the WorkloadGroup, failed checks affect the VM's status:

```bash
kubectl get workloadentry my-vm-10.0.1.5 -n vm-namespace -o yaml
```

Look at the conditions:

```yaml
status:
  conditions:
  - type: Healthy
    status: "False"
    lastTransitionTime: "2024-01-15T10:30:00Z"
```

An unhealthy WorkloadEntry means endpoints won't be sent to other proxies. Check that the health endpoint on the VM actually works:

```bash
# On the VM
curl localhost:8080/healthz
```

## mTLS Between VM and Cluster

By default, traffic between the VM and cluster pods uses mTLS through the east-west gateway. If mTLS is failing, check certificates on the VM:

```bash
# On the VM
ls -la /var/run/secrets/workload-spiffe-credentials/
```

You should see `cert-chain.pem`, `key.pem`, and `root-cert.pem`. Check the certificate:

```bash
openssl x509 -in /var/run/secrets/workload-spiffe-credentials/cert-chain.pem -text -noout
```

Verify the SPIFFE identity matches what you expect:

```text
Subject Alternative Name:
  URI:spiffe://cluster.local/ns/vm-namespace/sa/my-vm-sa
```

If the certificate is expired, the Istio agent should auto-rotate it. Check the agent logs for rotation errors.

## Debugging with Proxy Config

Just like with pods, you can inspect the VM's Envoy configuration:

```bash
istioctl proxy-config listeners my-vm-10.0.1.5.vm-namespace
istioctl proxy-config routes my-vm-10.0.1.5.vm-namespace
istioctl proxy-config clusters my-vm-10.0.1.5.vm-namespace
istioctl proxy-config endpoints my-vm-10.0.1.5.vm-namespace
```

These work the same as for pod-based proxies. If the VM proxy doesn't have the expected listeners or routes, the issue is in the config pushed from Istiod.

## Summary

Debugging VM workloads in Istio boils down to checking three things: is the VM agent running and connected, can the VM reach Istiod and vice versa, and are the certificates valid. The east-west gateway adds a layer of indirection that can fail independently. Work through the connectivity chain methodically - agent to gateway, gateway to Istiod, and then data plane traffic in both directions - and you'll find the problem.
