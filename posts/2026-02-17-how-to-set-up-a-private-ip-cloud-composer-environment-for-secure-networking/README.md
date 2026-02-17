# How to Set Up a Private IP Cloud Composer Environment for Secure Networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Composer, Networking, Security, Private IP

Description: Configure a Cloud Composer environment with private IP networking to restrict access and meet enterprise security requirements on GCP.

---

By default, Cloud Composer environments use public IPs for their internal components. That is fine for development, but most production environments need private networking. Regulatory requirements, corporate security policies, and defense-in-depth strategies all push toward keeping your orchestration layer on private IPs.

A private IP Cloud Composer environment ensures that the Airflow web server, database, and worker nodes communicate only over your VPC network. No public IPs are assigned to any component. This article walks through the full setup, including the networking prerequisites that you need to get right before creating the environment.

## Why Private IP?

Running Composer on private IPs provides several security benefits:

- **No public internet exposure** - Airflow components are only reachable within your VPC
- **Compliance** - Meets requirements for SOC 2, HIPAA, PCI-DSS, and other frameworks that mandate private networking
- **Network control** - All traffic flows through your VPC, where you can apply firewall rules, VPC Flow Logs, and network policies
- **Reduced attack surface** - No public endpoints means fewer vectors for unauthorized access

## Prerequisites: Network Configuration

Private IP Composer environments have specific networking requirements. Get these right before attempting to create the environment.

### Create a VPC Network

If you do not already have a VPC, create one:

```bash
# Create a custom VPC network for Composer
gcloud compute networks create composer-vpc \
  --subnet-mode=custom \
  --bgp-routing-mode=regional
```

### Create a Subnet with Private Google Access

The subnet must have Private Google Access enabled so Composer components can reach Google APIs without public IPs:

```bash
# Create a subnet with Private Google Access
gcloud compute networks subnets create composer-subnet \
  --network=composer-vpc \
  --region=us-central1 \
  --range=10.0.0.0/20 \
  --enable-private-ip-google-access
```

### Create Secondary IP Ranges

Composer uses GKE under the hood (in Composer 2) or managed compute (in Composer 3). If you are using Composer 2, you need secondary IP ranges for pods and services:

```bash
# Add secondary IP ranges for GKE pods and services (Composer 2)
gcloud compute networks subnets update composer-subnet \
  --region=us-central1 \
  --add-secondary-ranges=composer-pods=10.4.0.0/14,composer-services=10.8.0.0/20
```

### Configure Cloud NAT

Since private IP nodes cannot access the internet directly, you need Cloud NAT for outbound connectivity (for example, to install PyPI packages):

```bash
# Create a Cloud Router
gcloud compute routers create composer-router \
  --network=composer-vpc \
  --region=us-central1

# Create a Cloud NAT gateway
gcloud compute routers nats create composer-nat \
  --router=composer-router \
  --region=us-central1 \
  --nat-all-subnet-ip-ranges \
  --auto-allocate-nat-external-ips
```

### Configure Firewall Rules

Allow necessary internal communication:

```bash
# Allow internal communication within the VPC
gcloud compute firewall-rules create composer-internal \
  --network=composer-vpc \
  --allow=tcp,udp,icmp \
  --source-ranges=10.0.0.0/8

# Allow health checks from Google's health check ranges
gcloud compute firewall-rules create composer-health-checks \
  --network=composer-vpc \
  --allow=tcp:80,tcp:443 \
  --source-ranges=35.191.0.0/16,130.211.0.0/22
```

## Step 1: Create the Private IP Composer Environment

With the networking in place, create the Composer environment:

```bash
# Create a private IP Cloud Composer 3 environment
gcloud composer environments create private-composer \
  --location=us-central1 \
  --image-version=composer-3-airflow-2.9.3 \
  --environment-size=medium \
  --network=projects/my-project/global/networks/composer-vpc \
  --subnetwork=projects/my-project/regions/us-central1/subnetworks/composer-subnet \
  --enable-private-environment
```

For Composer 2, you also need to specify the secondary ranges:

```bash
# Create a private IP Cloud Composer 2 environment
gcloud composer environments create private-composer2 \
  --location=us-central1 \
  --image-version=composer-2.9.7-airflow-2.9.3 \
  --environment-size=medium \
  --network=projects/my-project/global/networks/composer-vpc \
  --subnetwork=projects/my-project/regions/us-central1/subnetworks/composer-subnet \
  --enable-private-environment \
  --cluster-secondary-range-name=composer-pods \
  --services-secondary-range-name=composer-services \
  --cluster-ipv4-cidr=172.16.0.0/14 \
  --master-ipv4-cidr=172.31.0.0/28
```

## Step 2: Configure Web Server Access

In a private IP environment, the Airflow web server is also private by default. You need to explicitly configure how users access it.

Option 1 - Allow specific IP ranges:

```bash
# Allow access from your office network and VPN
gcloud composer environments update private-composer \
  --location=us-central1 \
  --web-server-allow-ip="description=Corporate Office,ip_range=203.0.113.0/24" \
  --web-server-allow-ip="description=VPN Gateway,ip_range=198.51.100.0/24"
```

Option 2 - Allow all traffic (if you have other network controls):

```bash
# Allow all IP ranges to access the web server
gcloud composer environments update private-composer \
  --location=us-central1 \
  --web-server-allow-all
```

Option 3 - Use Identity-Aware Proxy (IAP) for zero-trust access:

```bash
# Enable IAP for the web server
# First, set up IAP on the backend service in the Cloud Console
# Then grant IAP-secured Web App User role to authorized users
gcloud projects add-iam-policy-binding my-project \
  --member="group:data-engineers@mycompany.com" \
  --role="roles/iap.httpsResourceAccessor"
```

## Step 3: Configure DNS for Private Google Access

For the Composer environment to reach Google APIs (BigQuery, Cloud Storage, Dataproc, etc.) over private IPs, configure Private DNS zones:

```bash
# Create a private DNS zone for Google APIs
gcloud dns managed-zones create google-apis \
  --dns-name=googleapis.com \
  --description="Private zone for Google APIs" \
  --visibility=private \
  --networks=composer-vpc

# Add records pointing to the private VIP
gcloud dns record-sets create "*.googleapis.com." \
  --zone=google-apis \
  --type=CNAME \
  --ttl=300 \
  --rrdatas="private.googleapis.com."

gcloud dns record-sets create "private.googleapis.com." \
  --zone=google-apis \
  --type=A \
  --ttl=300 \
  --rrdatas="199.36.153.8,199.36.153.9,199.36.153.10,199.36.153.11"
```

## Step 4: Set Up VPC Service Controls (Optional)

For the highest security posture, wrap your Composer environment in a VPC Service Controls perimeter:

```bash
# Create an access policy (one-time setup)
gcloud access-context-manager policies create \
  --organization=123456789 \
  --title="Composer Security Policy"

# Create a service perimeter
gcloud access-context-manager perimeters create composer-perimeter \
  --policy=my-policy-id \
  --title="Composer Perimeter" \
  --resources="projects/my-project-number" \
  --restricted-services="\
composer.googleapis.com,\
storage.googleapis.com,\
bigquery.googleapis.com"
```

## Step 5: Test Connectivity

After the environment is created, verify that everything works:

```bash
# Check the environment status
gcloud composer environments describe private-composer \
  --location=us-central1 \
  --format="yaml(config.privateEnvironmentConfig)"

# Get the Airflow web server URL
gcloud composer environments describe private-composer \
  --location=us-central1 \
  --format="value(config.airflowUri)"

# Verify the environment is healthy by running an Airflow CLI command
gcloud composer environments run private-composer \
  --location=us-central1 \
  dags list
```

Test that your DAGs can access external services:

```python
# connectivity_test_dag.py - Test connectivity from the private environment
from datetime import datetime
from airflow import DAG
from airflow.operators.python import PythonOperator
from google.cloud import storage, bigquery

def test_gcs_connectivity():
    """Verify that the environment can access Cloud Storage."""
    client = storage.Client()
    buckets = list(client.list_buckets(max_results=5))
    print(f"Successfully listed {len(buckets)} buckets")

def test_bq_connectivity():
    """Verify that the environment can access BigQuery."""
    client = bigquery.Client()
    query = "SELECT 1 as test_value"
    result = list(client.query(query).result())
    print(f"BigQuery test result: {result[0].test_value}")

dag = DAG(
    dag_id="connectivity_test",
    start_date=datetime(2025, 1, 1),
    schedule_interval=None,
    catchup=False,
)

test_gcs = PythonOperator(
    task_id="test_gcs",
    python_callable=test_gcs_connectivity,
    dag=dag,
)

test_bq = PythonOperator(
    task_id="test_bq",
    python_callable=test_bq_connectivity,
    dag=dag,
)

test_gcs >> test_bq
```

## Troubleshooting Common Issues

**Environment creation fails with network errors:**
- Verify Private Google Access is enabled on the subnet
- Check that Cloud NAT is configured correctly
- Ensure firewall rules allow internal communication

**DAGs cannot reach external APIs:**
- Verify Cloud NAT is working for outbound internet access
- Check DNS configuration for Google APIs
- Verify IAM permissions on the Composer service account

**Cannot access the Airflow web UI:**
- Check the web server access configuration
- Verify you are connecting from an allowed IP range
- If using IAP, ensure IAP is properly configured and you have the right role

## Wrapping Up

Setting up a private IP Cloud Composer environment requires more networking preparation than a public IP setup, but the security benefits are substantial. The key is getting the network configuration right before creating the environment: Private Google Access, Cloud NAT, DNS zones, and firewall rules. Once the networking is solid, Composer operates the same as a public environment - your DAGs work identically, just on a more secure network foundation.
