# How to Use Dapr with Confidential Computing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Confidential Computing, Security, TEE, Encryption

Description: Learn how to integrate Dapr with confidential computing environments like Intel TDX or AMD SEV to protect sensitive workloads with hardware-level isolation and attested secrets.

---

Confidential computing uses hardware-backed Trusted Execution Environments (TEEs) to protect data in use - even from the cloud provider or cluster administrator. Running Dapr inside a TEE combines application building blocks with hardware-level data protection.

## What Confidential Computing Adds to Dapr

Without confidential computing, Dapr secrets and state are protected by software controls (RBAC, encryption at rest). With confidential computing:

- The Dapr sidecar and application run in a hardware-isolated enclave
- Memory is encrypted - the host OS cannot read it
- Attestation proves to external services that the code runs unmodified in a genuine TEE
- Secrets are released only after successful attestation

## Confidential Containers on Kubernetes

Confidential containers (CoCo) is a CNCF project that adds TEE support to Kubernetes pods. Install the CoCo operator:

```bash
# Install confidential containers via Helm
helm install coco oci://ghcr.io/confidential-containers/charts/confidential-containers \
  --namespace coco-system --create-namespace

# Verify RuntimeClass is created
kubectl get runtimeclass
# NAME                 HANDLER               AGE
# kata-qemu-tdx        kata-qemu-tdx         2m
```

## Running Dapr Inside a Confidential Pod

Annotate your deployment to use the TEE runtime class:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payments-processor
spec:
  selector:
    matchLabels:
      app: payments-processor
  template:
    metadata:
      labels:
        app: payments-processor
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "payments-processor"
        dapr.io/app-port: "8080"
    spec:
      runtimeClassName: kata-qemu-tdx   # Run in Intel TDX enclave
      containers:
        - name: payments-processor
          image: myapp:latest
```

The Dapr sidecar injected into this pod will also run inside the TEE.

## Attested Secret Retrieval

Use a TEE-aware secret provider to only release secrets after attestation. Integrate with Azure Confidential Ledger or a custom attestation service:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: secretstore
spec:
  type: secretstores.azure.keyvault
  version: v1
  metadata:
    - name: vaultName
      value: "my-keyvault"
    - name: azureClientId
      value: "workload-identity-client-id"
    # Azure Attestation (MAA) validates the TEE attestation report;
    # Key Vault Secure Key Release then checks the attestation claims before releasing secrets
```

## Encrypting Dapr State in a TEE

Use Dapr's state encryption with an encryption key retrieved from a TEE-protected secret store:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis:6379"
    - name: primaryEncryptionKey
      secretKeyRef:
        name: secretstore    # backed by attested secret store
        key: state-key
```

## Verifying TEE Attestation

Check that pods are running in the expected TEE environment:

```bash
# Verify pod is running with the kata runtime
kubectl get pod payments-processor -o jsonpath='{.spec.runtimeClassName}'
# Output: kata-qemu-tdx

# Check TEE attestation report (tool depends on cloud provider)
kubectl exec payments-processor -- tdx-attest report
```

## Limitations

- TEE runtimes have higher startup overhead (1-5 seconds for enclave initialization)
- Memory is limited by enclave size (typically 4-64 GB depending on hardware)
- Not all Dapr component types are compatible with confidential containers due to network path changes

## Summary

Running Dapr in confidential computing environments combines Dapr's application building blocks with hardware-backed memory encryption and remote attestation. Use confidential containers (CoCo) to run Dapr pods in Intel TDX or AMD SEV enclaves, integrate with TEE-aware secret stores that validate attestation before releasing credentials, and encrypt Dapr state with TEE-protected keys.
