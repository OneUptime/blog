# How to Install Talos Linux on AWS EC2

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, AWS, EC2, Kubernetes, Cloud

Description: Step-by-step guide to installing Talos Linux on AWS EC2 instances and bootstrapping a production-ready Kubernetes cluster.

---

AWS EC2 is one of the most popular platforms for running Kubernetes, and Talos Linux is an excellent fit for this environment. Talos publishes official AMIs for all major AWS regions, which makes getting started straightforward. This guide walks through the complete process of deploying a Talos Linux Kubernetes cluster on AWS EC2, from setting up the infrastructure to bootstrapping the cluster.

## Prerequisites

Before starting, make sure you have the following tools installed:

```bash
# Install talosctl - the Talos management CLI
curl -sL https://talos.dev/install | sh

# Verify the installation
talosctl version --client

# Install the AWS CLI (if not already installed)
# and configure it with your credentials
aws configure

# Install kubectl for Kubernetes management
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/
```

## Setting Up AWS Infrastructure

First, create the necessary AWS resources. You will need a VPC, subnets, security groups, and a load balancer for the Kubernetes API.

```bash
# Create a VPC for the Talos cluster
VPC_ID=$(aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=talos-cluster}]' \
  --query 'Vpc.VpcId' --output text)

# Enable DNS hostnames
aws ec2 modify-vpc-attribute --vpc-id ${VPC_ID} --enable-dns-hostnames

# Create an internet gateway
IGW_ID=$(aws ec2 create-internet-gateway \
  --query 'InternetGateway.InternetGatewayId' --output text)
aws ec2 attach-internet-gateway --vpc-id ${VPC_ID} --internet-gateway-id ${IGW_ID}

# Create subnets across availability zones
SUBNET_1=$(aws ec2 create-subnet \
  --vpc-id ${VPC_ID} \
  --cidr-block 10.0.1.0/24 \
  --availability-zone us-east-1a \
  --query 'Subnet.SubnetId' --output text)

SUBNET_2=$(aws ec2 create-subnet \
  --vpc-id ${VPC_ID} \
  --cidr-block 10.0.2.0/24 \
  --availability-zone us-east-1b \
  --query 'Subnet.SubnetId' --output text)

SUBNET_3=$(aws ec2 create-subnet \
  --vpc-id ${VPC_ID} \
  --cidr-block 10.0.3.0/24 \
  --availability-zone us-east-1c \
  --query 'Subnet.SubnetId' --output text)

# Create a route table and add a route to the internet gateway
RTB_ID=$(aws ec2 create-route-table \
  --vpc-id ${VPC_ID} \
  --query 'RouteTable.RouteTableId' --output text)

aws ec2 create-route --route-table-id ${RTB_ID} \
  --destination-cidr-block 0.0.0.0/0 --gateway-id ${IGW_ID}

# Associate route table with all subnets
aws ec2 associate-route-table --subnet-id ${SUBNET_1} --route-table-id ${RTB_ID}
aws ec2 associate-route-table --subnet-id ${SUBNET_2} --route-table-id ${RTB_ID}
aws ec2 associate-route-table --subnet-id ${SUBNET_3} --route-table-id ${RTB_ID}
```

## Creating Security Groups

Create security groups that allow the necessary traffic for a Talos cluster:

```bash
# Create security group for control plane nodes
CP_SG=$(aws ec2 create-security-group \
  --group-name talos-controlplane \
  --description "Talos control plane security group" \
  --vpc-id ${VPC_ID} \
  --query 'GroupId' --output text)

# Allow Talos API (50000)
aws ec2 authorize-security-group-ingress --group-id ${CP_SG} \
  --protocol tcp --port 50000 --cidr 10.0.0.0/16

# Allow Kubernetes API (6443) from the load balancer
aws ec2 authorize-security-group-ingress --group-id ${CP_SG} \
  --protocol tcp --port 6443 --cidr 0.0.0.0/0

# Allow etcd peer communication (2379-2380)
aws ec2 authorize-security-group-ingress --group-id ${CP_SG} \
  --protocol tcp --port 2379-2380 --source-group ${CP_SG}

# Allow all internal cluster traffic
aws ec2 authorize-security-group-ingress --group-id ${CP_SG} \
  --protocol -1 --source-group ${CP_SG}

# Create security group for worker nodes
WORKER_SG=$(aws ec2 create-security-group \
  --group-name talos-workers \
  --description "Talos worker security group" \
  --vpc-id ${VPC_ID} \
  --query 'GroupId' --output text)

# Allow kubelet API (10250) from control plane
aws ec2 authorize-security-group-ingress --group-id ${WORKER_SG} \
  --protocol tcp --port 10250 --source-group ${CP_SG}

# Allow all traffic between workers
aws ec2 authorize-security-group-ingress --group-id ${WORKER_SG} \
  --protocol -1 --source-group ${WORKER_SG}

# Allow traffic from control plane to workers
aws ec2 authorize-security-group-ingress --group-id ${WORKER_SG} \
  --protocol -1 --source-group ${CP_SG}
```

## Creating a Network Load Balancer

The Kubernetes API needs a load balancer to provide a stable endpoint:

```bash
# Create a Network Load Balancer for the Kubernetes API
NLB_ARN=$(aws elbv2 create-load-balancer \
  --name talos-k8s-api \
  --type network \
  --subnets ${SUBNET_1} ${SUBNET_2} ${SUBNET_3} \
  --query 'LoadBalancers[0].LoadBalancerArn' --output text)

# Get the NLB DNS name
NLB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns ${NLB_ARN} \
  --query 'LoadBalancers[0].DNSName' --output text)

# Create a target group
TG_ARN=$(aws elbv2 create-target-group \
  --name talos-k8s-api \
  --protocol TCP \
  --port 6443 \
  --vpc-id ${VPC_ID} \
  --target-type instance \
  --health-check-protocol TCP \
  --query 'TargetGroups[0].TargetGroupArn' --output text)

# Create a listener
aws elbv2 create-listener \
  --load-balancer-arn ${NLB_ARN} \
  --protocol TCP \
  --port 6443 \
  --default-actions Type=forward,TargetGroupArn=${TG_ARN}

echo "Kubernetes API endpoint: https://${NLB_DNS}:6443"
```

## Generating Talos Configuration

Generate the Talos machine configuration using the NLB DNS name as the cluster endpoint:

```bash
# Generate cluster configuration
talosctl gen config talos-aws-cluster "https://${NLB_DNS}:6443" \
  --output-dir _out

# This creates:
# _out/controlplane.yaml  - Configuration for control plane nodes
# _out/worker.yaml         - Configuration for worker nodes
# _out/talosconfig         - Client configuration for talosctl
```

## Finding the Talos AMI

Talos publishes official AMIs for each release:

```bash
# Find the latest Talos AMI for your region
TALOS_AMI=$(aws ec2 describe-images \
  --owners 540036508848 \
  --filters "Name=name,Values=talos-v1.7.*-amd64" \
  --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
  --output text)

echo "Using Talos AMI: ${TALOS_AMI}"
```

## Launching Control Plane Nodes

Launch three control plane instances across availability zones:

```bash
# Launch control plane node 1
CP1_ID=$(aws ec2 run-instances \
  --image-id ${TALOS_AMI} \
  --instance-type m5.xlarge \
  --subnet-id ${SUBNET_1} \
  --security-group-ids ${CP_SG} \
  --associate-public-ip-address \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=talos-cp-1}]' \
  --user-data file://_out/controlplane.yaml \
  --query 'Instances[0].InstanceId' --output text)

# Launch control plane node 2
CP2_ID=$(aws ec2 run-instances \
  --image-id ${TALOS_AMI} \
  --instance-type m5.xlarge \
  --subnet-id ${SUBNET_2} \
  --security-group-ids ${CP_SG} \
  --associate-public-ip-address \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=talos-cp-2}]' \
  --user-data file://_out/controlplane.yaml \
  --query 'Instances[0].InstanceId' --output text)

# Launch control plane node 3
CP3_ID=$(aws ec2 run-instances \
  --image-id ${TALOS_AMI} \
  --instance-type m5.xlarge \
  --subnet-id ${SUBNET_3} \
  --security-group-ids ${CP_SG} \
  --associate-public-ip-address \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=talos-cp-3}]' \
  --user-data file://_out/controlplane.yaml \
  --query 'Instances[0].InstanceId' --output text)

# Register control plane instances with the target group
aws elbv2 register-targets --target-group-arn ${TG_ARN} \
  --targets Id=${CP1_ID} Id=${CP2_ID} Id=${CP3_ID}
```

## Launching Worker Nodes

Launch worker nodes for your workloads:

```bash
# Launch worker nodes
for i in 1 2 3; do
  SUBNET_VAR="SUBNET_${i}"
  aws ec2 run-instances \
    --image-id ${TALOS_AMI} \
    --instance-type m5.2xlarge \
    --subnet-id ${!SUBNET_VAR} \
    --security-group-ids ${WORKER_SG} \
    --associate-public-ip-address \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=talos-worker-${i}}]" \
    --user-data file://_out/worker.yaml
done
```

## Bootstrapping the Cluster

Once the instances are running, bootstrap the Kubernetes cluster:

```bash
# Get the public IP of the first control plane node
CP1_IP=$(aws ec2 describe-instances \
  --instance-ids ${CP1_ID} \
  --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)

# Configure talosctl to use the cluster
talosctl config merge _out/talosconfig
talosctl config endpoint ${CP1_IP}
talosctl config node ${CP1_IP}

# Bootstrap the cluster (run only once, on a single control plane node)
talosctl bootstrap --nodes ${CP1_IP}

# Wait for the cluster to be healthy
talosctl health --wait-timeout 10m

# Retrieve the kubeconfig
talosctl kubeconfig -n ${CP1_IP} -e ${CP1_IP}

# Verify the cluster
kubectl get nodes
```

## Verifying the Cluster

After bootstrapping, verify that everything is working:

```bash
# Check all nodes are ready
kubectl get nodes -o wide

# Verify system pods are running
kubectl get pods -A

# Check the Talos node health
talosctl health --nodes ${CP1_IP}

# Verify etcd is healthy
talosctl etcd status --nodes ${CP1_IP}
```

## Next Steps

With your Talos Linux cluster running on AWS EC2, you should:

1. Install a CNI plugin (Cilium, Calico, or Flannel)
2. Set up persistent storage (EBS CSI driver)
3. Configure the AWS cloud controller manager
4. Set up monitoring and logging
5. Create backup procedures for etcd

This gives you a production-ready foundation that is both highly secure and straightforward to manage through the Talos API.
