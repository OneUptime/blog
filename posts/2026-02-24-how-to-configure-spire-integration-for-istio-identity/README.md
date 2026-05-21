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

- A Kubernetes cluster with a current Istio release installed
- SPIRE server and agents deployed in the cluster
- `istioctl` and `kubectl` configured
- Familiarity with SPIFFE ID format: `spiffe://<trust-domain>/<workload-identifier>`

## Installing SPIRE on Kubernetes

If you do not already have SPIRE running, deploy it first. The SPIRE project provides Helm charts that make this straightforward.

```bash
helm upgrade --install spire-crds spire-crds \
  --repo https://spiffe.github.io/helm-charts-hardened/ \
  --namespace spire-server \
  --create-namespace

helm upgrade --install spire spire \
  --repo https://spiffe.github.io/helm-charts-hardened/ \
  --namespace spire-server \
  --wait \
  --set global.spire.trustDomain="example.org"
```

Verify the SPIRE server is running:

```bash
kubectl get pods -n spire-server
```

You should see the SPIRE server, SPIRE agent, SPIFFE CSI driver, and SPIRE Controller Manager pods in a Running state.

## Configuring SPIRE for Istio Integration

SPIRE needs to know about Istio workloads and issue them SVID (SPIFFE Verifiable Identity Document) certificates. The key piece is configuring registration entries for Istio's workloads. Istio requires workload identities to use the SPIFFE ID format `spiffe://<trust-domain>/ns/<namespace>/sa/<service-account>`.

Create a `ClusterSPIFFEID` that matches Istio sidecar workloads:

```yaml
apiVersion: spire.spiffe.io/v1alpha1
kind: ClusterSPIFFEID
metadata:
  name: istio-sidecar-reg
spec:
  spiffeIDTemplate: "spiffe://{{ .TrustDomain }}/ns/{{ .PodMeta.Namespace }}/sa/{{ .PodSpec.ServiceAccountName }}"
  podSelector:
    matchLabels:
      spiffe.io/spire-managed-identity: "true"
  workloadSelectorTemplates:
    - "k8s:ns:my-app"
```

Create another `ClusterSPIFFEID` for the Istio ingress gateway:

```yaml
apiVersion: spire.spiffe.io/v1alpha1
kind: ClusterSPIFFEID
metadata:
  name: istio-ingressgateway-reg
spec:
  spiffeIDTemplate: "spiffe://{{ .TrustDomain }}/ns/{{ .PodMeta.Namespace }}/sa/{{ .PodSpec.ServiceAccountName }}"
  workloadSelectorTemplates:
    - "k8s:ns:istio-system"
    - "k8s:sa:istio-ingressgateway-service-account"
```

## Configuring Istio to Use SPIRE

Istio supports SPIRE through Envoy's SDS (Secret Discovery Service) API. To point Istio at SPIRE, configure the mesh and sidecar injection template to mount the SPIFFE CSI driver's Envoy-compatible SDS socket. Make sure the Istio trust domain matches SPIRE's trust domain.

Install or update Istio with the SPIRE integration enabled:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-spire
spec:
  profile: default
  meshConfig:
    trustDomain: example.org
  values:
    sidecarInjectorWebhook:
      templates:
        spire: |
          labels:
            spiffe.io/spire-managed-identity: "true"
          spec:
            initContainers:
            - name: istio-proxy
              volumeMounts:
              - name: workload-socket
                mountPath: /run/secrets/workload-spiffe-uds
                readOnly: true
            volumes:
              - name: workload-socket
                csi:
                  driver: "csi.spiffe.io"
                  readOnly: true
  components:
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        label:
          istio: ingressgateway
        k8s:
          overlays:
            - apiVersion: apps/v1
              kind: Deployment
              name: istio-ingressgateway
              patches:
                - path: spec.template.spec.volumes.[name:workload-socket]
                  value:
                    name: workload-socket
                    csi:
                      driver: "csi.spiffe.io"
                      readOnly: true
                - path: spec.template.spec.containers.[name:istio-proxy].volumeMounts.[name:workload-socket]
                  value:
                    name: workload-socket
                    mountPath: /run/secrets/workload-spiffe-uds
                    readOnly: true
```

This sidecar template uses `initContainers` because Kubernetes native sidecars inject `istio-proxy` there. If native sidecar support is disabled in your Istio control plane, change `initContainers` to `containers` in the `spire` template.

Apply this configuration:

```bash
istioctl install --skip-confirmation -f istio-spire-config.yaml
```

## Mounting the SPIRE Agent Socket in Sidecars

Every Envoy sidecar needs access to the SPIRE agent's Envoy SDS socket. You achieve this by using the custom `spire` sidecar injection template from the Istio configuration.

Add a label to your namespace and an annotation to your workloads to include the SPIRE volume mount:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: my-app
  labels:
    istio-injection: enabled
```

