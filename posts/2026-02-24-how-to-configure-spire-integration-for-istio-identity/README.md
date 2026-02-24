# How to Configure SPIRE Integration for Istio Identity

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, SPIRE, Identity, Security, Service Mesh, SPIFFE

Description: Learn how to integrate SPIRE with Istio for robust workload identity management using SPIFFE standards and custom certificate authorities.

---

Istio ships with its own certificate authority called istiod, which handles identity provisioning for workloads in the mesh. But if your organization already uses SPIRE (the SPIFFE Runtime Environment) for workload identity, you probably want Istio to leverage that existing infrastructure instead of running a parallel identity system.

SPIRE provides a production-grade implementation of the SPIFFE specification, giving you fine-grained control over workload attestation, identity federation, and certificate lifecycle. Plugging it into Istio means your mesh identities come from SPIRE rather than istiod's built-in CA.

## Why Use SPIRE with Istio

There are a few solid reasons to consider this integration:

- You already run SPIRE across your infrastructure and want a single identity plane
- You need workload attestation that goes beyond what Istio provides natively (kernel-level, process-level attestation)
- You want to federate identities across trust domains without Istio's multi-cluster setup
- Compliance requirements demand a specific CA hierarchy that SPIRE already manages

## Prerequisites

Before starting, make sure you have:

- A Kubernetes cluster with Istio 1.14+ installed
- SPIRE server and agents deployed in the cluster
- `istioctl` and `kubectl` configured
- Familiarity with SPIFFE ID format: `spiffe://<trust-domain>/<workload-identifier>`

## Installing SPIRE on Kubernetes

If you do not already have SPIRE running, deploy it first. The SPIRE project provides Helm charts that make this straightforward.

```bash
helm repo add spire https://spiffe.github.io/helm-charts-hardened/
helm repo update

helm install spire-crds spire/spire-crds \
  --namespace spire-system \
  --create-namespace

helm install spire spire/spire \
  --namespace spire-system \
  --set global.spire.trustDomain="example.org"
```

Verify the SPIRE server is running:

```bash
kubectl get pods -n spire-system
```

You should see the SPIRE server and agent pods in a Running state.

## Configuring SPIRE for Istio Integration

SPIRE needs to know about Istio workloads and issue them SVID (SPIFFE Verifiable Identity Document) certificates. The key piece is configuring a registration entry for Istio's workloads.

Create a SPIRE registration entry that matches Istio sidecar workloads:

```bash
kubectl exec -n spire-system spire-server-0 -- \
  /opt/spire/bin/spire-server entry create \
  -spiffeID spiffe://example.org/ns/default/sa/default \
  -parentID spiffe://example.org/spire/agent/k8s_psat/demo-cluster \
  -selector k8s:ns:default \
  -selector k8s:sa:default
```

For broader coverage across namespaces, you can create entries that match by namespace:

```bash
kubectl exec -n spire-system spire-server-0 -- \
  /opt/spire/bin/spire-server entry create \
  -spiffeID spiffe://example.org/ns/istio-system/sa/istiod \
  -parentID spiffe://example.org/spire/agent/k8s_psat/demo-cluster \
  -selector k8s:ns:istio-system \
  -selector k8s:sa:istiod
```

## Configuring Istio to Use SPIRE

Istio supports custom certificate providers through its SDS (Secret Discovery Service) API. To point Istio at SPIRE, you configure the mesh to use SPIRE's Workload API socket instead of the default istiod CA.

Install or update Istio with the SPIRE integration enabled:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-spire
spec:
  profile: default
  meshConfig:
    caCertificates: []
  values:
    pilot:
      env:
        PILOT_CERT_PROVIDER: spiffe
    global:
      caAddress: ""
  components:
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          overlays:
            - apiVersion: apps/v1
              kind: Deployment
              name: istio-ingressgateway
              patches:
                - path: spec.template.spec.volumes[+]
                  value:
                    name: spire-agent-socket
                    hostPath:
                      path: /run/spire/sockets
                      type: DirectoryOrCreate
                - path: spec.template.spec.containers[0].volumeMounts[+]
                  value:
                    name: spire-agent-socket
                    mountPath: /run/spire/sockets
                    readOnly: true
