# How to Set Up Rancher HA Behind a Load Balancer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, High Availability, Load Balancer, Installation

Description: Configure Rancher high availability with an external load balancer for production-grade reliability and traffic distribution.

A load balancer in front of your Rancher HA cluster provides a single entry point, automatic failover, and passive or active health checking depending on the load balancer. Instead of DNS round-robin, traffic is routed through a dedicated load balancer that sends requests only to nodes it still considers healthy. This guide covers setting up a Rancher HA cluster with both a software-based load balancer (Nginx) and cloud load balancer options.

## Prerequisites

- Three servers for the Rancher cluster (Ubuntu 22.04; for a small production Rancher management cluster, at least 4 vCPUs and 16 GB RAM per node)
- One additional server for the Nginx load balancer (or a cloud load balancer)
- Network connectivity between all servers
- A domain name
- SSH access to all servers

## Architecture

The load balancer sits in front of three K3s server nodes running Rancher:

```plaintext
                    +--> Node 1 (192.168.1.101)
Client --> LB (192.168.1.100) +--> Node 2 (192.168.1.102)
                    +--> Node 3 (192.168.1.103)
```

## Step 1: Set Up the K3s HA Cluster

On the first node, initialize K3s with embedded etcd:

```bash
ssh ubuntu@192.168.1.101

curl -sfL https://get.k3s.io | sh -s - server \
  --cluster-init \
  --write-kubeconfig-mode 644 \
  --tls-san rancher.example.com \
  --tls-san 192.168.1.100

TOKEN=$(sudo cat /var/lib/rancher/k3s/server/node-token)
echo "Join token: $TOKEN"
```

Join the second and third nodes:

```bash
# On node 2

ssh ubuntu@192.168.1.102
curl -sfL https://get.k3s.io | sh -s - server \
  --server https://192.168.1.101:6443 \
  --token <node-token> \
  --write-kubeconfig-mode 644 \
  --tls-san rancher.example.com \
  --tls-san 192.168.1.100

# On node 3
ssh ubuntu@192.168.1.103
curl -sfL https://get.k3s.io | sh -s - server \
  --server https://192.168.1.101:6443 \
  --token <node-token> \
  --write-kubeconfig-mode 644 \
  --tls-san rancher.example.com \
  --tls-san 192.168.1.100
```

Verify the cluster on any node:

```bash
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
kubectl get nodes
```

## Step 2: Install Rancher on the Cluster

On the first node:

```bash
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install cert-manager
helm repo add jetstack https://charts.jetstack.io
helm repo update
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true

# Wait for cert-manager
kubectl -n cert-manager rollout status deploy/cert-manager
kubectl -n cert-manager rollout status deploy/cert-manager-webhook
kubectl -n cert-manager rollout status deploy/cert-manager-cainjector

# Install Rancher
helm repo add rancher-stable https://releases.rancher.com/server-charts/stable
helm repo update
kubectl create namespace cattle-system
helm install rancher rancher-stable/rancher \
  --namespace cattle-system \
  --set hostname=rancher.example.com \
  --set bootstrapPassword=admin \
  --set replicas=3
```

## Step 3: Set Up the Nginx Load Balancer

SSH into the load balancer server:

```bash
ssh ubuntu@192.168.1.100
```

Install Nginx:

```bash
sudo apt update
sudo apt install -y nginx libnginx-mod-stream
```

Create the load balancer configuration:

```bash
sudo tee /etc/nginx/nginx.conf > /dev/null <<'EOF'
include /etc/nginx/modules-enabled/*.conf;

worker_processes auto;

events {
    worker_connections 1024;
}

stream {
    upstream rancher_https {
        least_conn;
        server 192.168.1.101:443 max_fails=3 fail_timeout=10s;
        server 192.168.1.102:443 max_fails=3 fail_timeout=10s;
        server 192.168.1.103:443 max_fails=3 fail_timeout=10s;
    }

    upstream rancher_http {
        least_conn;
        server 192.168.1.101:80 max_fails=3 fail_timeout=10s;
        server 192.168.1.102:80 max_fails=3 fail_timeout=10s;
        server 192.168.1.103:80 max_fails=3 fail_timeout=10s;
    }

    server {
        listen 443;
        proxy_pass rancher_https;
        proxy_timeout 1800s;
        proxy_connect_timeout 30s;
    }

    server {
        listen 80;
        proxy_pass rancher_http;
        proxy_timeout 1800s;
        proxy_connect_timeout 30s;
    }
}
EOF
```

