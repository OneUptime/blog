# How to Migrate from Custom Service Discovery to Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Service Discovery, Migration, Consul, Eureka, Kubernetes

Description: Replace custom service discovery solutions like Consul, Eureka, or ZooKeeper with Istio and Kubernetes-native service discovery for simpler operations and better mesh integration.

---

If you are running a custom service discovery system alongside Kubernetes, you are maintaining an extra piece of infrastructure that Kubernetes and Istio can handle natively. Whether you are using Consul, Eureka, ZooKeeper, or a homegrown solution, the migration path to Istio-based service discovery is well-defined and can be done incrementally.

Here is how to make the switch without disrupting your running services.

## Why Replace Custom Service Discovery

Custom service discovery systems add operational overhead:

- Another distributed system to run, monitor, and maintain
- Client libraries that need to be included in every service
- Health check infrastructure separate from Kubernetes liveness/readiness probes
- Registration and deregistration logic in your application code
- DNS or HTTP-based lookup APIs that need to be understood by every developer

With Kubernetes + Istio, service discovery is built in:
- Kubernetes Services provide DNS-based discovery
- Istio's sidecar proxies get endpoints from the Kubernetes API
- No client libraries needed
- No separate health check infrastructure
- No registration code in your applications

## Common Service Discovery Systems

### Consul

Services register with a Consul agent, and clients look up services through Consul DNS or the Consul HTTP API:

```go
// Service registration
registration := &api.AgentServiceRegistration{
    ID:      "payment-service-1",
    Name:    "payment-service",
    Port:    8080,
    Address: "10.244.0.15",
    Check: &api.AgentServiceCheck{
        HTTP:     "http://10.244.0.15:8080/health",
        Interval: "10s",
    },
}
client.Agent().ServiceRegister(registration)
```

```go
// Service lookup
services, _, _ := client.Health().Service("payment-service", "", true, nil)
address := services[0].Service.Address
port := services[0].Service.Port
```

### Eureka

Spring Cloud services register automatically:

```yaml
eureka:
  client:
    serviceUrl:
      defaultZone: http://eureka-server:8761/eureka/
  instance:
    preferIpAddress: true
```

### ZooKeeper

Services create ephemeral nodes:

```java
ServiceInstance<Void> instance = ServiceInstance.<Void>builder()
    .name("payment-service")
    .port(8080)
    .build();
discovery.registerService(instance);
```

## Migration Strategy

The migration has three phases: run both systems in parallel, switch services to Kubernetes DNS, then decommission the old system.

### Phase 1: Ensure Kubernetes Services Exist

Every service that is registered in your discovery system needs a corresponding Kubernetes Service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: payment-service
  namespace: default
spec:
  selector:
    app: payment-service
  ports:
    - name: http
      port: 8080
      targetPort: 8080
```

Verify all services have endpoints:

```bash
kubectl get endpoints payment-service
```

The endpoints should list the pod IPs. If they do not, the selector labels might not match the pod labels.

### Phase 2: Install Istio

Install Istio with PERMISSIVE mTLS:

```bash
istioctl install --set profile=default
```

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: PERMISSIVE
```

Inject sidecars:

```bash
kubectl label namespace default istio-injection=enabled
kubectl rollout restart deployment --all -n default
```

### Phase 3: Update Service Calls to Use Kubernetes DNS

This is the main code change. Replace service discovery lookups with direct DNS calls.

#### Consul to Kubernetes DNS

Before:

```go
// Consul lookup
services, _, _ := client.Health().Service("payment-service", "", true, nil)
url := fmt.Sprintf("http://%s:%d/api/charge",
    services[0].Service.Address,
    services[0].Service.Port)
resp, err := http.Get(url)
```

After:

```go
// Kubernetes DNS (Envoy handles load balancing)
resp, err := http.Get("http://payment-service:8080/api/charge")
```

#### Eureka to Kubernetes DNS

Before:

```java
@LoadBalanced
RestTemplate restTemplate;
// Eureka + Ribbon resolve "payment-service"
restTemplate.getForObject("http://payment-service/api/charge", Response.class);
```

After:

```java
RestTemplate restTemplate = new RestTemplate();
// Kubernetes DNS + Envoy resolve "payment-service"
restTemplate.getForObject("http://payment-service:8080/api/charge", Response.class);
```

#### ZooKeeper to Kubernetes DNS

Before:

```java
ServiceInstance<Void> instance = discovery.getInstance("payment-service");
String url = "http://" + instance.getAddress() + ":" + instance.getPort() + "/api/charge";
```

After:

```java
String url = "http://payment-service:8080/api/charge";
```

### Phase 4: Remove Registration Code

After switching to Kubernetes DNS, your services no longer need to register with the discovery system. Remove the registration code and dependencies.

For Consul:

```go
// Remove this
client.Agent().ServiceRegister(registration)
client.Agent().ServiceDeregister(serviceID)
```

Remove the Consul client library dependency.

For Eureka:

```xml
<!-- Remove from pom.xml -->
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-eureka-client</artifactId>
</dependency>
```

Remove `@EnableEurekaClient` and Eureka configuration from `application.yml`.

### Phase 5: Handle Cross-Namespace Discovery

With Consul or Eureka, services in different namespaces were all in one flat registry. With Kubernetes DNS, you need the full DNS name for cross-namespace calls:

```
# Same namespace
http://payment-service:8080

# Different namespace
http://payment-service.payments.svc.cluster.local:8080
```

If you want to simplify cross-namespace visibility, you can use Istio's Sidecar resource or ServiceEntries.

### Phase 6: Handle External Services

Services outside the Kubernetes cluster that were registered in Consul/Eureka need ServiceEntries in Istio:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-payment-processor
spec:
  hosts:
    - payment-processor.internal.company.com
  ports:
    - number: 443
      name: tls
      protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

For services with static IPs:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: legacy-database
spec:
  hosts:
    - legacy-db
  addresses:
    - 10.100.0.50
  ports:
    - number: 3306
      name: tcp
      protocol: TCP
  resolution: STATIC
  location: MESH_EXTERNAL
  endpoints:
    - address: 10.100.0.50
```

### Phase 7: Handle Health Checks

Custom service discovery systems often have their own health checks. With Kubernetes, health checks are handled by liveness and readiness probes:

```yaml
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

Make sure all services have proper probes before decommissioning the old health check infrastructure.

### Phase 8: Decommission the Old System

After all services are migrated:

1. Remove the Consul/Eureka/ZooKeeper server deployments
2. Remove any sidecars or agents (e.g., Consul agent running as a DaemonSet)
3. Remove client library dependencies from all services
4. Update monitoring to remove old discovery system dashboards
5. Update documentation and runbooks

## Verifying the Migration

Check that Istio sees all your services:

```bash
istioctl proxy-config clusters my-app-xxxxx.default
```

Verify endpoints are populated:

```bash
istioctl proxy-config endpoints my-app-xxxxx.default | grep payment-service
```

Check that load balancing works:

```bash
for i in $(seq 1 10); do
    kubectl exec my-app-xxxxx -c my-app -- curl -s http://payment-service:8080/api/identity
done
```

You should see responses from different pod instances.

## Consul Connect Integration

If you are using Consul Connect (Consul's service mesh), you can run it alongside Istio temporarily using Consul's integration with Istio. But for a clean migration, it is better to fully switch to Istio service discovery rather than running two service meshes.

The migration from custom service discovery to Istio is primarily a code simplification exercise. You are removing client libraries, removing registration code, removing health check infrastructure, and replacing it all with Kubernetes DNS names and Istio's built-in service registry. Each service gets simpler, and the operational burden drops significantly.
