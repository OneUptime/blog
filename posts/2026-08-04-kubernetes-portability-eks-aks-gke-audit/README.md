# Audit Kubernetes Portability Across EKS, AKS, and GKE

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Amazon EKS, Azure AKS, Google GKE, Cloud Portability, Platform Engineering, Compatibility Testing

Description: Audit Kubernetes workloads for API, add-on, identity, storage, networking, and operational differences before claiming they can move among EKS, AKS, and GKE.

---

Managed Kubernetes gives EKS, AKS, and GKE a large common API surface. It does not make their clusters interchangeable. The control planes follow Kubernetes, while networking, identity, storage, upgrades, node images, and add-ons retain provider contracts.

A useful portability audit tests a workload on a specific source and target combination. It does not award points merely because manifests contain `apiVersion: apps/v1`.

## Define the Target Before Auditing

Record the actual target envelope:

```yaml
source:
  platform: eks
  kubernetes_minor: "1.35"
target:
  platform: aks
  kubernetes_minor: "1.35"
  region: uksouth
workload:
  architecture: amd64
  availability_target: zone_redundant
  outage_budget_minutes: 30
```

Available versions and upgrade policies change independently. EKS distinguishes Kubernetes and EKS platform versions; AKS publishes its own support calendar; GKE uses release channels and automatically upgrades supported clusters over time. Select a minor version currently offered in both environments, then verify exact regional availability rather than copying a version from an example.

## 1. Inventory the API Surface

Inventory every namespaced and cluster-scoped object visible to the audit identity, then determine which ones the workload depends on:

```bash
kubectl api-resources --verbs=list --namespaced -o name \
  | xargs -n 1 kubectl get --ignore-not-found -A -o name

kubectl api-resources --verbs=list --namespaced=false -o name \
  | xargs -n 1 kubectl get --ignore-not-found -o name

kubectl get crd -o custom-columns=NAME:.metadata.name,STORED:.status.storedVersions
kubectl get apiservice
```

Scan source manifests and rendered Helm output, not just live objects. Generated resources may differ by environment:

```bash
helm template payments ./chart -f values-portable.yaml > rendered.yaml
kubectl --context target apply --dry-run=server -f rendered.yaml
```

Server-side dry run validates against the target API server and admission chain without persisting objects. It does not prove that a controller can reconcile them or that cloud infrastructure can be provisioned.

Flag:

- removed or deprecated Kubernetes API versions;
- alpha APIs and feature gates;
- CRDs whose controllers are absent from the target;
- validating or mutating admission webhooks;
- conversion webhooks needed to read stored CRD versions;
- fields changed by provider admission controllers.

Kubernetes' deprecation policy protects stable APIs strongly, but beta APIs can stop being served under documented timelines. Managed-service upgrade timing still differs.

## 2. Compare Controllers and Add-Ons

Create an explicit bill of materials:

| Function | Source implementation | Target implementation | Contract test |
| --- | --- | --- | --- |
| CNI | Amazon VPC CNI | Azure CNI or overlay | pod addressing and NetworkPolicy |
| Ingress/Gateway | AWS Load Balancer Controller | selected AKS Gateway controller | TLS, health checks, weighted routes |
| DNS | ExternalDNS plus Route 53 | ExternalDNS plus Azure DNS | create, update, delete record |
| Secrets | Secrets Store CSI driver | same driver, different provider | rotation and workload restart |
| Metrics | chosen collector | chosen collector | same alerts from synthetic failure |

Managed add-on names do not establish equivalent configuration. Pin controller versions compatible with the target Kubernetes minor version, install their CRDs first, and inspect published conformance or support matrices.

Run tests against controller outcomes. A successful `kubectl apply` followed by a `Pending` load balancer is a failed portability test.

## 3. Find Cloud Coupling in Manifests

Search rendered configuration for provider identifiers:

```bash
rg -ni 'amazonaws\.com|aws-load-balancer|azure[.-]|microsoft\.com|cloud\.google\.com|gke\.io|storageclass|volumesnapshotclass|topology\.kubernetes\.io' rendered.yaml
```

Review at least:

- `metadata.annotations` on Ingress, Service, and ServiceAccount objects;
- `spec.storageClassName` and snapshot-class names;
- node selectors, affinity, tolerations, and topology-spread constraints;
- `LoadBalancer` source ranges and traffic policies;
- static IP or network resource identifiers;
- image registry hosts and pull credentials;
- cloud metadata endpoints and SDK credential chains;
- external service hostnames embedded in ConfigMaps.