```

Apply this configuration:

```bash
istioctl install -f istio-spire-config.yaml -y
```

## Mounting the SPIRE Agent Socket in Sidecars

Every Envoy sidecar needs access to the SPIRE agent's Workload API socket. You achieve this by configuring the sidecar injection template to mount the SPIRE agent socket.

Add an annotation to your namespaces or pods to include the SPIRE volume mount:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: my-app
  labels:
    istio-injection: enabled
```

Then patch the Istio sidecar injector to include the SPIRE socket volume:

```bash
kubectl get configmap istio-sidecar-injector -n istio-system -o yaml > injector.yaml
```

In the sidecar injector template, add the volume and volume mount for the SPIRE socket. The relevant section should include:

```yaml
volumes:
  - name: spire-agent-socket
    hostPath:
      path: /run/spire/sockets
      type: DirectoryOrCreate
containers:
  - name: istio-proxy
    volumeMounts:
      - name: spire-agent-socket
        mountPath: /run/spire/sockets
        readOnly: true
    env:
      - name: PILOT_CERT_PROVIDER
        value: spiffe
```

## Verifying the Integration

After deploying a workload, check that the sidecar is getting its identity from SPIRE rather than istiod.

Deploy a test application:

```bash
kubectl apply -f samples/httpbin/httpbin.yaml -n my-app
```

Check the certificate chain on the sidecar:

```bash
istioctl proxy-config secret httpbin-pod-name -n my-app
```

The output should show certificates with SPIFFE URIs matching your SPIRE trust domain:

```
RESOURCE NAME   TYPE           STATUS   VALID CERT   SERIAL NUMBER   NOT AFTER   NOT BEFORE
default         Cert Chain     ACTIVE   true         abc123...       2026-02-25  2026-02-24
ROOTCA          CA             ACTIVE   true         def456...       2027-02-24  2026-02-24
```

You can also inspect the actual certificate:

```bash
istioctl proxy-config secret httpbin-pod-name -n my-app -o json | \
  jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl x509 -text -noout
```

Look for the Subject Alternative Name field - it should contain a SPIFFE URI like `spiffe://example.org/ns/my-app/sa/httpbin`.

## Handling Registration Entry Automation

Manually creating SPIRE registration entries for every workload is not practical at scale. The SPIRE project provides a Kubernetes workload registrar that automates this.

Deploy the SPIRE Kubernetes Registrar:

```bash
helm install spire-registrar spire/spire \
  --namespace spire-system \
  --set k8sWorkloadRegistrar.enabled=true
```

The registrar watches for new pods and automatically creates SPIRE registration entries based on the pod's service account and namespace. This way, every new Istio sidecar automatically gets a SPIRE-issued identity without manual intervention.

## Troubleshooting Common Issues

**Sidecar fails to start with certificate errors**: Check that the SPIRE agent is running on the same node as the pod. The Workload API socket must be accessible at the expected path.

```bash
kubectl get pods -n spire-system -o wide
```

**SPIFFE ID mismatch**: Make sure the registration entries match the namespace and service account of your workloads. A mismatch means SPIRE will not issue a certificate.

```bash
kubectl exec -n spire-system spire-server-0 -- \
  /opt/spire/bin/spire-server entry show
```

**Certificate rotation not happening**: SPIRE handles rotation automatically, but verify the TTL settings on your registration entries. The default SVID TTL is typically 1 hour.

## Production Considerations

When running this in production, keep a few things in mind. First, SPIRE server should be deployed in high availability mode with a shared datastore (PostgreSQL or MySQL). Single-instance SPIRE server is a single point of failure for all identity in your mesh.

Second, plan your trust domain naming carefully. Changing it later requires re-issuing all identities across the mesh. Use something stable like your organization domain.

Third, monitor SPIRE agent health. If an agent goes down on a node, sidecars on that node cannot get new certificates or rotate existing ones. Set up health checks and alerting for the SPIRE agent DaemonSet.

The SPIRE integration gives you a more flexible and standards-compliant identity layer for Istio. It is more work to set up than the built-in CA, but the benefits around attestation, federation, and centralized identity management make it worthwhile for organizations that need fine-grained identity control.
