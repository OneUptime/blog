# How to Use AWS EKS-compatible Networking with Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, AWS, EKS, Networking, VPC CNI, Kubernetes

Description: Learn how to configure AWS VPC CNI networking on Talos Linux for EKS-compatible pod networking with native VPC IP addresses.

---

One of the things that makes EKS networking appealing is that every pod gets a real VPC IP address. This means pods can communicate directly with other AWS resources without NAT, and security groups work at the pod level. You do not need EKS to get this behavior. By running the AWS VPC CNI plugin on Talos Linux, you can have the same networking model on your self-managed clusters. This guide explains how to set it up and what trade-offs to consider.

## How AWS VPC CNI Works

Traditional CNI plugins like Calico or Flannel create an overlay network. Pods get IPs from a virtual address space, and traffic between nodes goes through encapsulation (VXLAN, IPIP, or WireGuard). The AWS VPC CNI takes a different approach. It uses the Elastic Network Interface (ENI) system to assign real VPC IP addresses directly to pods.

Each EC2 instance can have multiple ENIs, and each ENI can have multiple secondary IP addresses. The VPC CNI plugin manages these ENIs and IPs, allocating them to pods as they get scheduled. The result is that pod-to-pod traffic stays within the VPC fabric with no overlay, no encapsulation, and no extra latency.

The downside is that the number of pods you can run per node is limited by the instance type. A `t3.medium` can hold about 17 pods, while an `m5.xlarge` can handle around 58. You need to plan your instance types around your pod density requirements.

## Prerequisites

You need the following:

- A Talos Linux cluster running on AWS
- The AWS external cloud provider enabled
- Subnets with enough IP addresses for your expected pod count
- IAM permissions for the VPC CNI plugin

## Configuring Talos for VPC CNI

Talos Linux ships with Flannel as its default CNI. To use the AWS VPC CNI instead, you need to disable the default CNI in the machine configuration and deploy the VPC CNI manually.

Generate your Talos config with the CNI disabled:

```bash
# Generate config with the default CNI disabled
talosctl gen config my-cluster https://my-cluster-endpoint:6443 \
  --config-patch='[
    {"op": "add", "path": "/cluster/network/cni", "value": {
      "name": "none"
    }},
    {"op": "add", "path": "/cluster/externalCloudProvider", "value": {
      "enabled": true
    }}
  ]'
```

Setting the CNI to `none` tells Talos not to deploy any CNI plugin. Your nodes will come up but pods will not be schedulable until you install the VPC CNI.

## IAM Policy for VPC CNI

The VPC CNI needs permissions to manage ENIs and IP addresses:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:AssignPrivateIpAddresses",
        "ec2:AttachNetworkInterface",
        "ec2:CreateNetworkInterface",
        "ec2:DeleteNetworkInterface",
        "ec2:DescribeInstances",
        "ec2:DescribeTags",
        "ec2:DescribeNetworkInterfaces",
        "ec2:DescribeInstanceTypes",
        "ec2:DetachNetworkInterface",
        "ec2:ModifyNetworkInterfaceAttribute",
        "ec2:UnassignPrivateIpAddresses",
        "ec2:CreateTags"
      ],
      "Resource": "*"
    }
  ]
}
```

Attach this policy to your worker node IAM role.

## Deploying the VPC CNI Plugin

Deploy the AWS VPC CNI using the official manifests or Helm chart:

```bash
# Add the EKS Helm repository
helm repo add eks https://aws.github.io/eks-charts
helm repo update

# Install the VPC CNI plugin
helm install aws-vpc-cni eks/aws-vpc-cni \
  --namespace kube-system \
  --set init.image.tag=v1.15.1 \
  --set image.tag=v1.15.1 \
  --set env.WARM_ENI_TARGET="1" \
  --set env.MINIMUM_IP_TARGET="10" \
  --set env.ENABLE_PREFIX_DELEGATION="false"
