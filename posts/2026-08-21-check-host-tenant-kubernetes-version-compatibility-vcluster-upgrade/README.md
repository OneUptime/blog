# How to Check Kubernetes Compatibility Before a vCluster Upgrade

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VCluster, Kubernetes, Compatibility, Upgrade, Version Skew

Description: Measure host, tenant, worker, and vCluster versions and compare the exact pair with the current compatibility matrix before upgrading.

---

The Kubernetes version reported inside a vCluster is independent of the distribution and version of the control plane cluster that hosts it. That independence is useful, but it is not unlimited compatibility. vCluster publishes a tested matrix for host and tenant Kubernetes versions, and private-node workers must also follow upstream Kubernetes version-skew policy.

This guide uses the vCluster **0.36** stable documentation current on August 21, 2026. Treat the online lifecycle page as the authority because supported releases and tested pairs change over time.

## Record Four Different Versions

Do not collapse these into one “cluster version”:

1. vCluster software/chart version.
2. Control plane cluster Kubernetes server version.
3. Tenant vCluster Kubernetes API server version.
4. Private-node kubelet version, when private nodes are used.

Check the host:

```bash
kubectl version -o yaml
kubectl get nodes \
  -o custom-columns='NAME:.metadata.name,KUBELET:.status.nodeInfo.kubeletVersion'
helm list -n team-a-vcluster
```

Generate a tenant kubeconfig and check the tenant API:

```bash
vcluster connect team-a \
  --namespace team-a-vcluster \
  --print > /tmp/team-a.kubeconfig

kubectl --kubeconfig /tmp/team-a.kubeconfig version -o yaml
kubectl --kubeconfig /tmp/team-a.kubeconfig get nodes \
  -o custom-columns='NAME:.metadata.name,KUBELET:.status.nodeInfo.kubeletVersion'
```

Use the server `gitVersion` values, not your local kubectl client version. With shared nodes, tenant-visible nodes may be pseudo nodes or imported host nodes depending on configuration; the host command remains the source for real kubelet versions.

## Compare the Exact Pair with the vCluster Matrix

As of vCluster 0.36, the lifecycle page covers host and tenant Kubernetes 1.33 through 1.36 and labels pairs as tested, likely compatible, or affected by known issues. Do not infer support merely because both versions appear somewhere in the table; read the cell at their intersection and its footnotes.

One current footnote is operationally significant: a tenant running Kubernetes 1.33 or earlier on a control plane cluster running Kubernetes 1.34 or later can leave Pods `Running` while `Ready=False`. Deployments and StatefulSets then never reach their desired ready count. vCluster documents an immutable `status.qosClass` sync error in this scenario and recommends keeping the tenant at Kubernetes 1.34 or later on such hosts until the fix status changes.

Check the matrix again immediately before the maintenance window. A planned version may have moved to End of Support or received a new limitation since the change was designed.

## Inspect the Pinned Tenant Version

In vCluster 0.36, pin the K8s distribution image tag rather than the deprecated `controlPlane.distro.k8s.version` field:

```yaml
controlPlane:
  distro:
    k8s:
      image:
        registry: ghcr.io
        repository: loft-sh/kubernetes
        tag: v1.36.0
```

Inspect the Git-managed `vcluster.yaml` and the running Pod image. Do not assume the chart's current default was applied to a tenant created on an older release.

```bash
kubectl get pod -n team-a-vcluster <vcluster-pod> \
  -o jsonpath='{.spec.containers[*].image}{"\n"}'
```

Pin a patch version that vCluster publishes and supports. Never invent a `loft-sh/kubernetes` tag based only on an upstream Kubernetes version.

## Plan the Order of Changes

For shared nodes, consider both the vCluster software hop and the tenant Kubernetes image change. Reduce the number of simultaneous variables:

1. Confirm the current host/tenant pair is supported enough to begin.
2. Read vCluster migration notes for every minor hop.
3. Upgrade vCluster one minor at a time with the tenant Kubernetes version unchanged where supported.
4. Validate resource sync and workloads.
5. Change the tenant Kubernetes image tag by one supported minor where needed.
6. Validate API discovery, CRDs, admission, workloads, and synchronization again.

For private nodes, control-plane and kubelet ordering must also satisfy the upstream Kubernetes version-skew policy. vCluster private-node automatic upgrades are enabled by default and normally upgrade one node at a time, but verify that configuration, PodDisruptionBudgets, capacity, and workload drain behavior before relying on it.

## Check API and Workload Compatibility

A matrix-supported pair does not guarantee that every application API survives. Before upgrading:

```bash
kubectl --kubeconfig /tmp/team-a.kubeconfig api-resources
kubectl --kubeconfig /tmp/team-a.kubeconfig get crd
kubectl --kubeconfig /tmp/team-a.kubeconfig get --raw=/readyz?verbose
```

Inventory deprecated or removed Kubernetes APIs in manifests and live objects with an appropriate migration scanner. Check admission webhooks, CRD conversion webhooks, CSI drivers, CNI, Gateway controller, cert-manager, and operators against the target Kubernetes version using their official compatibility pages.

For vCluster specifically, test:

- Pod status synchronization and readiness.
- Service and EndpointSlice translation.
- PVC provisioning and StorageClass imports.
- Optional Ingress or Gateway API sync.
- Custom-resource storage versions and reference patches.
- Imported node, runtime, priority, Secret, and Gateway selectors.

## Run a Pre-Production Pair Test

Create or restore an isolated tenant with the proposed vCluster and Kubernetes versions on a host at the target version. Deploy representative canaries and compare tenant and host objects. A test on a different host minor does not validate the pair being approved.

Watch for the documented version-skew signature:

```bash
kubectl --kubeconfig /tmp/team-a.kubeconfig get pods
kubectl --kubeconfig /tmp/team-a.kubeconfig get deployments,statefulsets -A
kubectl logs -n team-a-vcluster <vcluster-pod> \
  --since=15m | grep -iE 'qosClass|immutable|reconciler error'
```

Include a drain or restart test if private-node kubelets or HA control planes change version.

## Official Documentation

- [vCluster: Lifecycle policy and Kubernetes compatibility matrix](https://www.vcluster.com/docs/vcluster/manage/upgrade/supported_versions)
- [vCluster: Kubernetes distribution configuration](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/control-plane/components/distro/k8s)
- [vCluster: Pod Ready=False version-skew issue](https://www.vcluster.com/docs/vcluster/troubleshoot/pod-stuck-ready-false-version-skew)
- [vCluster: Upgrade vCluster](https://www.vcluster.com/docs/vcluster/manage/upgrade/upgrade-version)
- [Kubernetes: Version skew policy](https://kubernetes.io/releases/version-skew-policy/)

## Conclusion

Capture the host server, tenant server, vCluster chart, and real kubelet versions separately, then read the exact host/tenant cell and footnotes in the current vCluster matrix. Pin a published tenant image tag, stage software and Kubernetes changes, and test the same pair with representative sync paths before production.
