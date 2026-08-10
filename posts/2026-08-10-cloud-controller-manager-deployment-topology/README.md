# Cloud Controller Manager as a Deployment, DaemonSet, or Static Pod: Which Topology Fits?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cloud Controller Manager, Deployment, DaemonSet, Static Pod, High Availability

Description: Choose a cloud-controller-manager topology by comparing scheduling dependencies, high availability, updates, credentials, and control-plane failure modes.

---

Kubernetes does not require every cloud provider to package `cloud-controller-manager` (CCM) with the same workload object. The upstream administration guide offers a control-plane-selected DaemonSet as a guideline, the leader-migration guide uses static Pods in its example assumptions, and provider distributions commonly ship their own manifests or charts.

The right topology is therefore not “whatever creates the most replicas.” Choose the lifecycle owner and bootstrap dependency that match the cluster, then enable leader election so only one replica actively runs the shared cloud control loops.

## Decision Summary

| Topology | Best fit | Main advantage | Main cost |
| --- | --- | --- | --- |
| Deployment | Self-hosted add-on with a working scheduler and API, fixed replica count, and standard rollouts | Familiar declarative scaling, rollout, placement, and disruption controls | Depends on the control plane being healthy enough to schedule the controller |
| DaemonSet selected to control-plane Nodes | One replica per eligible control-plane host, with membership following host changes | Replica placement automatically tracks the selected Nodes | Replica count is coupled to Nodes; bootstrap taints and selectors must be correct |
| Static Pod on control-plane Nodes | Bootstrap-critical control plane supervised directly by each kubelet | Pod creation and local restart do not require the API server or scheduler | Not managed through normal workload APIs; no ServiceAccount, ConfigMap, or Secret references |

Start with the cloud provider's supported manifest. Provider images can add controllers, flags, credential requirements, and upgrade constraints that a generic manifest cannot safely infer.

## Requirements Shared by All Three

Whichever topology owns the process, production CCM replicas need the same fundamentals:

- identical provider and cluster identity configuration;
- cloud API authentication and authorization required by the enabled provider controllers, such as instance, route, or load-balancer permissions;
- Kubernetes API authentication and authorization, with RBAC commonly used for authorization;
- network access to both the Kubernetes API and provider APIs;
- leader election enabled for replicated operation;
- compatibility between the provider CCM release and Kubernetes version; and
- logs, metrics, readiness, and alerts, plus a reliable way to identify the elected leader.

Kubernetes documents leader election as on by default for the CCM. Replicas are not independent shards: under the standard arrangement, one wins a Lease and starts the shared controllers while the others stand by. Running several replicas with leader election disabled can make them race to initialize Nodes and mutate provider resources.

## Deployment: Fixed Replica Count and Standard Rollouts

A Deployment manages interchangeable Pods through ReplicaSets and provides declarative updates, rollback, scaling, and rollout status. It is a natural fit when the CCM is treated as a cluster add-on and the Kubernetes scheduler is already dependable.

A production shape typically uses two or three replicas, plus required tolerations and placement across control-plane hosts or failure domains:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cloud-controller-manager
  namespace: kube-system
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cloud-controller-manager
  template:
    metadata:
      labels:
        app: cloud-controller-manager
    spec:
      serviceAccountName: cloud-controller-manager
      nodeSelector:
        node-role.kubernetes.io/control-plane: ""
      tolerations:
        - key: node-role.kubernetes.io/control-plane
          operator: Exists
          effect: NoSchedule
        - key: node.cloudprovider.kubernetes.io/uninitialized
          operator: Exists
          effect: NoSchedule
      containers:
        - name: cloud-controller-manager
          image: <provider-supported-image>
          args:
            - --leader-elect=true
```

This is a topology sketch, not a complete provider manifest. Add pod anti-affinity or topology spread constraints so replicas do not all land on one host, choose a safe rollout strategy, and include the provider's credential mounts, probes, priority class, security context, flags, and API authorization rules.

The Deployment's biggest weakness is dependency. The API server, relevant workload controllers, scheduler, eligible Nodes, and—unless the provider manifest uses `hostNetwork: true`—the CNI must function well enough to create, schedule, and run a replacement Pod. If every Node starts with `node.cloudprovider.kubernetes.io/uninitialized:NoSchedule` and the CCM Pod does not tolerate that taint, the controller required to remove the taint can never schedule. Kubernetes calls out this CCM “chicken and egg” failure explicitly.

## DaemonSet: Follow the Eligible Control-Plane Nodes

The upstream CCM administration page provides a DaemonSet example restricted to control-plane Nodes. That pattern creates one Pod per matching host, so adding or replacing a control-plane Node automatically creates another candidate. It also avoids a ReplicaSet placing several candidates on the same Node.

Do not omit the node selector or equivalent node affinity. An unrestricted DaemonSet creates a CCM Pod on every worker, which increases idle replicas, credentials exposure, API clients, and operational noise without increasing active-controller throughput.

The important pieces are:

```yaml
spec:
  template:
    spec:
      nodeSelector:
        node-role.kubernetes.io/control-plane: ""
      tolerations:
        - key: node-role.kubernetes.io/control-plane
          operator: Exists
          effect: NoSchedule
        - key: node.cloudprovider.kubernetes.io/uninitialized
          operator: Exists
          effect: NoSchedule
      containers:
        - name: cloud-controller-manager
          args:
            - --leader-elect=true
