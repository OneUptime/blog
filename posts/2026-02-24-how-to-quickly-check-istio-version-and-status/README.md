# How to Quickly Check Istio Version and Status

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Service Mesh, Troubleshooting, DevOps

Description: Quick reference for checking Istio version, component health, and overall mesh status in your Kubernetes cluster.

---

When you are troubleshooting Istio issues or just want to verify that everything is running correctly after an upgrade, the first thing you need to know is what version of Istio you are running and whether all the components are healthy. This sounds simple, but there are actually several different ways to check, and each gives you different information.

Here is a quick rundown of the commands you will use most often.

## Check Istio Client and Server Versions

The most basic version check uses istioctl:

```bash
istioctl version
```

This shows you three things: the client version (your local istioctl binary), the control plane version (istiod), and the data plane version (the sidecar proxies). The output looks something like:

```
client version: 1.22.0
control plane version: 1.22.0
data plane version: 1.22.0 (45 proxies)
```

If the data plane version is different from the control plane version, it means some of your sidecars have not been updated yet. This is normal during a rolling upgrade but should be resolved once the upgrade is complete.

To get more detailed version info:

```bash
istioctl version --output json
```

This gives you a JSON breakdown of every proxy and its version, which is useful when you need to find specific pods that are running an old version.

## Check Control Plane Health

The istiod deployment is the heart of Istio. Check that it is running:

```bash
kubectl get pods -n istio-system -l app=istiod
```

You should see one or more pods in `Running` state with all containers ready:

```
NAME                      READY   STATUS    RESTARTS   AGE
istiod-7f8c9d6b5-abcde   1/1     Running   0          2d
```

For a deeper health check, look at istiod's readiness:

```bash
kubectl exec -n istio-system deploy/istiod -- curl -s localhost:8080/ready
```

A healthy response is an empty 200 OK. If this fails, istiod has a problem.

## Check All Istio Components

Get a quick overview of everything running in the istio-system namespace:

```bash
kubectl get all -n istio-system
```

This shows pods, services, deployments, and replica sets. For a more focused view of just the pods:

```bash
kubectl get pods -n istio-system
```

You should see istiod and any gateways you have deployed. If you installed addons like Kiali, Prometheus, or Grafana in this namespace, they will show up here too.

## Use istioctl to Analyze Mesh Health

The `analyze` command is one of the most useful tools in istioctl. It checks your entire mesh configuration for problems:

```bash
istioctl analyze --all-namespaces
```

This command scans all your Istio resources (VirtualServices, DestinationRules, Gateways, etc.) and reports any issues it finds. Common things it catches include:

- VirtualServices referencing gateways that do not exist
- DestinationRules for hosts that are not in the mesh
- Conflicting configurations
- Missing sidecar injection labels

The output looks like:

```
Warning [IST0101] (VirtualService default/my-vs) Referenced host not found: "missing-service"
Info [IST0102] (Namespace default) The namespace is not enabled for Istio injection
```

Pay attention to warnings and errors. Info messages are usually fine to ignore.

## Check the Mesh Configuration

View the current mesh configuration that istiod is using:

```bash
kubectl get configmap istio -n istio-system -o yaml
```

Or use istioctl for a cleaner view:

```bash
istioctl mesh profile dump
```

This shows you the full mesh configuration including proxy defaults, feature flags, and policy settings.

## Verify the Ingress Gateway

If you are using the Istio ingress gateway, check its status:

```bash
kubectl get pods -n istio-system -l istio=ingressgateway
```

Get the external IP or hostname:

```bash
kubectl get svc istio-ingressgateway -n istio-system
```

The `EXTERNAL-IP` column shows where external traffic enters your mesh. If it shows `<pending>`, your load balancer has not provisioned yet (common on local clusters or when cloud quotas are hit).

## Check Proxy Sync Status

One important thing to verify is whether all sidecars are in sync with the control plane. If a proxy is out of sync, it might be using stale routing rules.

```bash
istioctl proxy-status
```

This shows every sidecar in the mesh and its sync status:

```
NAME                       CLUSTER    CDS    LDS    EDS    RDS    ECDS   ISTIOD
frontend-abc123.default    Kubernetes SYNCED SYNCED SYNCED SYNCED        istiod-xxx
api-def456.backend         Kubernetes SYNCED SYNCED SYNCED SYNCED        istiod-xxx
```

The key columns are CDS (Cluster Discovery Service), LDS (Listener Discovery Service), EDS (Endpoint Discovery Service), and RDS (Route Discovery Service). All should show `SYNCED`. If any show `STALE` or `NOT SENT`, there is a configuration delivery problem.

## Check Proxy Version Mismatches

After an upgrade, you want to verify that all proxies have been updated:

```bash
istioctl proxy-status | grep -v "$(istioctl version --short --remote=false)"
```

This filters for proxies that are NOT running the same version as your istioctl client. Any remaining entries need their pods restarted to pick up the new sidecar version.

## Quick Health Check Script

Here is a handy script you can save for quick health checks:

```bash
#!/bin/bash
echo "=== Istio Version ==="
istioctl version --short

echo ""
echo "=== Control Plane Pods ==="
kubectl get pods -n istio-system -o wide

echo ""
echo "=== Proxy Sync Status ==="
istioctl proxy-status

echo ""
echo "=== Configuration Analysis ==="
istioctl analyze --all-namespaces 2>&1 | head -20

echo ""
echo "=== Gateway External IP ==="
kubectl get svc istio-ingressgateway -n istio-system \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
echo ""
```

Save this as `istio-health.sh` and run it whenever you need a quick overview of your mesh status.

## Checking Webhook Configuration

Istio uses mutating webhooks for sidecar injection. Verify they are configured:

```bash
kubectl get mutatingwebhookconfiguration | grep istio
```

You should see `istio-sidecar-injector` or similar. If this is missing, sidecar injection will not work.

Check the webhook is pointing to the right service:

```bash
kubectl get mutatingwebhookconfiguration istio-sidecar-injector -o yaml | grep -A5 clientConfig
```

## When Things Look Wrong

If any of these checks show problems, here are the first steps to take:

- **istiod not running**: Check events with `kubectl describe pod -n istio-system <pod-name>` and logs with `kubectl logs -n istio-system deploy/istiod`
- **Proxies out of sync**: Usually resolves itself. If persistent, restart istiod
- **Version mismatch**: Restart the affected deployments with `kubectl rollout restart deployment <name>`
- **Analysis warnings**: Address them based on the specific IST error codes in the Istio documentation

These commands give you a solid foundation for understanding the state of your Istio mesh at any point in time. Keep them handy and run them as part of your regular operational checks.
