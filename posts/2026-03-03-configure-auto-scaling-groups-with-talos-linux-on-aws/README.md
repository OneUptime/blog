# How to Configure Auto Scaling Groups with Talos Linux on AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, AWS, Auto Scaling, Kubernetes, Infrastructure, EC2

Description: Learn how to set up AWS Auto Scaling Groups with Talos Linux for dynamic worker node scaling in your Kubernetes cluster.

---

Running a fixed number of Kubernetes worker nodes works fine for predictable workloads, but when demand fluctuates, you want your cluster to scale automatically. AWS Auto Scaling Groups (ASGs) handle this at the infrastructure level, and when combined with the Kubernetes Cluster Autoscaler, your cluster can grow and shrink based on actual pod scheduling needs. This guide shows how to configure ASGs with Talos Linux for a fully elastic Kubernetes cluster.

## How Auto Scaling Groups Work with Kubernetes

The flow is straightforward. The Kubernetes Cluster Autoscaler watches for pods that cannot be scheduled due to insufficient resources. When it finds unschedulable pods, it tells the ASG to add more instances. When nodes are underutilized and their pods can be moved elsewhere, the Cluster Autoscaler removes the excess nodes by scaling down the ASG.

Talos Linux fits into this model cleanly because every node boots from the same machine configuration. There is no SSH access to worry about, no configuration drift, and no snowflake nodes. Every instance in the ASG is identical.

## Prerequisites

You need:

- A running Talos Linux cluster on AWS with at least one control plane node
- The AWS cloud provider configured
- A Talos worker machine configuration file
- `kubectl`, `talosctl`, and the AWS CLI installed

## Creating a Launch Template

The launch template defines what each worker node looks like. It includes the AMI, instance type, IAM role, security groups, and the Talos machine configuration:

```bash
# Encode the worker configuration for user-data
ENCODED_CONFIG=$(base64 -i worker.yaml)

# Create the launch template
aws ec2 create-launch-template \
  --launch-template-name talos-workers \
  --version-description "Talos Linux worker nodes v1" \
  --launch-template-data '{
    "ImageId": "ami-0xxxxxxxxxxxxxxxxx",
    "InstanceType": "m5.2xlarge",
    "IamInstanceProfile": {"Name": "talos-worker-profile"},
    "SecurityGroupIds": ["sg-xxxxxxxx"],
    "UserData": "'$ENCODED_CONFIG'",
    "BlockDeviceMappings": [{
      "DeviceName": "/dev/xvda",
      "Ebs": {
        "VolumeSize": 100,
        "VolumeType": "gp3",
        "Encrypted": true
      }
    }],
    "TagSpecifications": [{
      "ResourceType": "instance",
      "Tags": [
        {"Key": "Name", "Value": "talos-worker"},
        {"Key": "kubernetes.io/cluster/my-cluster", "Value": "owned"}
      ]
    }],
    "MetadataOptions": {
      "HttpTokens": "required",
      "HttpPutResponseHopLimit": 2
    }
  }'
```

The `MetadataOptions` block enforces IMDSv2, which is a security best practice. The hop limit of 2 allows containers to access the instance metadata service through the pod network.

## Creating the Auto Scaling Group

Now create the ASG using the launch template:

```bash
# Create the Auto Scaling Group
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name talos-workers-asg \
  --launch-template LaunchTemplateName=talos-workers,Version='$Latest' \
  --min-size 2 \
  --max-size 20 \
  --desired-capacity 3 \
  --vpc-zone-identifier "subnet-aaaa,subnet-bbbb,subnet-cccc" \
  --tags \
    "Key=kubernetes.io/cluster/my-cluster,Value=owned,PropagateAtLaunch=true" \
    "Key=k8s.io/cluster-autoscaler/enabled,Value=true,PropagateAtLaunch=true" \
    "Key=k8s.io/cluster-autoscaler/my-cluster,Value=owned,PropagateAtLaunch=true"
```

The `vpc-zone-identifier` should include subnets across multiple availability zones for high availability. The autoscaler-specific tags are required for the Cluster Autoscaler to discover this ASG.

## Configuring Health Checks

ASG health checks ensure that unhealthy instances get replaced automatically:

```bash
# Add EC2 health check with a grace period
aws autoscaling update-auto-scaling-group \
  --auto-scaling-group-name talos-workers-asg \
  --health-check-type EC2 \
  --health-check-grace-period 300
```

The 300-second grace period gives Talos time to boot, join the cluster, and become Ready before the ASG starts checking health. Without this grace period, the ASG might terminate instances that are still starting up.

## Deploying the Cluster Autoscaler

The Cluster Autoscaler runs as a deployment in your cluster and interacts with the ASG through the AWS API:

