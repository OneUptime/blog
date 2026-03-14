# Validate AWS VPC CNI Chaining with Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, EKS, AWS, EBPF

Description: Learn how to validate that Cilium is correctly chained with the AWS VPC CNI plugin on EKS or self-managed AWS Kubernetes clusters, ensuring both IPAM and network policy functions are working...

---

## Introduction

AWS VPC CNI chaining with Cilium is a deployment model where the AWS VPC CNI (aws-node) handles pod IP allocation from VPC subnets while Cilium acts as the network policy enforcement engine. This combination provides the best of both worlds: native VPC networking for AWS-compatible IP addressing and Cilium's powerful L3/L4/L7 policy enforcement.

Validating this chained configuration is more complex than validating either CNI independently. You must verify that the aws-node CNI is assigning VPC IPs to pods, that Cilium is correctly intercepting and filtering traffic with eBPF programs, and that network policies applied to pods are being enforced by Cilium rather than falling through to the default-allow behavior.

This guide provides a systematic validation process for AWS VPC CNI + Cilium chaining, covering connectivity, policy enforcement, and eBPF program verification.

## Prerequisites

- EKS cluster or self-managed AWS Kubernetes with VPC CNI chaining configured
- `aws` CLI configured
- `kubectl` with cluster-admin access
- `cilium` CLI installed
- Hubble enabled (recommended for traffic validation)

## Step 1: Verify the Chaining Configuration

Confirm that Cilium is configured in chaining mode with aws-node.

```bash
# Check the Cilium ConfigMap for chaining mode
kubectl get configmap -n kube-system cilium-config \
  -o jsonpath='{.data.cni-chaining-mode}'

# Expected output: aws-cni

# Also check the CNI configuration file on a node
kubectl debug node/<node-name> -it --image=ubuntu -- \
  chroot /host cat /etc/cni/net.d/10-aws.conflist

# The conflist should show both aws-cni and cilium chained
```

## Step 2: Verify AWS VPC CNI IPAM is Working

Confirm pods are receiving AWS VPC IPs, not Cilium-assigned IPs.

```bash
# Check pod IPs - they should be from your VPC subnet ranges
kubectl get pods -A -o wide | grep -v NAMESPACE | awk '{print $8}' | sort | head -20

# Verify these IPs are in your VPC subnet CIDR
aws ec2 describe-subnets \
  --filters "Name=tag:kubernetes.io/cluster/<cluster-name>,Values=shared" \
  --query "Subnets[*].{SubnetId:SubnetId,CIDR:CidrBlock}" \
  --region <region>

# Confirm ENI attachments for worker nodes
aws ec2 describe-network-interfaces \
  --filters "Name=attachment.instance-id,Values=<instance-id>" \
  --query "NetworkInterfaces[*].{ENI:NetworkInterfaceId,PrivateIP:PrivateIpAddress}"
```

## Step 3: Verify Cilium eBPF Programs are Attached

Confirm Cilium's eBPF programs are intercepting traffic.

```bash
# Check Cilium endpoints are registered for all pods
cilium endpoint list | head -20

# Verify the total endpoint count matches pod count
CILIUM_EP_COUNT=$(cilium endpoint list | grep -c "ready")
POD_COUNT=$(kubectl get pods -A --field-selector=status.phase=Running --no-headers | wc -l)
echo "Cilium endpoints: $CILIUM_EP_COUNT, Running pods: $POD_COUNT"

# Check eBPF programs are loaded
kubectl exec -n kube-system $(kubectl get pod -n kube-system -l k8s-app=cilium -o name | head -1) -- \
  cilium bpf endpoint list | head -10
```

## Step 4: Validate Network Policy Enforcement

Apply a test policy and verify Cilium enforces it correctly.

```bash
# Deploy two test pods
kubectl run policy-test-server --image=nginx --labels="app=policy-server"
kubectl run policy-test-client --image=curlimages/curl --labels="app=policy-client" \
  --command -- sleep infinity

# Verify both pods are running
kubectl get pods policy-test-server policy-test-client

# Test connectivity WITHOUT any policy (should succeed)
kubectl exec policy-test-client -- \
  curl -s --max-time 5 http://policy-test-server.default.svc.cluster.local

# Apply a deny policy to the server
kubectl apply -f - <<EOF
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: deny-all-ingress-test
  namespace: default
spec:
  endpointSelector:
    matchLabels:
      app: policy-server
  ingress: []
EOF

# Test connectivity WITH policy (should fail - Cilium is enforcing)
kubectl exec policy-test-client -- \
  curl -s --max-time 5 http://policy-test-server.default.svc.cluster.local || \
  echo "BLOCKED as expected by Cilium policy"
```

## Step 5: Use Hubble to Confirm Traffic Enforcement

Validate enforcement is visible in Hubble flows.

```bash
# Port-forward Hubble relay
cilium hubble port-forward &
sleep 2

# Watch flows during policy test
hubble observe --namespace default --follow &

# Generate traffic in another terminal
kubectl exec policy-test-client -- \
  curl -s --max-time 5 http://policy-test-server.default.svc.cluster.local

# Hubble should show DROPPED flows with reason "POLICY_DENIED"

# Cleanup test resources
kubectl delete pod policy-test-server policy-test-client
kubectl delete ciliumnetworkpolicy deny-all-ingress-test
```

## Best Practices

- Run validation after every Cilium or aws-node upgrade to confirm chaining still works
- Monitor both Cilium endpoint count and aws-node ENI counts for discrepancies
- Use Hubble `--verdict DROPPED` filter to quickly spot policy-enforcement issues
- Check `/etc/cni/net.d/` on nodes after any aws-node update - it can overwrite CNI config
- Verify aws-node and Cilium versions are compatible with the EKS Kubernetes version

## Conclusion

Validating AWS VPC CNI chaining with Cilium requires checking multiple layers: the CNI chaining configuration, VPC IP allocation by aws-node, eBPF program attachment by Cilium, and actual network policy enforcement. By systematically running these validation steps after installation and after every component upgrade, you confirm the chaining is working as expected and that Cilium is providing the policy enforcement layer that your cluster's security posture depends on.