Test and restart Nginx:

```bash
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## Step 4: Using a Cloud Load Balancer (Alternative)

If you are running on a cloud provider, you can use their managed load balancer instead of Nginx.

### AWS Network Load Balancer

```bash
# Create target groups
aws elbv2 create-target-group \
  --name rancher-tcp-443 \
  --protocol TCP \
  --port 443 \
  --vpc-id vpc-xxxxxxxx \
  --target-type instance \
  --health-check-protocol TCP \
  --health-check-port 80 \
  --health-check-interval-seconds 10 \
  --healthy-threshold-count 3 \
  --unhealthy-threshold-count 3

aws elbv2 create-target-group \
  --name rancher-tcp-80 \
  --protocol TCP \
  --port 80 \
  --vpc-id vpc-xxxxxxxx \
  --target-type instance \
  --health-check-protocol TCP \
  --health-check-interval-seconds 10 \
  --healthy-threshold-count 3 \
  --unhealthy-threshold-count 3

# Register targets
aws elbv2 register-targets \
  --target-group-arn <443-target-group-arn> \
  --targets Id=i-node1 Id=i-node2 Id=i-node3

aws elbv2 register-targets \
  --target-group-arn <80-target-group-arn> \
  --targets Id=i-node1 Id=i-node2 Id=i-node3

# Create the load balancer
aws elbv2 create-load-balancer \
  --name rancher-lb \
  --type network \
  --subnets subnet-xxx subnet-yyy \
  --scheme internet-facing

# Create listeners
aws elbv2 create-listener \
  --load-balancer-arn <load-balancer-arn> \
  --protocol TCP \
  --port 443 \
  --default-actions Type=forward,TargetGroupArn=<443-target-group-arn>

aws elbv2 create-listener \
  --load-balancer-arn <load-balancer-arn> \
  --protocol TCP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=<80-target-group-arn>
```

### DigitalOcean Load Balancer

```bash
doctl compute load-balancer create \
  --name rancher-lb \
  --region nyc3 \
  --forwarding-rules "entry_protocol:http,entry_port:80,target_protocol:http,target_port:80 entry_protocol:https,entry_port:443,target_protocol:https,target_port:443,tls_passthrough:true" \
  --health-check "protocol:http,port:80,path:/ping,check_interval_seconds:10,response_timeout_seconds:5,healthy_threshold:3,unhealthy_threshold:3" \
  --droplet-ids node1-id,node2-id,node3-id
```

## Step 5: Configure DNS

Create a DNS A record pointing your domain to the load balancer IP:

```plaintext
rancher.example.com  A  192.168.1.100
```

For cloud load balancers, use a CNAME record pointing to the load balancer DNS name.

## Step 6: Verify the Setup

Access `https://rancher.example.com` in your browser. The load balancer routes your request to one of the healthy backend nodes.

Test failover by stopping K3s on one node:

```bash
ssh ubuntu@192.168.1.101
sudo systemctl stop k3s
```

The load balancer detects failed connections and routes new traffic to the remaining healthy nodes. Rancher continues to operate normally.

Restart the node:

```bash
sudo systemctl start k3s
```

## Health Check Configuration

For a K3s-based Rancher install, Traefik exposes the `/ping` endpoint. Managed load balancers that support HTTP or HTTPS health checks can poll `/ping` every 10 seconds with a 5 second timeout. The Nginx configuration above uses passive TCP failure detection with `max_fails` and `fail_timeout` rather than actively polling an HTTP endpoint.

## SSL Termination Options

You have two options for SSL handling:

1. **TLS Passthrough** (recommended): The load balancer passes encrypted traffic directly to the backend nodes. This is the simplest configuration and lets Rancher handle its own certificates.

2. **SSL Termination at the Load Balancer**: The load balancer decrypts traffic and forwards plain HTTP to the backend nodes. For Rancher, install with `--set tls=external`, point the load balancer to port 80 on the nodes, and make sure it sends the `Host`, `X-Forwarded-Proto`, `X-Forwarded-Port`, and `X-Forwarded-For` headers.

## Summary

You have set up Rancher in a high-availability configuration behind a load balancer. This architecture provides a single entry point, automatic failover, and health-based routing. Whether you use Nginx or a cloud-managed load balancer, this setup ensures your Rancher installation remains accessible even when individual nodes experience issues.
