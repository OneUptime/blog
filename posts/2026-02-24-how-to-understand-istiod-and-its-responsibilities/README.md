# How to Understand Istiod and Its Responsibilities

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Istiod, Control Plane, Kubernetes, Service Mesh

Description: A comprehensive guide to understanding istiod, the unified control plane component of Istio, covering its responsibilities, internals, and operational aspects.

---

If you have ever looked at an Istio installation and wondered what istiod actually does, you are not alone. The name is not exactly self-explanatory, and the documentation can be dense. Istiod is the single binary that runs Istio's entire control plane. It is the most important component in your mesh, and understanding it will help you operate Istio with confidence.

## What Is Istiod?

Istiod (the "d" stands for daemon) is a single process that combines what used to be several separate Istio components: Pilot, Citadel, and Galley. Before Istio 1.5, each of these ran as a separate Deployment. The Istio team consolidated them into one binary to reduce operational complexity.

```bash
# There is usually just one Deployment for the entire control plane
kubectl get deploy -n istio-system
# NAME     READY   UP-TO-DATE   AVAILABLE
# istiod   1/1     1            1
```

Despite being a single binary, istiod still handles multiple distinct responsibilities. Think of it as a monolith that contains several logical services.

## Responsibility 1: Configuration Distribution (Pilot)

The most important job of istiod is converting your Istio configuration into Envoy proxy configuration and distributing it to every sidecar in the mesh.

When you create a VirtualService:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: product-service
spec:
  hosts:
  - product-service
  http:
  - match:
    - headers:
        x-test:
          exact: "true"
    route:
    - destination:
        host: product-service
        subset: v2
  - route:
    - destination:
        host: product-service
        subset: v1
```

Istiod watches the Kubernetes API server for this resource. When it detects the change, it:

1. Reads the VirtualService spec
2. Combines it with data from the Kubernetes service registry (Services, Endpoints)
3. Generates Envoy-specific configuration (routes, clusters, listeners)
4. Pushes the configuration to all relevant sidecars using the xDS protocol

The xDS push is incremental when possible. If only a route changed, istiod sends just the route update rather than the entire configuration.

You can track configuration pushes:

```bash
# Watch istiod push metrics
kubectl exec -n istio-system deploy/istiod -- \
    curl -s localhost:15014/metrics | grep pilot_xds_pushes
```

## Responsibility 2: Service Discovery

Istiod maintains a service registry that contains every service in the mesh. It builds this registry by watching Kubernetes resources:

- **Services** - Defines the service name and ports
- **Endpoints** - The actual pod IPs behind each Service
- **Pods** - For label information used in routing

When a new pod starts up or an old one terminates, istiod updates its registry and pushes new endpoint information to the sidecars. This is how your sidecars always know the current set of healthy backends for each service.

```bash
# See what istiod knows about your services
istioctl proxy-config endpoints deploy/my-app -n default
```

The output shows every endpoint that the sidecar knows about, along with its health status (HEALTHY or UNHEALTHY).

## Responsibility 3: Certificate Authority (Citadel)

Istiod runs a built-in Certificate Authority that issues X.509 certificates to every workload in the mesh. These certificates enable mutual TLS between services.

The certificate lifecycle:

1. When a pod starts, the istio-agent (running in the sidecar container alongside Envoy) generates a private key and a Certificate Signing Request (CSR)
2. The agent sends the CSR to istiod over a gRPC connection
3. Istiod validates the request against the pod's Kubernetes service account
4. Istiod signs the certificate with its CA key
5. The signed certificate is sent back to the agent
6. The agent configures Envoy to use the certificate for mTLS
7. Before the certificate expires (default TTL is 24 hours), the agent requests a new one

Check the CA certificate:

```bash
# View istiod's root CA certificate
kubectl get secret istio-ca-secret -n istio-system -o jsonpath='{.data.ca-cert\.pem}' | base64 -d | openssl x509 -text -noout
```

You can also bring your own CA by providing a custom root certificate:

```bash
kubectl create secret generic cacerts -n istio-system \
    --from-file=ca-cert.pem \
    --from-file=ca-key.pem \
    --from-file=root-cert.pem \
    --from-file=cert-chain.pem
