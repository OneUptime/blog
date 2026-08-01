# Adding Sidecars to Running Pods: Immutability and Ephemeral Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Sidecar, Pod, Ephemeral Container, Deployment

Description: Learn why a regular sidecar cannot be appended to an existing Pod, how controllers roll out a changed Pod template, and why ephemeral containers are for debugging rather than application features.

---

You cannot add a regular app container or native sidecar container to a Pod after Kubernetes has created it.

The normal solution is to change the Pod template owned by a Deployment, StatefulSet, DaemonSet, or another controller that supports template updates. The controller then creates replacement Pods containing the new sidecar according to its update strategy. For a Job, whose Pod template cannot generally be changed to add a container, create a new Job from the updated manifest. Kubernetes also supports adding an **ephemeral container** to a running Pod, but that facility is intentionally designed for user-initiated troubleshooting, not for extending the application.

Those are two different operations with different guarantees.

## Why Patching `spec.containers` Fails

Most of a Pod specification is immutable. Ordinary Pod updates can change a small set of fields, such as existing container images and some deadline, toleration, or scheduling fields. They cannot append an entry to `spec.containers` or `spec.initContainers`.

This will therefore be rejected:

```bash
kubectl patch pod checkout-7d8c9 \
  --type=json \
  -p='[{"op":"add","path":"/spec/containers/-","value":{"name":"helper","image":"busybox:1.36"}}]'
```

The restriction is important. Scheduling, resource accounting, security admission, volume setup, and container lifecycle decisions were made for the admitted Pod. Quietly turning it into a different application in place would bypass the controller's declared desired state.

## Change the Controller's Pod Template

For a Deployment, add the sidecar beneath `spec.template.spec`. This template change creates a new ReplicaSet and a rolling update:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout
spec:
  replicas: 3
  selector:
    matchLabels:
      app: checkout
  strategy:
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
  template:
    metadata:
      labels:
        app: checkout
    spec:
      containers:
        - name: app
          image: example.com/checkout@sha256:APP_DIGEST
          ports:
            - name: http
              containerPort: 8080
          readinessProbe:
            httpGet:
              path: /ready
              port: http
        - name: helper
          image: example.com/helper@sha256:HELPER_DIGEST
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
```

Apply and watch the rollout:

```bash
kubectl apply -f checkout.yaml
kubectl rollout status deployment/checkout
kubectl get pods -l app=checkout
```

If a mutating admission webhook injects the sidecar, update the namespace or Pod-template labels and recreate or roll the Pods. Admission runs on new API requests; enabling injection does not retrofit containers into existing Pods.

For a standalone Pod, create a replacement from a manifest. Avoid deleting an unmanaged production Pod until you understand how service continuity and storage attachment will be preserved.

## What an Ephemeral Container Is For

Ephemeral containers have been stable since Kubernetes 1.25. `kubectl debug` can add one to an existing Pod when the application image has no shell or the target container is crashing:

```bash
kubectl debug -it checkout-7d8c9 \
  --image=registry.example.com/debug-tools@sha256:DEBUG_DIGEST \
  --target=app
```

The `--target` option asks the runtime to place the debugger where it can inspect the target container's processes. Runtime support and permissions affect what it can see.

This does not create a production sidecar. Kubernetes documents several limitations:

- ephemeral containers are never automatically restarted;
- they cannot declare ports, liveness probes, or readiness probes;
- they cannot set resource requests or limits because the Pod's allocation is already fixed;
- once added, they cannot be changed or removed from that Pod;
- they are not supported for static Pods;
- they are not part of the workload controller's Pod template, so replacement Pods do not inherit them.

Treat access to the `pods/ephemeralcontainers` subresource as privileged. A debug image can expose process state, mounted data, service-account credentials, and network access inside a production Pod.

## Use a Copied Pod for Invasive Debugging

Sometimes you need a changed command, image, process-sharing setting, or security context. Instead of changing the live Pod, ask `kubectl debug` to make a copy:

```bash
kubectl debug checkout-7d8c9 -it \
  --copy-to=checkout-debug \
  --share-processes \
  --container=app \
  --image=example.com/checkout-debug@sha256:DEBUG_APP_DIGEST -- sh
```

A copied Pod is a separate object. Review its labels before creation so a production Service does not accidentally send it traffic. Also review mounted Secrets, PersistentVolumeClaims, identity, and network policy; a debug copy should not acquire more access than necessary.

Delete it after the investigation:

```bash
kubectl delete pod checkout-debug
```

## Pick the Operation That Matches the Goal

| Goal | Correct mechanism |
| --- | --- |
| Add a permanent logging, proxy, or helper sidecar | Change the controller's Pod template and roll out new Pods. |
| Turn on webhook injection | Label or annotate the Pod template or namespace, then recreate Pods. |
| Inspect a running or crashing container | Add an ephemeral container with `kubectl debug`. |
| Change command, image, or process-sharing behavior for a test | Create a copied debug Pod. |
| Make an emergency production behavior change | Update the declarative workload and use the controller's rollout and rollback controls. |

An ephemeral container is valuable precisely because it is an exception for inspection. It is not a shortcut around immutable workload design.

## Official Documentation

- [Kubernetes: Pods-Pod Update and Replacement](https://kubernetes.io/docs/concepts/workloads/pods/#pod-update-and-replacement)
- [Kubernetes: Ephemeral Containers](https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/)
- [Kubernetes: Debug Running Pods](https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/)
- [Kubernetes: Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Kubernetes: Sidecar Containers](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)