```yaml
# cluster-autoscaler.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cluster-autoscaler
  template:
    metadata:
      labels:
        app: cluster-autoscaler
    spec:
      serviceAccountName: cluster-autoscaler
      nodeSelector:
        node-role.kubernetes.io/control-plane: ""
      tolerations:
        - key: node-role.kubernetes.io/control-plane
          effect: NoSchedule
      containers:
        - name: cluster-autoscaler
          image: registry.k8s.io/autoscaling/cluster-autoscaler:v1.29.0
          command:
            - ./cluster-autoscaler
            - --v=4
            - --stderrthreshold=info
            - --cloud-provider=aws
            - --skip-nodes-with-local-storage=false
            - --expander=least-waste
            - --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/my-cluster
            - --balance-similar-node-groups
            - --scale-down-delay-after-add=10m
            - --scale-down-unneeded-time=10m
          resources:
            limits:
              cpu: 100m
              memory: 600Mi
            requests:
              cpu: 100m
              memory: 600Mi
```

The key flags here are:

- `--node-group-auto-discovery`: Automatically discovers ASGs by tag
- `--expander=least-waste`: Picks the ASG that wastes the least resources
- `--scale-down-delay-after-add`: Prevents rapid scale-down after adding nodes
- `--balance-similar-node-groups`: Distributes nodes evenly across AZs

## RBAC for the Cluster Autoscaler

```yaml
# autoscaler-rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cluster-autoscaler
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cluster-autoscaler
rules:
  - apiGroups: [""]
    resources: ["events", "endpoints"]
    verbs: ["create", "patch"]
  - apiGroups: [""]
    resources: ["pods/eviction"]
    verbs: ["create"]
  - apiGroups: [""]
    resources: ["pods/status"]
    verbs: ["update"]
  - apiGroups: [""]
    resources: ["nodes", "pods", "services", "replicationcontrollers", "persistentvolumeclaims", "persistentvolumes"]
    verbs: ["watch", "list", "get"]
  - apiGroups: ["apps"]
    resources: ["daemonsets", "replicasets", "statefulsets"]
    verbs: ["watch", "list", "get"]
  - apiGroups: ["storage.k8s.io"]
    resources: ["storageclasses", "csinodes", "csidrivers", "csistoragecapacities"]
    verbs: ["watch", "list", "get"]
  - apiGroups: ["coordination.k8s.io"]
    resources: ["leases"]
    verbs: ["create", "get", "update"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cluster-autoscaler
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-autoscaler
subjects:
  - kind: ServiceAccount
    name: cluster-autoscaler
    namespace: kube-system
```

## IAM Permissions for the Autoscaler

The Cluster Autoscaler needs permissions to describe and modify ASGs:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "autoscaling:DescribeAutoScalingGroups",
        "autoscaling:DescribeAutoScalingInstances",
        "autoscaling:DescribeLaunchConfigurations",
        "autoscaling:DescribeScalingActivities",
        "autoscaling:DescribeTags",
        "autoscaling:SetDesiredCapacity",
        "autoscaling:TerminateInstanceInAutoScalingGroup",
        "ec2:DescribeLaunchTemplateVersions",
        "ec2:DescribeInstanceTypes"
      ],
      "Resource": ["*"]
    }
  ]
}
```

## Testing the Autoscaler

Deploy a workload that requests more resources than your current nodes can provide:

```bash
# Create a deployment that will trigger scale-up
kubectl create deployment scale-test --image=nginx --replicas=50
kubectl set resources deployment scale-test --requests=cpu=500m,memory=512Mi

# Watch the autoscaler logs
kubectl logs -n kube-system -l app=cluster-autoscaler -f

# Watch new nodes come online
kubectl get nodes --watch
```

You should see the autoscaler detect unschedulable pods and request new instances from the ASG.

## Multiple ASGs for Different Workloads

You can create multiple ASGs with different instance types for different workload profiles:

```bash
# Create a GPU ASG for ML workloads
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name talos-gpu-workers \
  --launch-template LaunchTemplateName=talos-gpu-workers,Version='$Latest' \
  --min-size 0 \
  --max-size 10 \
  --desired-capacity 0 \
  --vpc-zone-identifier "subnet-aaaa"
```

Set `min-size` and `desired-capacity` to 0 for specialized ASGs. The autoscaler will scale them up only when pods that need those resources are scheduled.

## Conclusion

Auto Scaling Groups combined with the Kubernetes Cluster Autoscaler give your Talos Linux cluster the ability to respond to changing demand automatically. The immutable nature of Talos makes this particularly reliable since every new node is identical to every other node. Start with conservative scaling parameters, monitor the behavior, and adjust the timers and limits as you learn how your workloads behave.