```

DaemonSet Pods automatically receive several tolerations for built-in Node conditions, including `node.kubernetes.io/not-ready`, `node.kubernetes.io/unreachable`, and `node.kubernetes.io/unschedulable`. The `node.cloudprovider.kubernetes.io/uninitialized` taint is a separate bootstrap taint, so include the explicit toleration supplied by the provider or upstream guideline. A high priority class can also help this control-plane add-on win scarce resources.

Creating or replacing DaemonSet Pods still depends on the API server, the DaemonSet controller, and normally a scheduler. A DaemonSet provides rolling updates and normal API-based management, but it is not an API-independent bootstrap mechanism. If its node selector or node affinity stops matching after a Node label change, it can remove candidates from exactly the hosts on which they were expected to run.

## Static Pod: Kubelet-Supervised Bootstrap

A static Pod manifest is read by the kubelet on one specific Node. The kubelet starts and restarts the Pod without the API server or scheduler, but the CCM still needs the API server to acquire its leader Lease and reconcile cluster objects. Kubernetes uses this model for self-hosted control-plane components in common bootstrapping arrangements, and the CCM leader-migration guide explicitly assumes static Pods while telling operators to adapt when their installation differs.

That startup independence is valuable during bootstrap or recovery when normal workload scheduling is unavailable. Place an equivalent, provider-supported manifest on each intended control-plane Node and use leader election across the resulting processes.

Static Pods have meaningful limitations. Their specs cannot refer to ServiceAccounts, ConfigMaps, or Secrets, and they cannot be rolled out, rolled back, or scaled through standard workload controllers. The kubelet creates a mirror Pod on the API server for visibility, but deleting the mirror Pod does not stop the real static Pod; the kubelet recreates the mirror. Configuration and credentials must be provided through node-local files, environment, or another provider-supported bootstrap mechanism.

Those properties make static Pods appropriate for infrastructure-controlled control planes, not automatically superior. They increase the importance of node configuration management: a partial manifest rollout can leave different CCM versions or flags competing for the same Lease.

## Placement and Failure-Domain Questions

Before choosing an object kind, answer these operational questions:

1. Can the chosen topology start a CCM before cloud Node initialization finishes—and, for a workload-managed Pod, can the scheduler place it?
2. Can every candidate reach the API server and provider APIs?
3. Are candidates spread across hosts and, where useful, zones?
4. Where do credentials come from, and does that mechanism work during bootstrap?
5. How is a failed candidate replaced when the API server, scheduler, or a control-plane Node is impaired?
6. How are image and flag updates made atomically enough to preserve compatibility?

For Deployments and DaemonSets, verify tolerations against actual Node taints rather than copying only the control-plane taint. For static Pods, verify node-local kubeconfig, CA material, cloud configuration, file permissions, and manifest synchronization.

## Validate High Availability

Replica count alone is not proof of availability. Confirm the Lease, placement, and takeover path:

```bash
kubectl get pods -n kube-system -o wide | grep cloud-controller-manager
kubectl get lease -n kube-system cloud-controller-manager -o yaml
kubectl get nodes --show-labels
```

The Lease command uses the upstream default name and namespace; substitute the provider's configured leader-election resource name and namespace. If Leader Migration remains enabled, inspect its configured migration Lease as well.

Then perform a controlled test in a non-production environment: stop the active leader and observe a standby acquire the Lease and resume reconciliation. The normal Lease duration creates a finite takeover delay. An outage of the API server prevents candidates from acquiring or renewing that Kubernetes Lease regardless of workload topology.

Also test bootstrap, not only steady state. A workload-managed manifest that survives one Pod deletion may still fail when every control-plane Node is replaced and all new Nodes carry initialization or readiness taints. For static Pods, verify that a fresh control-plane Node receives the node-local manifest, network configuration, and credential material.

## A Practical Selection Rule

Use the provider-supported Deployment when you want a fixed number of add-on replicas and can rely on scheduling during recovery. Use the provider-supported, control-plane-selected DaemonSet when candidate count should follow control-plane Nodes and the API-based bootstrap dependency is acceptable. Use static Pods when the CCM must start under direct kubelet supervision before the normal workload control plane can schedule it, and when node-level configuration management can handle its limitations.

In all cases, keep the candidates few, deliberately placed, identically configured, and protected by leader election. “One per worker” is usually an excessive high-availability topology for a singleton control loop and does not increase active-controller throughput.

## Official Documentation

- [Kubernetes: Cloud Controller Manager Administration](https://kubernetes.io/docs/tasks/administer-cluster/running-cloud-controller/)
- [Kubernetes: Cloud Controller Manager](https://kubernetes.io/docs/concepts/architecture/cloud-controller/)
- [Kubernetes: DaemonSet](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)
- [Kubernetes: Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Kubernetes: Static Pods](https://kubernetes.io/docs/concepts/workloads/pods/static-pods/)
- [Kubernetes: The Cloud Controller Manager Chicken and Egg Problem](https://kubernetes.io/blog/2025/02/14/cloud-controller-manager-chicken-egg-problem/)
- [Kubernetes: Migrate a replicated control plane to use cloud-controller-manager](https://kubernetes.io/docs/tasks/administer-cluster/controller-manager-leader-migration/)

## Conclusion

Deployment, DaemonSet, and static Pod are three lifecycle choices around the same singleton-by-leader-election controller set. Deployment offers a fixed replica count and rich rollouts, a selected DaemonSet follows control-plane hosts, and static Pods remove the scheduler and API server from Pod creation and restart, not from CCM operation. Let provider support, bootstrap dependencies, credentials, placement, and upgrade operations decide—not the object kind's familiarity alone.
