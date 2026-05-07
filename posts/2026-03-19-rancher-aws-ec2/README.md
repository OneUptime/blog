# How to Install Rancher on AWS EC2

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, AWS, Cloud, Installation

Description: A practical guide to deploying Rancher on an AWS EC2 instance with K3s and Helm.

Amazon Web Services is one of the most widely used cloud platforms, and running Rancher on an EC2 instance gives you a powerful Kubernetes management layer on top of AWS infrastructure. This guide covers every step from provisioning the EC2 instance to accessing the Rancher dashboard.
This single-node setup is best suited for testing or proof-of-concept environments; Rancher recommends a highly available Kubernetes cluster for production deployments.

## Prerequisites

- An AWS account with permissions to create EC2 instances, security groups, and elastic IPs
- AWS CLI installed and configured on your local machine
- A domain name (optional but recommended)
- An SSH key pair registered in your AWS account
- The VPC ID and public subnet ID where you want to launch the instance

## Step 1: Create a Security Group

Create a security group that allows the necessary traffic for Rancher:

```bash
SG_ID=$(aws ec2 create-security-group \
  --group-name rancher-sg \
  --description "Security group for Rancher server" \
  --vpc-id <vpc-id> \
  --query 'GroupId' \
  --output text)

aws ec2 authorize-security-group-ingress \
  --group-id "$SG_ID" \
  --protocol tcp --port 22 --cidr <your-public-ip>/32

aws ec2 authorize-security-group-ingress \
  --group-id "$SG_ID" \
  --protocol tcp --port 80 --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id "$SG_ID" \
  --protocol tcp --port 443 --cidr 0.0.0.0/0
```

Replace `<vpc-id>` with your VPC ID and `<your-public-ip>` with the public IP or CIDR range you want to allow for SSH access. If you plan to access the Kubernetes API remotely, add TCP port 6443 only for trusted source IP ranges.

## Step 2: Launch an EC2 Instance

Launch an Ubuntu 22.04 instance in a public subnet with at least a t3.xlarge instance type:

```bash
aws ec2 run-instances \
  --image-id resolve:ssm:/aws/service/canonical/ubuntu/server/22.04/stable/current/amd64/hvm/ebs-gp2/ami-id \
  --instance-type t3.xlarge \
  --count 1 \
  --key-name your-key-pair \
  --subnet-id <public-subnet-id> \
  --security-group-ids "$SG_ID" \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":50,"VolumeType":"gp3"}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=rancher-server}]'
```

Replace `your-key-pair` and `<public-subnet-id>` with your values. The `resolve:ssm:` parameter fetches the current Ubuntu 22.04 AMI for the AWS Region you are using.

## Step 3: Allocate and Associate an Elastic IP

Allocate an Elastic IP so your Rancher server has a stable public address:

```bash
aws ec2 allocate-address --domain vpc

aws ec2 associate-address \
  --instance-id i-xxxxxxxxxxxx \
  --allocation-id eipalloc-xxxxxxxxxxxx
```

Replace the instance ID and allocation ID with the values from the previous commands.

## Step 4: SSH into the Instance

Connect to your EC2 instance:

```bash
ssh -i ~/.ssh/your-key.pem ubuntu@<elastic-ip>
```

## Step 5: Install K3s

Rancher needs to run on a Kubernetes version supported by the Rancher release you plan to install. Install a supported K3s version on the instance:

```bash
curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION=<supported-k3s-version> sh -s - server --cluster-init --write-kubeconfig-mode 644
```

Replace `<supported-k3s-version>` with a K3s version from the Rancher support matrix for the Rancher release you want to install.

Verify K3s is running:

```bash
sudo k3s kubectl get nodes
```

Set up the kubeconfig:

```bash
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
```

## Step 6: Install Helm

Install Helm 3:

```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

## Step 7: Install cert-manager

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true
```

Wait for cert-manager to be ready:

```bash
kubectl get pods -n cert-manager
```

## Step 8: Install Rancher

Add the Rancher Helm chart repository and install Rancher:

```bash
helm repo add rancher-stable https://releases.rancher.com/server-charts/stable
helm repo update

kubectl create namespace cattle-system

helm install rancher rancher-stable/rancher \
  --namespace cattle-system \
  --set hostname=rancher.example.com \
  --set bootstrapPassword=admin \
  --set replicas=1
```

Replace `rancher.example.com` with your domain name or use the Elastic IP with a service like nip.io (for example, `rancher.1.2.3.4.nip.io`).

## Step 9: Set Up DNS

If you have a domain name, create an A record pointing to your Elastic IP address. If you do not have a domain, you can use a nip.io address for testing.

## Step 10: Verify the Installation

Wait for the deployment to complete:

```bash
kubectl -n cattle-system rollout status deploy/rancher
```

Check all pods:

```bash
kubectl -n cattle-system get pods
```

## Step 11: Access the Rancher UI

Open your browser and navigate to `https://rancher.example.com`. Log in with the bootstrap password and set a new admin password when prompted.

## Configuring AWS-Specific Settings

Once Rancher is running, you can configure it to provision additional EC2 instances as Kubernetes worker nodes. Navigate to Cluster Management in the Rancher UI and create a new cluster using the Amazon EC2 node driver. You will need to provide your AWS access key and secret key so Rancher can manage EC2 instances on your behalf.

## Cost Optimization Tips

- Use Reserved Instances or Savings Plans for the Rancher server if it will run long-term
- Consider using a t3.xlarge for small proof-of-concept deployments and larger instance types as you manage more clusters
- Use gp3 EBS volumes for better price-performance compared to gp2
- Set up billing alerts to monitor costs

## Summary

You now have Rancher running on an AWS EC2 instance. This setup gives you a centralized management plane for all your Kubernetes clusters, whether they run on AWS or other cloud providers. From here you can create and import clusters, manage workloads, and configure monitoring and alerting through the Rancher dashboard.
