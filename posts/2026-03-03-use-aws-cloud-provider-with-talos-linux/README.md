# How to Use AWS Cloud Provider with Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, AWS, Cloud Provider, Kubernetes, Infrastructure

Description: Learn how to integrate the AWS cloud provider with Talos Linux for native cloud resource management in your Kubernetes clusters.

---

Running Kubernetes on AWS is a common choice for teams that want elastic infrastructure and a mature ecosystem of managed services. When you combine that with Talos Linux, you get an immutable, minimal operating system that removes a lot of the operational baggage that comes with traditional Linux distributions. But to get the most out of AWS-native features like load balancers, EBS volumes, and node lifecycle management, you need the AWS cloud provider properly configured. This guide walks you through the entire process.

## Why Use the AWS Cloud Provider?

The AWS cloud provider integration allows Kubernetes to talk directly to AWS APIs. Without it, your cluster has no awareness of the underlying infrastructure. You lose the ability to automatically provision Elastic Load Balancers when you create a Service of type LoadBalancer, and your nodes will not have proper AWS metadata attached. The cloud provider bridges the gap between your Kubernetes abstractions and the actual AWS resources backing them.

With the cloud provider enabled, nodes get labeled with their availability zone, instance type, and region. Persistent volumes can be automatically provisioned on EBS. Load balancers get created and destroyed as Services come and go.

## Prerequisites

Before you begin, make sure you have the following ready:

- An AWS account with appropriate IAM permissions
- `talosctl` installed on your local machine
- `kubectl` installed and configured
- A basic understanding of Talos Linux machine configuration
- At least one control plane node and one worker node planned

## Setting Up IAM Roles

The AWS cloud provider needs IAM permissions to manage resources. You will need two IAM roles: one for control plane nodes and one for worker nodes.

For the control plane role, create a policy with these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "autoscaling:DescribeAutoScalingGroups",
        "autoscaling:DescribeLaunchConfigurations",
        "autoscaling:DescribeTags",
        "ec2:DescribeInstances",
        "ec2:DescribeRegions",
        "ec2:DescribeRouteTables",
        "ec2:DescribeSecurityGroups",
        "ec2:DescribeSubnets",
        "ec2:DescribeVolumes",
        "ec2:CreateSecurityGroup",
        "ec2:CreateTags",
        "ec2:CreateVolume",
        "ec2:ModifyInstanceAttribute",
        "ec2:ModifyVolume",
        "ec2:AttachVolume",
        "ec2:AuthorizeSecurityGroupIngress",
        "ec2:CreateRoute",
        "ec2:DeleteRoute",
        "ec2:DeleteSecurityGroup",
        "ec2:DeleteVolume",
        "ec2:DetachVolume",
        "ec2:RevokeSecurityGroupIngress",
        "ec2:DescribeVpcs",
        "elasticloadbalancing:*",
        "iam:CreateServiceLinkedRole",
        "kms:DescribeKey"
      ],
      "Resource": ["*"]
    }
  ]
}
```

Worker nodes need a subset of these permissions. At minimum, they need `ec2:DescribeInstances`, `ec2:DescribeRegions`, and `ec2:DescribeRouteTables`.

## Configuring Talos Linux Machine Config

Talos uses a YAML-based machine configuration. To enable the external AWS cloud provider, you need to patch your machine config. First, generate your base configuration:

```bash
# Generate Talos machine configuration for AWS
talosctl gen config my-cluster https://my-cluster-endpoint:6443 \
  --config-patch='[
    {"op": "add", "path": "/cluster/externalCloudProvider", "value": {
      "enabled": true,
      "manifests": [
        "https://raw.githubusercontent.com/kubernetes/cloud-provider-aws/master/manifests/rbac.yaml",
        "https://raw.githubusercontent.com/kubernetes/cloud-provider-aws/master/manifests/aws-cloud-controller-manager-daemonset.yaml"
      ]
    }}
  ]'