Do not delete every provider annotation in the name of purity. Put necessary provider configuration into target overlays and keep the workload-level contract stable.

## 4. Audit Identity as a Separate Plane

Kubernetes RBAC is common, but permissions to cloud APIs are not. EKS supports IRSA and EKS Pod Identity; AKS uses Microsoft Entra Workload ID; GKE uses Workload Identity Federation for GKE. Their trust resources, annotations, token exchanges, principal identifiers, and policy languages differ.

Keep the Kubernetes ServiceAccount name stable where practical and map it to a target-specific cloud principal. Test the application with the target SDK credential chain and least-privilege policy. A projected service-account token is a useful federation primitive, not a universal authorization model.

Include negative tests:

```text
given service account payments/reconciler
  can read the intended object prefix
  cannot list another tenant's objects
  cannot assume the node identity
```

## 5. Audit Storage and Stateful Behavior

Compare the CSI drivers and StorageClasses available in each cluster:

```bash
kubectl get csidriver
kubectl get storageclass -o yaml
kubectl get volumesnapshotclass
```

Check access modes, volume mode, expansion, minimum and maximum size, topology, reclaim policy, encryption controls, snapshot support, throughput, IOPS, and failover behavior. `ReadWriteOnce` is not a performance specification, and a `VolumeSnapshot` usually points to a snapshot inside one storage backend.

Provision a disposable PVC in every target, schedule a pod, write checksummed data, expand it if required, snapshot it, restore it, and exercise zone loss assumptions. Use an application-level backup or replication path for cross-provider data movement.

## 6. Test Network Semantics

Test behavior visible to applications and operators:

1. service discovery and DNS search paths;
2. NetworkPolicy enforcement by the selected CNI;
3. client IP preservation;
4. load-balancer health checks and readiness behavior;
5. idle and request timeouts;
6. TLS termination, certificate renewal, and SNI;
7. IPv4/IPv6 expectations;
8. egress paths, NAT, private endpoints, and firewall rules.

Gateway API can reduce annotation coupling for supported features. Compare each implementation's conformance report and claimed extended features. Provider-specific policy resources may still be necessary.

## 7. Rehearse Day-Two Operations

Portability includes the actions performed after deployment. In the target cluster, demonstrate:

- image promotion and rollback;
- cluster and node-pool upgrade;
- horizontal and disruption-driven rescheduling;
- log, metric, and trace delivery;
- secret and certificate rotation;
- backup and restore;
- incident access without the source cloud's identity plane;
- quota discovery and capacity allocation.

Capture measured results, not check marks. Record deployment duration, load-balancer readiness time, restored data checksum, RPO, RTO, error rate, and peak throughput.

## Produce a Compatibility Report

Classify every dependency:

| Status | Meaning |
| --- | --- |
| Portable | Same declared contract passed in both targets |
| Adapted | Target-specific overlay or module passed |
| Replaceable | Alternative exists but migration has not been tested |
| Blocking | No acceptable target capability or data path |
| Unknown | Owner, evidence, or test is missing |

An audit with unknowns is useful; an unqualified declaration of portability is not. Assign owners and deadlines to blocking and unknown rows.

## Official Documentation

- [Kubernetes API deprecation policy](https://kubernetes.io/docs/reference/using-api/deprecation-policy/)
- [Kubernetes version skew policy](https://kubernetes.io/releases/version-skew-policy/)
- [Amazon EKS Kubernetes version lifecycle](https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html)
- [Amazon EKS platform versions](https://docs.aws.amazon.com/eks/latest/userguide/platform-versions.html)
- [AKS supported Kubernetes versions](https://learn.microsoft.com/en-us/azure/aks/supported-kubernetes-versions)
- [GKE release channels](https://cloud.google.com/kubernetes-engine/docs/concepts/release-channels)
- [Gateway API implementations and conformance](https://gateway-api.sigs.k8s.io/implementations/)
- [Kubernetes StorageClasses](https://kubernetes.io/docs/concepts/storage/storage-classes/)

## Conclusion

EKS, AKS, and GKE share Kubernetes APIs, but portability lives in the full dependency graph. Audit stable APIs, controllers, identity, CSI behavior, networking, versions, and operations on a real target. A workload is portable only to the environments and versions where its contracts have passed.
