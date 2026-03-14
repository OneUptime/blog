# Troubleshoot Calico on Self-Managed AWS Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: calico, aws, kubernetes, self-managed, troubleshooting, networking, ec2

Description: A guide to diagnosing and resolving networking issues when running Calico on self-managed Kubernetes clusters deployed on AWS EC2 instances.

---

## Introduction

Self-managed Kubernetes on AWS (using tools like kubeadm, kops, or Kubespray) with Calico provides more flexibility than EKS but requires you to manage all networking components yourself. AWS-specific networking behaviors—such as security groups, the VPC's source/destination check, and the limited IP protocol support—directly impact Calico's behavior.

The most common issues in this environment involve AWS security groups blocking Calico's encapsulation protocols, the VPC's source/destination check interfering with pod routing, and BGP being blocked by security groups. Understanding these AWS-specific constraints is the key to effective troubleshooting.

## Prerequisites

- Self-managed Kubernetes cluster on AWS EC2
- `kubectl` and `calicoctl` installed
- AWS CLI configured with EC2 permissions
- Access to EC2 security groups

## Step 1: Disable Source/Destination Check for BGP Mode

If using Calico in BGP mode (no overlay), AWS's source/destination check must be disabled.

```bash
# Find the EC2 instance IDs for your Kubernetes nodes
aws ec2 describe-instances \
  --filters "Name=tag:kubernetes.io/cluster/<cluster-name>,Values=owned" \
  --query 'Reservations[*].Instances[*].[InstanceId,PrivateIpAddress]' \
  --output table

# Disable source/destination check on each node
aws ec2 modify-instance-attribute \
  --instance-id <instance-id> \
  --no-source-dest-check

# Verify the change
aws ec2 describe-instance-attribute \
  --instance-id <instance-id> \
  --attribute sourceDestCheck
```

## Step 2: Configure Security Groups for Calico Protocols

Allow the necessary ports and protocols for Calico networking.

```bash
# Get the security group ID for worker nodes
SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=tag:kubernetes.io/cluster/<cluster-name>,Values=owned" \
  --query 'SecurityGroups[0].GroupId' --output text)

# Allow IPIP (protocol 4) between nodes - needed for IPIP mode
aws ec2 authorize-security-group-ingress \
  --group-id ${SG_ID} \
  --protocol 4 \
  --source-group ${SG_ID}

# Allow VXLAN UDP 4789 - needed for VXLAN mode
aws ec2 authorize-security-group-ingress \
  --group-id ${SG_ID} \
  --protocol udp \
  --port 4789 \
  --source-group ${SG_ID}

# Allow BGP TCP 179 - needed for BGP mode
aws ec2 authorize-security-group-ingress \
  --group-id ${SG_ID} \
  --protocol tcp \
  --port 179 \
  --source-group ${SG_ID}
```

## Step 3: Diagnose Pod Connectivity Issues

Investigate pods that cannot communicate across nodes.

```bash
# Check if cross-node pod pings work
NODE_A_POD=$(kubectl get pods -o wide | grep node-a | head -1 | awk '{print $1}')
NODE_B_POD_IP=$(kubectl get pods -o wide | grep node-b | head -1 | awk '{print $6}')

kubectl exec ${NODE_A_POD} -- ping -c 3 ${NODE_B_POD_IP}

# If ping fails, check Calico node status
calicoctl node status

# Check if IPIP tunnels are established
kubectl debug node/<node-name> -it --image=ubuntu -- ip tunnel show
```

## Step 4: Resolve AWS-Specific Calico Node Configuration

Configure Calico to use the correct interface for AWS nodes.

```yaml
# felix-config-aws.yaml - Felix configuration optimized for AWS
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  # Use eth0 as the interface on standard AWS EC2 instances
  interfacePrefix: eth
  # Enable IPIP for cross-AZ routing (or VXLAN to avoid protocol 4 issues)
  ipipEnabled: true
```

```bash
calicoctl apply -f felix-config-aws.yaml
```

## Step 5: Test Cross-AZ Pod Connectivity

Validate that pod traffic works correctly across AWS Availability Zones.

```bash
# Verify pods can communicate across AZs
kubectl run cross-az-test --rm -it --image=busybox -- \
  traceroute <pod-ip-in-different-az>

# Check the encapsulation path (should go through IPIP tunnel)
kubectl debug node/<node-name> -it --image=ubuntu -- \
  tcpdump -i eth0 -n 'proto 4' -c 10
```

## Best Practices

- Use VXLAN instead of IPIP if you cannot modify security groups to allow protocol 4
- Always disable source/destination check when using Calico BGP mode without overlay
- Document all security group rules required for Calico and add them to your infrastructure-as-code
- Test cross-AZ connectivity after provisioning new nodes
- Set up AWS CloudWatch alarms for security group modification to detect accidental rule deletions

## Conclusion

Running Calico on self-managed AWS Kubernetes requires careful attention to AWS-specific networking constraints. By disabling source/destination checks for BGP mode, configuring security groups to allow Calico's protocols, and validating cross-AZ connectivity, you can ensure reliable pod networking across your AWS infrastructure.
