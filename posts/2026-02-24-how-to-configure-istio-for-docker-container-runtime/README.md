# How to Configure Istio for Docker Container Runtime

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Docker, Container Runtime, Kubernetes, Service Mesh

Description: How to configure and run Istio on Kubernetes clusters using the Docker container runtime including networking and iptables considerations.

---

While Docker as a Kubernetes container runtime has been deprecated since Kubernetes 1.20 (and removed in 1.24), many clusters are still running Docker through the dockershim compatibility layer or using Docker Desktop for local development. If you're working with Istio on one of these clusters, there are specific things to know about how Docker interacts with Istio's networking and sidecar injection.

## Docker Runtime and Istio Compatibility

Istio works with Docker as a container runtime, but it's worth understanding how the pieces fit together. Docker creates containers using its own networking stack, which includes bridge networks and veth pairs. Kubernetes nodes running Docker use the dockershim (or cri-dockerd in newer setups) to translate CRI (Container Runtime Interface) calls into Docker API calls.

For Istio, the key interaction point is the network namespace. The sidecar and your application container share the same network namespace within a pod, regardless of the container runtime. Istio's init container sets up iptables rules in this shared namespace to redirect traffic through the Envoy sidecar.

## Checking Your Container Runtime

First, verify which runtime your cluster is using:

```bash
kubectl get nodes -o wide
```

Look at the `CONTAINER-RUNTIME` column. If it shows `docker://20.10.x`, you're running Docker.

You can also check from within a node:

```bash
kubectl get node <node-name> -o jsonpath='{.status.nodeInfo.containerRuntimeVersion}'
```

## Installing Istio on Docker-Based Clusters

The Istio installation process is the same regardless of the container runtime:

```bash
istioctl install --set profile=default
```

Or with a custom IstioOperator:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: default
  meshConfig:
    defaultConfig:
      holdApplicationUntilProxyStarts: true
```

The `holdApplicationUntilProxyStarts` setting is particularly relevant on Docker clusters. Docker sometimes starts containers in a slightly different order than other runtimes, and this flag ensures the application container waits for the sidecar to be ready.

## Iptables Considerations with Docker

Istio's init container modifies the pod's iptables rules to capture traffic. On Docker-based nodes, there's a potential interaction with Docker's own iptables rules on the host.

Docker creates iptables rules on the host for port mapping and inter-container communication. These are separate from the pod-level iptables that Istio modifies, but they can interact in unexpected ways.

If you're running into connectivity issues, check both levels:

```bash
# Pod-level iptables (inside the pod)
kubectl exec -it deploy/my-app -c istio-proxy -- iptables -t nat -L -n

# Host-level iptables (on the node)
# SSH to node first
iptables -t nat -L -n | grep ISTIO
```

## Docker Desktop and Istio for Local Development

Docker Desktop is a popular choice for local Kubernetes development. Here's how to get Istio working on it:

1. Enable Kubernetes in Docker Desktop settings

2. Allocate enough resources. Istio requires a decent amount of memory:
   - At least 4 GB RAM allocated to Docker Desktop
   - At least 2 CPUs

3. Install Istio with a lighter profile for local use:

```bash
istioctl install --set profile=demo
```

The `demo` profile includes all Istio features but with lower resource requests, making it suitable for local development.

4. Enable sidecar injection:

```bash
kubectl label namespace default istio-injection=enabled
```

5. Deploy your application as usual:

```bash
kubectl apply -f my-app.yaml
```

## Container Logs with Docker

When debugging Istio on Docker, you can access container logs through both kubectl and docker:

```bash
# Through kubectl (recommended)
kubectl logs deploy/my-app -c istio-proxy

# Through docker directly (if you have node access)
docker logs <container-id>
```

To find the container ID:

```bash
docker ps | grep my-app
```

You'll see two containers for each Istio-enabled pod: one for your application and one for `istio-proxy`.

## Network Modes and Istio

Docker supports several network modes, but in a Kubernetes context, pods always use the `pause` container's network namespace. This is important because it means:

- All containers in the pod share the same IP address
- Istio's iptables rules apply to all containers in the pod
- Port conflicts between the sidecar and your application are possible

If your application uses port 15001, 15006, or 15090, you'll conflict with Istio's ports. Check the Istio port usage:

```bash
kubectl exec -it deploy/my-app -c istio-proxy -- ss -tlnp
```

Common Istio ports:
- 15001: Envoy outbound
- 15006: Envoy inbound
- 15020: Merged Prometheus telemetry
- 15021: Health checks
- 15090: Envoy Prometheus

## Docker Image Pull Considerations

Istio sidecar injection adds images that need to be pulled. On Docker-based clusters, the first pod creation might be slow because Docker needs to pull the Istio proxy image:

```bash
# Pre-pull Istio images on all nodes
kubectl get nodes -o name | while read node; do
  kubectl debug $node --image=docker.io/istio/proxyv2:1.20.0 -- echo "pulled"
done
```

Or configure your Istio installation to use a local registry:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  hub: my-registry.example.com/istio
  tag: 1.20.0
```

## Migration from Docker to containerd

If you're planning to migrate from Docker to containerd (which most clusters should do eventually), here's what you need to know about the Istio impact:

1. Istio doesn't need any configuration changes when you switch runtimes
2. The sidecar injection works the same way
3. iptables rules in the pod namespace are runtime-agnostic
4. The only visible change is the `CONTAINER-RUNTIME` field in node info

To migrate a node:

```bash
# Cordon and drain the node
kubectl cordon <node-name>
kubectl drain <node-name> --ignore-daemonsets

# Switch the runtime on the node (distro-specific)
# Then uncordon
kubectl uncordon <node-name>
```

Istio pods on the migrated node will restart with the new runtime without any issues.

## Performance Considerations

Docker has slightly higher overhead than containerd or CRI-O because of the additional Docker daemon layer. For Istio, this mainly affects:

- Container startup time (slightly slower)
- Resource usage on the node (Docker daemon itself uses some CPU/memory)
- Image pull performance

These differences are usually negligible for most workloads, but they add up in large clusters with many pods.

## Troubleshooting Docker-Specific Issues

If you're seeing issues that seem Docker-specific:

1. Check Docker daemon logs:
```bash
journalctl -u docker -n 50
```

2. Verify Docker's iptables policy:
```bash
docker info | grep -i iptables
```

3. Check for Docker network conflicts:
```bash
docker network ls
docker network inspect bridge
```

4. Ensure Docker's userland proxy isn't interfering:
```bash
docker info | grep -i proxy
```

Working with Istio on Docker is straightforward for the most part. The runtime is transparent to Istio's operation since everything happens at the network namespace level. The main things to watch are iptables interactions on the host and ensuring you have enough resources allocated, especially on Docker Desktop for local development.