```

## Responsibility 4: Configuration Validation (Galley)

Istiod registers a Kubernetes validating admission webhook that catches invalid Istio configurations before they are persisted:

```bash
kubectl get validatingwebhookconfiguration -l app=istiod
```

Try applying an invalid VirtualService and you will see Galley reject it:

```bash
# This has an invalid weight (over 100%)
cat <<EOF | kubectl apply -f -
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: bad-config
spec:
  hosts:
  - test
  http:
  - route:
    - destination:
        host: test
        subset: v1
      weight: 150
EOF
# Error: total destination weight 150 != 100
```

## Responsibility 5: Sidecar Injection

Istiod also handles automatic sidecar injection through a mutating admission webhook:

```bash
kubectl get mutatingwebhookconfiguration -l app=istiod
```

When a pod is created in a namespace with `istio-injection=enabled`, istiod's webhook modifies the pod spec to add:
- The `istio-proxy` container (Envoy sidecar)
- The `istio-init` container (sets up iptables rules)
- Volumes for certificates and configuration

## Monitoring Istiod

Istiod exposes a comprehensive set of metrics on port 15014:

```bash
# Key metrics to monitor
kubectl exec -n istio-system deploy/istiod -- curl -s localhost:15014/metrics | grep -E "^(pilot_|citadel_)" | head -20
```

Important metrics:

```text
# Number of connected proxies
pilot_xds_pushes{type="cds"}

# Configuration push latency
pilot_proxy_convergence_time_bucket

# Certificate signing request count
citadel_server_csr_count

# Certificate signing errors
citadel_server_csr_sign_error_count

# Number of connected xDS clients
pilot_xds
```

## Istiod Health Checks

Istiod exposes health and readiness endpoints:

```bash
# Readiness probe
kubectl exec -n istio-system deploy/istiod -- curl -s localhost:8080/ready

# Debug endpoints
kubectl exec -n istio-system deploy/istiod -- curl -s localhost:15014/debug/endpointz
kubectl exec -n istio-system deploy/istiod -- curl -s localhost:15014/debug/configz
kubectl exec -n istio-system deploy/istiod -- curl -s localhost:15014/debug/syncz
```

The `syncz` endpoint is particularly useful. It shows the sync state of every connected proxy:

```bash
kubectl exec -n istio-system deploy/istiod -- curl -s localhost:15014/debug/syncz | python3 -m json.tool
```

## Scaling and High Availability

For production, run multiple istiod replicas:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        replicaCount: 3
        resources:
          requests:
            cpu: 500m
            memory: 2Gi
          limits:
            cpu: 2
            memory: 4Gi
```

All istiod replicas are active and can serve any sidecar. There is no leader election for configuration distribution. Each sidecar connects to one istiod instance and will failover to another if its current connection drops.

For the CA functionality, the signing key is stored in a Kubernetes Secret, so all instances can sign certificates.

## Troubleshooting Istiod

When istiod is having problems, start here:

```bash
# Check istiod logs for errors
kubectl logs -n istio-system deploy/istiod --tail=100 | grep -i error

# Check the sync status of all proxies
istioctl proxy-status

# Run Istio's built-in analyzer
istioctl analyze --all-namespaces

# Check istiod resource usage
kubectl top pod -n istio-system -l app=istiod
```

Common issues and their causes:

- **Proxies showing STALE** - Istiod cannot push config to the proxy. Check network connectivity and istiod logs.
- **High memory usage** - Usually caused by a large number of services or endpoints. Use Sidecar resources to limit scope.
- **Certificate errors** - Check if istiod can access the CA Secret and that certificates have not expired.
- **Webhook failures** - If istiod is down, pod creation and Istio resource creation will fail. Check if the pods are running.

Istiod is the central nervous system of your Istio mesh. It takes your high-level intent (VirtualServices, AuthorizationPolicies) and translates it into low-level proxy configuration. It manages the identity of every workload through certificates. And it validates your configuration before it can cause problems. Getting comfortable with istiod's internals and knowing how to monitor and debug it is essential for running Istio in production.
