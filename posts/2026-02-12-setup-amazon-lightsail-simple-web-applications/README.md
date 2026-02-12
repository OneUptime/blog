# How to Set Up Amazon Lightsail for Simple Web Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lightsail, Web Applications, Hosting

Description: Get started with Amazon Lightsail for hosting simple web applications with predictable pricing, including instance setup, networking, and domain configuration.

---

Amazon Lightsail is AWS's simplified hosting platform. It bundles compute, storage, networking, and DNS into straightforward monthly plans with predictable pricing. If you don't need the full complexity of EC2, VPC, and ELB - and for many web apps you don't - Lightsail gets you running in minutes.

## What Lightsail Includes

Each Lightsail plan comes with:
- A virtual server (instance) with a fixed amount of CPU, RAM, and SSD storage
- A static IP address
- DNS management
- Data transfer allowance
- Snapshots for backup
- SSH and browser-based terminal access

Pricing starts at $3.50/month for the smallest instance. No surprise bills, no hidden costs.

## Choosing a Plan

Here's a rough guide for picking the right plan size.

| Monthly Price | vCPUs | RAM   | Storage | Transfer | Good For |
|--------------|-------|-------|---------|----------|----------|
| $3.50        | 1     | 512MB | 20GB    | 1TB      | Static sites, small blogs |
| $5           | 1     | 1GB   | 40GB    | 2TB      | WordPress, simple apps |
| $10          | 1     | 2GB   | 60GB    | 3TB      | Medium traffic sites |
| $20          | 2     | 4GB   | 80GB    | 4TB      | Multi-page apps, APIs |
| $40          | 2     | 8GB   | 160GB   | 5TB      | E-commerce, databases |
| $80          | 4     | 16GB  | 320GB   | 6TB      | High-traffic applications |

Start small and upgrade as needed - Lightsail makes it easy to snapshot and move to a bigger plan.

## Creating Your First Instance

You can create an instance through the CLI. Pick your blueprint (OS or application stack) and plan.

```bash
# List available blueprints to see what's offered
aws lightsail get-blueprints \
  --query 'blueprints[?isActive==`true`].{Id: blueprintId, Name: name, Type: type}' \
  --output table

# List available plans (bundles)
aws lightsail get-bundles \
  --query 'bundles[?isActive==`true`].{Id: bundleId, Price: price, CPU: cpuCount, RAM: ramSizeInGb, Disk: diskSizeInGb}' \
  --output table
```

Create an instance with a Node.js blueprint.

```bash
# Create a Lightsail instance with Node.js pre-installed
aws lightsail create-instances \
  --instance-names my-web-app \
  --availability-zone us-east-1a \
  --blueprint-id nodejs \
  --bundle-id small_3_0 \
  --tags key=Environment,value=production key=Project,value=webapp
```

For a plain Linux instance where you install everything yourself.

```bash
# Create a bare Ubuntu instance
aws lightsail create-instances \
  --instance-names my-ubuntu-server \
  --availability-zone us-east-1a \
  --blueprint-id ubuntu_22_04 \
  --bundle-id small_3_0
```

## Assigning a Static IP

By default, your instance gets a dynamic IP that can change if you stop and start the instance. Assign a static IP to keep it permanent.

```bash
# Create a static IP
aws lightsail allocate-static-ip \
  --static-ip-name my-app-ip

# Attach it to your instance
aws lightsail attach-static-ip \
  --static-ip-name my-app-ip \
  --instance-name my-web-app

# Check the IP address
aws lightsail get-static-ip \
  --static-ip-name my-app-ip \
  --query 'staticIp.ipAddress'
```

Static IPs are free as long as they're attached to a running instance.

## Configuring the Firewall

Lightsail instances have a built-in firewall. By default, SSH (22) and HTTP (80) are open. Add HTTPS and any other ports your app needs.

```bash
# Open HTTPS port
aws lightsail open-instance-public-ports \
  --instance-name my-web-app \
  --port-info fromPort=443,toPort=443,protocol=tcp

# Open a custom application port
aws lightsail open-instance-public-ports \
  --instance-name my-web-app \
  --port-info fromPort=3000,toPort=3000,protocol=tcp

# Check current firewall rules
aws lightsail get-instance-port-states \
  --instance-name my-web-app
```

