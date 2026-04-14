# How to Fix Dapr Host Address Unreachable Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Networking, Service Invocation, Troubleshooting, DNS

Description: Diagnose and fix Dapr 'host address unreachable' errors when services cannot discover or connect to each other through the Dapr sidecar.

---

"Host address unreachable" errors in Dapr indicate that the sidecar cannot resolve or connect to the target service's sidecar. This can be caused by DNS resolution failures, name resolution component issues, or incorrect app IDs.

## Understanding Service Discovery in Dapr

Dapr resolves service addresses using name resolution components. On Kubernetes, it uses the built-in `kubernetes` name resolver, which queries the Kubernetes DNS to find services. Locally, it uses mDNS.

A typical unreachable error:

```text
failed to invoke target myservice: rpc error: code = Unavailable
address unreachable: no endpoints available for app id myservice
```

## Verifying the Target App is Running

First confirm the target service exists and has Dapr enabled:

```bash
kubectl get pods -n <namespace> | grep myservice
kubectl describe pod <myservice-pod> | grep dapr
```

Check its Dapr app-id annotation:

```bash
kubectl get pod <pod> -o jsonpath='{.metadata.annotations.dapr\.io/app-id}'
```

The app-id in the annotation must exactly match what you are calling.

## DNS and Namespace Resolution

When calling across namespaces, use the fully qualified app-id format:

```bash
# Cross-namespace invocation
curl http://localhost:3500/v1.0/invoke/myservice.targetnamespace/method/getData
```

Verify DNS resolution from within the pod:

```bash
kubectl exec -it <caller-pod> -c <app-container> -- \
  nslookup myservice.targetnamespace.svc.cluster.local
```

## Checking Name Resolution Component

View the active name resolver:

```bash
kubectl logs <pod-name> -c daprd | grep -i "name resolution\|resolver"
```

For Kubernetes, the resolver is automatic. For self-hosted mode, ensure mDNS is not blocked by the host firewall.

## Port and Protocol Mismatches

The sidecar calls your app on the port specified by `--app-port`. If the app is not listening on that port, the host is technically reachable but the app port is not:

```bash
# Verify your app is listening on the declared port
kubectl exec -it <pod> -c <app-container> -- netstat -tlnp | grep 8080
```

## Network Policy Blocking Sidecar-to-Sidecar Communication

Dapr sidecars communicate on port 50001 (gRPC). Network policies may block this:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dapr-sidecar
spec:
  podSelector: {}
  ingress:
  - ports:
    - port: 50001
      protocol: TCP
  egress:
  - ports:
    - port: 50001
      protocol: TCP
```

## Using the Dapr Dashboard for Discovery Issues

Check if the target service registers with Dapr:

```bash
dapr list -k -n <namespace>
```

All running Dapr-enabled apps should appear in this list. If the target is missing, it has not registered successfully.

## Summary

Dapr host address unreachable errors are caused by incorrect app IDs, cross-namespace DNS resolution issues, network policies blocking port 50001, or the target app not registering with Dapr. Verify app-id annotations match exactly, use the `appid.namespace` format for cross-namespace calls, and ensure network policies allow sidecar-to-sidecar communication.