```

The `WARM_ENI_TARGET` setting controls how many spare ENIs the plugin keeps ready. Setting it to 1 means one extra ENI is always pre-allocated for fast pod startup. The `MINIMUM_IP_TARGET` sets the minimum number of IP addresses to keep available.

## Understanding Pod IP Allocation

When a pod starts on a node, the VPC CNI assigns it a secondary IP from one of the node's ENIs. Let us trace through the process:

1. The kubelet calls the CNI plugin to set up networking for a new pod
2. The VPC CNI checks if there is a free IP in its local pool
3. If yes, it assigns the IP to the pod and configures the network namespace
4. If no, it requests new IPs from the EC2 API (attaching a new ENI if needed)

You can check the IP allocation status on any node:

```bash
# Check how many IPs are allocated and available on each node
kubectl get nodes -o custom-columns=NAME:.metadata.name,PODS:.status.allocatable.pods

# Look at the ENI configuration on a specific node
kubectl exec -n kube-system $(kubectl get pods -n kube-system -l k8s-app=aws-node -o jsonpath='{.items[0].metadata.name}') -- /app/grpc-health-probe -addr=:50051 || true
kubectl logs -n kube-system -l k8s-app=aws-node
```

## Enabling Prefix Delegation

If you need more pods per node, prefix delegation is the answer. Instead of assigning individual IPs to ENIs, the VPC CNI can assign /28 prefixes (16 IPs each). This dramatically increases pod density.

```bash
# Enable prefix delegation for higher pod density
helm upgrade aws-vpc-cni eks/aws-vpc-cni \
  --namespace kube-system \
  --set env.ENABLE_PREFIX_DELEGATION="true" \
  --set env.WARM_PREFIX_TARGET="1"
```

With prefix delegation, a `m5.xlarge` can support over 100 pods instead of 58. The trade-off is that you need larger subnets, as each prefix consumes a /28 block.

## Security Groups for Pods

One of the unique features of VPC CNI is the ability to assign security groups directly to pods. This lets you control network access at the pod level using AWS security groups, not just Kubernetes NetworkPolicies.

```yaml
# security-group-policy.yaml
apiVersion: vpcresources.k8s.aws/v1beta1
kind: SecurityGroupPolicy
metadata:
  name: database-access
  namespace: default
spec:
  podSelector:
    matchLabels:
      role: database-client
  securityGroups:
    groupIds:
      - sg-xxxxxxxxxxxxxxxxx
```

Any pod with the label `role: database-client` will get the specified security group attached to its ENI. This is powerful for enforcing network boundaries between your Kubernetes workloads and other AWS resources like RDS databases.

## Network Policy Support

The VPC CNI also supports Kubernetes NetworkPolicies natively, without needing Calico or another policy engine:

```bash
# Enable network policy support
helm upgrade aws-vpc-cni eks/aws-vpc-cni \
  --namespace kube-system \
  --set enableNetworkPolicy=true
```

## Subnet Sizing Considerations

With VPC CNI, your subnet size directly limits how many pods you can run. Each pod takes one IP address from the subnet (or one from a /28 prefix). Plan your subnets accordingly:

- A /24 subnet gives you 251 usable IPs
- A /20 subnet gives you 4,091 usable IPs
- A /16 subnet gives you 65,531 usable IPs

For most clusters, a /20 per availability zone works well. It gives you enough room for several hundred nodes and thousands of pods.

## Troubleshooting

If pods are stuck in `ContainerCreating` state, the most likely cause is IP exhaustion. Check the VPC CNI logs:

```bash
# Check CNI plugin logs for IP allocation issues
kubectl logs -n kube-system -l k8s-app=aws-node --tail=50
```

Look for messages about failed IP allocation or ENI attachment errors. Also check that your subnets have available IPs and that your instances have not hit their ENI limit.

## Conclusion

The AWS VPC CNI on Talos Linux gives you EKS-compatible networking without EKS. Pods get real VPC IPs, security groups work at the pod level, and there is no overlay network adding latency. The main planning considerations are instance type selection for pod density and subnet sizing for IP availability. For workloads that need tight integration with other AWS services, this is the best networking option available.