Then add the template annotation to your pod spec:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: httpbin
  namespace: my-app
spec:
  template:
    metadata:
      labels:
        spiffe.io/spire-managed-identity: "true"
      annotations:
        inject.istio.io/templates: "sidecar,spire"
```

## Verifying the Integration

After deploying a workload, check that the sidecar is getting its identity from SPIRE rather than istiod.

Deploy a test application:

```bash
kubectl apply -n my-app -f - <<EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: httpbin
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: httpbin
spec:
  replicas: 1
  selector:
    matchLabels:
      app: httpbin
  template:
    metadata:
      labels:
        app: httpbin
        spiffe.io/spire-managed-identity: "true"
      annotations:
        inject.istio.io/templates: "sidecar,spire"
    spec:
      serviceAccountName: httpbin
      containers:
        - name: httpbin
          image: docker.io/kong/httpbin
          ports:
            - containerPort: 80
EOF
```

Check the certificate chain on the sidecar:

```bash
HTTPBIN_POD=$(kubectl get pod -n my-app -l app=httpbin -o jsonpath="{.items[0].metadata.name}")
istioctl proxy-config secret "$HTTPBIN_POD" -n my-app
```

The output should show certificates with SPIFFE URIs matching your SPIRE trust domain:

```text
RESOURCE NAME   TYPE           STATUS   VALID CERT   SERIAL NUMBER   NOT AFTER   NOT BEFORE
default         Cert Chain     ACTIVE   true         abc123...       2026-02-25  2026-02-24
ROOTCA          CA             ACTIVE   true         def456...       2027-02-24  2026-02-24
```

You can also inspect the actual certificate:

```bash
istioctl proxy-config secret "$HTTPBIN_POD" -n my-app -o json | \
  jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl x509 -text -noout
```

Look for the Subject Alternative Name field - it should contain a SPIFFE URI like `spiffe://example.org/ns/my-app/sa/httpbin`.

## Handling Registration Entry Automation

Manually creating SPIRE registration entries for every workload is not practical at scale. The SPIRE project provides SPIRE Controller Manager, which automates this with `ClusterSPIFFEID` custom resources.

The hardened SPIRE Helm chart installs SPIRE Controller Manager by default. You can define additional identities with `ClusterSPIFFEID` resources:

```yaml
apiVersion: spire.spiffe.io/v1alpha1
kind: ClusterSPIFFEID
metadata:
  name: my-app-workloads
spec:
  spiffeIDTemplate: "spiffe://{{ .TrustDomain }}/ns/{{ .PodMeta.Namespace }}/sa/{{ .PodSpec.ServiceAccountName }}"
  podSelector:
    matchLabels:
      spiffe.io/spire-managed-identity: "true"
  workloadSelectorTemplates:
    - "k8s:ns:my-app"
```

The controller manager watches for matching pods and automatically creates SPIRE registration entries based on the pod's service account and namespace. This way, every new Istio sidecar automatically gets a SPIRE-issued identity without manual intervention.

## Troubleshooting Common Issues

**Sidecar fails to start with certificate errors**: Check that the SPIRE agent and SPIFFE CSI driver are running on the same node as the pod. The SDS socket must be accessible at the expected path.

```bash
kubectl get pods -n spire-server -o wide
```

**SPIFFE ID mismatch**: Make sure the registration entries match the namespace and service account of your workloads. A mismatch means SPIRE will not issue a certificate.

```bash
SPIRE_SERVER_POD=$(kubectl get pod -n spire-server -l statefulset.kubernetes.io/pod-name=spire-server-0 -o jsonpath="{.items[0].metadata.name}")
kubectl exec -n spire-server "$SPIRE_SERVER_POD" -c spire-server -- \
  /opt/spire/bin/spire-server entry show
```

**Certificate rotation not happening**: SPIRE handles rotation automatically, but verify the TTL settings on your registration entries. The default SVID TTL is typically 1 hour.

## Production Considerations

When running this in production, keep a few things in mind. First, SPIRE server should be deployed in high availability mode with a shared datastore (PostgreSQL or MySQL). Single-instance SPIRE server is a single point of failure for all identity in your mesh.

Second, plan your trust domain naming carefully. Changing it later requires re-issuing all identities across the mesh. Use something stable like your organization domain.

Third, monitor SPIRE agent health. If an agent goes down on a node, sidecars on that node cannot get new certificates or rotate existing ones. Set up health checks and alerting for the SPIRE agent DaemonSet.

The SPIRE integration gives you a more flexible and standards-compliant identity layer for Istio. It is more work to set up than the built-in CA, but the benefits around attestation, federation, and centralized identity management make it worthwhile for organizations that need fine-grained identity control.