## Setting Up DNS

Lightsail includes DNS management. Point your domain to your Lightsail instance.

```bash
# Create a DNS zone for your domain
aws lightsail create-domain \
  --domain-name example.com

# Add an A record pointing to your static IP
aws lightsail create-domain-entry \
  --domain-name example.com \
  --domain-entry '{
    "name": "example.com",
    "type": "A",
    "target": "YOUR_STATIC_IP"
  }'

# Add a CNAME for www
aws lightsail create-domain-entry \
  --domain-name example.com \
  --domain-entry '{
    "name": "www.example.com",
    "type": "CNAME",
    "target": "example.com"
  }'
```

Update your domain registrar's nameservers to the ones Lightsail provides.

```bash
# Get the nameservers for your DNS zone
aws lightsail get-domain \
  --domain-name example.com \
  --query 'domain.domainEntries[?type==`NS`].target'
```

## Deploying Your Application

Connect to your instance and deploy your app. You can use the browser-based console or SSH.

```bash
# Download the SSH key
aws lightsail download-default-key-pair \
  --query 'privateKeyBase64' \
  --output text | base64 -d > ~/.ssh/lightsail-key.pem
chmod 600 ~/.ssh/lightsail-key.pem

# Get the instance's public IP
INSTANCE_IP=$(aws lightsail get-instance \
  --instance-name my-web-app \
  --query 'instance.publicIpAddress' \
  --output text)

# SSH into the instance
ssh -i ~/.ssh/lightsail-key.pem ubuntu@$INSTANCE_IP
```

Once connected, deploy a simple Node.js application.

```bash
# On the Lightsail instance - set up a Node.js app
cd /home/ubuntu

# Clone your application
git clone https://github.com/youruser/your-app.git
cd your-app

# Install dependencies
npm install

# Install PM2 for process management
sudo npm install -g pm2

# Start your app with PM2
pm2 start app.js --name my-app
pm2 save
pm2 startup systemd
```

## Setting Up SSL with Let's Encrypt

Get a free SSL certificate for your domain.

```bash
# On the Lightsail instance - install and run Certbot
sudo apt update
sudo apt install -y certbot

# Get a certificate (standalone mode)
sudo certbot certonly --standalone -d example.com -d www.example.com

# Set up auto-renewal
sudo certbot renew --dry-run
```

If you're using Nginx as a reverse proxy, Certbot can configure it automatically.

```bash
# Install Nginx and the Certbot Nginx plugin
sudo apt install -y nginx python3-certbot-nginx

# Set up Nginx as a reverse proxy
cat > /tmp/nginx.conf << 'EOF'
server {
    listen 80;
    server_name example.com www.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
sudo mv /tmp/nginx.conf /etc/nginx/sites-available/my-app
sudo ln -s /etc/nginx/sites-available/my-app /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# Now get SSL certificate with Nginx plugin
sudo certbot --nginx -d example.com -d www.example.com
```

## Monitoring Your Instance

Keep an eye on your instance's performance.

```bash
# Get instance metrics for the last hour
aws lightsail get-instance-metric-data \
  --instance-name my-web-app \
  --metric-name CPUUtilization \
  --period 300 \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --statistics Average \
  --unit Percent
```

Set up an alarm to get notified of high CPU usage.

```bash
# Create a CPU usage alarm
aws lightsail put-alarm \
  --alarm-name high-cpu-alarm \
  --metric-name CPUUtilization \
  --monitored-resource-name my-web-app \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --threshold 80 \
  --evaluation-periods 2 \
  --datapoints-to-alarm 2 \
  --notification-enabled \
  --contact-protocols Email \
  --notification-triggers ALARM
```

## Troubleshooting Checklist

1. Instance won't start? Check the plan's availability in your zone
2. Can't SSH? Verify port 22 is open in the firewall
3. Website not loading? Check the firewall and that your app is running
4. DNS not resolving? Verify nameservers at your registrar match Lightsail's
5. Running out of disk? Check with `df -h` and consider upgrading

Lightsail is the easiest way to get a web application running on AWS. For the step-by-step of creating an instance, see our guide on [creating a Lightsail instance and connecting to it](https://oneuptime.com/blog/post/create-lightsail-instance-connect/view).