```

This tells Talos to configure the kubelet with `--cloud-provider=external` and deploy the AWS cloud controller manager automatically during bootstrap.

## Tagging AWS Resources

AWS cloud provider relies on tags to identify which resources belong to which cluster. Every EC2 instance, subnet, and security group that your cluster uses must be tagged:

```
kubernetes.io/cluster/my-cluster = owned
```

If the resource is shared across multiple clusters (like a VPC or subnet), use `shared` instead of `owned`:

```
kubernetes.io/cluster/my-cluster = shared
```

Without these tags, the cloud controller manager will not be able to discover your infrastructure, and things like load balancer provisioning will fail silently.

## Launching Instances

When launching EC2 instances for your Talos cluster, make sure to assign the correct IAM instance profile and include the required tags. Here is an example using the AWS CLI:

```bash
# Launch a control plane instance with the correct IAM role and tags
aws ec2 run-instances \
  --image-id ami-0xxxxxxxxxxxx \
  --instance-type m5.xlarge \
  --iam-instance-profile Name=talos-controlplane-profile \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=kubernetes.io/cluster/my-cluster,Value=owned},{Key=Name,Value=cp-1}]' \
  --user-data file://controlplane.yaml \
  --subnet-id subnet-xxxxxxxx \
  --security-group-ids sg-xxxxxxxx
```

The `--user-data` flag passes the Talos machine configuration to the instance. Talos reads this at boot and configures itself accordingly.

## Verifying the Cloud Provider

After your nodes boot and the cluster comes up, verify that the AWS cloud provider is running:

```bash
# Check that the cloud controller manager pods are running
kubectl get pods -n kube-system -l k8s-app=aws-cloud-controller-manager

# Verify nodes have AWS-specific labels
kubectl get nodes --show-labels | grep topology.kubernetes.io
```

You should see labels like `topology.kubernetes.io/zone=us-east-1a` and `node.kubernetes.io/instance-type=m5.xlarge` on your nodes. These labels confirm that the cloud provider is correctly fetching metadata from the AWS instance metadata service.

## Testing Load Balancer Integration

One of the most immediate benefits of the cloud provider is automatic load balancer provisioning. Create a simple test service:

```yaml
# test-lb-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: test-lb
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
spec:
  type: LoadBalancer
  selector:
    app: test
  ports:
    - port: 80
      targetPort: 8080
```

```bash
# Apply the service and watch for the external IP
kubectl apply -f test-lb-service.yaml
kubectl get svc test-lb --watch
```

Within a minute or two, you should see an external hostname appear in the EXTERNAL-IP column. That hostname points to a Network Load Balancer that AWS created on your behalf.

## Troubleshooting Common Issues

If nodes stay in a `NotReady` state or the cloud controller manager keeps restarting, check a few things. First, confirm that the IAM instance profile is attached to the EC2 instances. Without it, the cloud controller cannot authenticate to AWS APIs.

Second, verify your tags. Missing or incorrect cluster tags are the most common reason for the cloud provider to malfunction. Use the AWS console or CLI to double-check that your instances, subnets, and security groups are all tagged correctly.

Third, check the cloud controller manager logs:

```bash
# Stream logs from the cloud controller manager
kubectl logs -n kube-system -l k8s-app=aws-cloud-controller-manager -f
```

Look for authentication errors, permission denied messages, or resource not found errors. These will point you toward the specific issue.

## Moving to Production

For production clusters, consider a few additional steps. Use separate IAM roles for control plane and worker nodes, following the principle of least privilege. Place your control plane nodes across three availability zones for high availability. Configure the cloud provider to use specific subnets for load balancers by tagging those subnets with `kubernetes.io/role/elb=1` for public-facing load balancers or `kubernetes.io/role/internal-elb=1` for internal ones.

Also consider enabling the AWS EBS CSI driver alongside the cloud provider for persistent volume management, as the in-tree volume plugin is being deprecated in favor of the CSI approach.

## Conclusion

Integrating the AWS cloud provider with Talos Linux gives you the best of both worlds: an immutable, secure operating system with full access to AWS-native Kubernetes features. The setup involves IAM role configuration, proper resource tagging, and a few patches to the Talos machine config. Once it is running, you get automatic load balancer provisioning, proper node labeling, and a foundation for building production-grade clusters on AWS.
