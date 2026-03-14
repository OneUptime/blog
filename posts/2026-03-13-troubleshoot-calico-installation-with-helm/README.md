# How to Troubleshoot Installation Issues with Calico with Helm

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Troubleshooting, Helm, CNI

Description: Diagnose and resolve common Calico installation issues when using the Helm chart with the Tigera Operator.

---

## Introduction

Calico Helm installations introduce additional complexity compared to manifest-based installations because of the Tigera Operator layer. Issues can occur at the Helm chart level (values misconfiguration), the Operator level (CRD conflicts, RBAC), or the Calico component level (networking, IPAM). The `tigerastatus` resource is the primary diagnostic tool for Helm-based installations.

Common issues include the Tigera Operator pod failing to start due to RBAC issues, Calico components stuck in `Degraded` state in tigerastatus, or the Installation CR not being reconciled due to conflicts with an existing CNI. Understanding the layered architecture of the Helm installation is key to efficient troubleshooting.

This guide covers systematic troubleshooting for Calico Helm installations, organized by layer.

## Prerequisites

- Calico Helm installation with issues
- kubectl and Helm v3 installed
- calicoctl configured

## Step 1: Check Helm Release Status

```bash
helm list -n tigera-operator
helm status calico -n tigera-operator
```

If the release is in `failed` state, check for installation errors:

```bash
helm history calico -n tigera-operator
```

## Step 2: Check Tigera Operator Logs

```bash
kubectl get pods -n tigera-operator
kubectl logs -n tigera-operator deployment/tigera-operator --tail=100
```

Look for errors related to RBAC, CRD creation, or API server connectivity.

## Step 3: Check Tigera Status

```bash
kubectl get tigerastatus
kubectl describe tigerastatus calico
```

This shows which components are degraded and the reason for degradation.

## Step 4: Fix CRD Conflicts

If upgrading from a previous Calico installation:

```bash
kubectl get crd | grep calico
kubectl get crd | grep tigera
```

Remove conflicting CRDs from an old installation:

```bash
kubectl delete crd $(kubectl get crd -o name | grep calico.org)
helm install calico projectcalico/tigera-operator \
  --version v3.27.0 \
  --namespace tigera-operator
```

## Step 5: Fix RBAC Issues

If the Operator cannot create resources:

```bash
kubectl auth can-i create clusterrolebinding --as=system:serviceaccount:tigera-operator:tigera-operator
```

Reinstall to recreate RBAC:

```bash
helm uninstall calico -n tigera-operator
helm install calico projectcalico/tigera-operator \
  --version v3.27.0 \
  --namespace tigera-operator
```

## Step 6: Fix Installation CR Issues

If the Installation CR is stuck:

```bash
kubectl describe installation default
kubectl get installation default -o yaml | grep -A10 status
```

Delete and recreate the Installation CR:

```bash
kubectl delete installation default
```

The Operator should recreate it automatically.

## Step 7: Check Helm Values

Review the deployed values for misconfiguration:

```bash
helm get values calico -n tigera-operator
```

Apply corrected values:

```bash
helm upgrade calico projectcalico/tigera-operator \
  --version v3.27.0 \
  --namespace tigera-operator \
  --values corrected-values.yaml
```

## Conclusion

Troubleshooting Calico Helm installations requires working through three layers: Helm release status, Tigera Operator health, and Calico component status. The `tigerastatus` resource is your primary diagnostic tool at the Operator layer, while standard Kubernetes logs and events provide lower-level details for component-specific issues.
