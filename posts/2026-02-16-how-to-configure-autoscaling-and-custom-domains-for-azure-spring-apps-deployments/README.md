# How to Configure Autoscaling and Custom Domains for Azure Spring Apps Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Spring Apps, Autoscaling, Custom Domains, Spring Boot, Java, Cloud Configuration, SSL

Description: Learn how to configure autoscaling rules and set up custom domains with SSL certificates for Azure Spring Apps to handle variable traffic and professional branding.

---

Running a Spring Boot application on Azure Spring Apps is straightforward until you hit real-world requirements: your traffic varies throughout the day and you need the app to scale accordingly, plus your customers expect to access the service through your own domain name, not a Microsoft-generated URL. This guide covers both autoscaling configuration and custom domain setup in Azure Spring Apps.

## Why Autoscaling Matters

Without autoscaling, you either overprovision (wasting money on idle instances) or underprovision (causing slow responses and errors during peak traffic). Azure Spring Apps supports both manual scaling and automatic scaling based on metrics. Autoscaling lets the platform add or remove instances in response to CPU usage, memory consumption, HTTP request rates, or custom metrics.

## Prerequisites

- Azure Spring Apps Standard or Enterprise tier (autoscaling is not available on the Basic tier)
- Azure CLI with the spring extension installed
- A registered domain name (for the custom domain section)
- Access to your DNS provider's management console

## Configuring Manual Scaling

Before setting up autoscaling, let me show the manual scaling baseline. This is useful for understanding the scaling parameters:

```bash
# Scale an app to a specific number of instances manually
# Each instance gets the configured CPU and memory allocation
az spring app scale \
    --name order-service \
    --service myorg-spring-apps \
    --resource-group rg-spring-production \
    --instance-count 3 \
    --cpu 2 \
    --memory 4Gi
```

This sets a fixed instance count of 3, each with 2 CPU cores and 4 GB of memory. Good for predictable workloads, but not ideal when traffic fluctuates.

## Setting Up Autoscaling Rules

Autoscaling in Azure Spring Apps uses the same autoscale engine as other Azure services. You define rules based on metrics, minimum and maximum instance counts, and scale-in/scale-out thresholds.

### Step 1: Create the Autoscale Profile

Here is a complete autoscaling configuration using Azure CLI:

```bash
# Get the resource ID of the app deployment
DEPLOYMENT_ID=$(az spring app deployment show \
    --name default \
    --app order-service \
    --service myorg-spring-apps \
    --resource-group rg-spring-production \
    --query id -o tsv)

# Create autoscale settings with CPU-based scaling
# This configuration scales between 2 and 10 instances
az monitor autoscale create \
    --name autoscale-order-service \
    --resource "$DEPLOYMENT_ID" \
    --resource-type "Microsoft.AppPlatform/Spring/apps/deployments" \
    --min-count 2 \
    --max-count 10 \
    --count 3
```

### Step 2: Add Scale-Out Rules

Add a rule that increases instances when CPU exceeds 70 percent:

```bash
# Scale out when average CPU exceeds 70% over 10 minutes
# This adds 2 instances and waits 5 minutes before evaluating again
az monitor autoscale rule create \
    --autoscale-name autoscale-order-service \
    --resource-group rg-spring-production \
    --condition "tomcat.global.request.avg.time avg > 70" \
    --scale out 2 \
    --cooldown 5
```

For more precise control, you can use the REST API or ARM templates. Here is an ARM template snippet that defines a complete autoscale profile:

```json
{
    "type": "Microsoft.Insights/autoscaleSettings",
    "apiVersion": "2022-10-01",
    "name": "autoscale-order-service",
    "location": "eastus",
    "properties": {
        "enabled": true,
        "targetResourceUri": "[resourceId('Microsoft.AppPlatform/Spring/apps/deployments', 'myorg-spring-apps', 'order-service', 'default')]",
        "profiles": [
            {
                "name": "DefaultProfile",
                "capacity": {
                    "minimum": "2",
                    "maximum": "10",
                    "default": "3"
                },
                "rules": [
                    {
                        "metricTrigger": {
                            "metricName": "PodCpuUsage",
                            "metricResourceUri": "[resourceId('Microsoft.AppPlatform/Spring/apps/deployments', 'myorg-spring-apps', 'order-service', 'default')]",
                            "timeGrain": "PT1M",
                            "statistic": "Average",
                            "timeWindow": "PT10M",
                            "timeAggregation": "Average",
                            "operator": "GreaterThan",
                            "threshold": 70
                        },
                        "scaleAction": {
                            "direction": "Increase",
                            "type": "ChangeCount",
                            "value": "2",
                            "cooldown": "PT5M"
                        }
                    },
                    {
                        "metricTrigger": {
                            "metricName": "PodCpuUsage",
                            "metricResourceUri": "[resourceId('Microsoft.AppPlatform/Spring/apps/deployments', 'myorg-spring-apps', 'order-service', 'default')]",
                            "timeGrain": "PT1M",
                            "statistic": "Average",
                            "timeWindow": "PT10M",
                            "timeAggregation": "Average",
                            "operator": "LessThan",
                            "threshold": 30
                        },
                        "scaleAction": {
                            "direction": "Decrease",
                            "type": "ChangeCount",
                            "value": "1",
                            "cooldown": "PT10M"
                        }
                    }
                ]
            }
        ]
    }
}
```

Notice the asymmetry in the rules: scale-out adds 2 instances with a 5-minute cooldown, but scale-in removes only 1 instance with a 10-minute cooldown. This is intentional. You want to scale out aggressively (to meet demand quickly) and scale in conservatively (to avoid flapping and premature removal of capacity).

### Step 3: Add Scheduled Scaling Profiles

If your traffic follows predictable patterns (high during business hours, low at night), you can add time-based profiles:

```bash
# Create a schedule-based profile for business hours
# This sets a higher minimum during peak hours
az monitor autoscale profile create \
    --autoscale-name autoscale-order-service \
    --resource-group rg-spring-production \
    --name "BusinessHours" \
    --min-count 5 \
    --max-count 15 \
    --count 5 \
    --recurrence week Mon Tue Wed Thu Fri \
    --start "08:00" \
    --end "18:00" \
    --timezone "Eastern Standard Time"
```

## Configuring Custom Domains

By default, Azure Spring Apps gives you a URL like `myorg-spring-apps-order-service.azuremicroservices.io`. For production use, you want your own domain.

### Step 1: Add a CNAME Record

First, create a CNAME record with your DNS provider. The CNAME should point your desired hostname to the Azure Spring Apps default URL.

For example, to use `api.mycompany.com`:

```
Type: CNAME
Name: api
Value: myorg-spring-apps-order-service.azuremicroservices.io
TTL: 3600
```

### Step 2: Verify Domain Ownership

Azure requires domain verification to prevent domain hijacking. You need to add a TXT record:

```bash
# Get the domain verification token
az spring app custom-domain show \
    --domain-name api.mycompany.com \
    --app order-service \
    --service myorg-spring-apps \
    --resource-group rg-spring-production
```

Add the verification TXT record to your DNS:

```
Type: TXT
Name: asuid.api
Value: <verification-token-from-azure>
TTL: 3600
```

### Step 3: Bind the Custom Domain

Once DNS propagation is complete (usually 5 to 15 minutes, sometimes up to 48 hours), bind the domain:

```bash
# Bind the custom domain to your app
az spring app custom-domain bind \
    --domain-name api.mycompany.com \
    --app order-service \
    --service myorg-spring-apps \
    --resource-group rg-spring-production
```

### Step 4: Configure SSL/TLS Certificate

You absolutely need HTTPS for production. Azure Spring Apps supports both managed certificates and custom certificates.

For a managed certificate (free, auto-renewed):

```bash
# Enable managed certificate for the custom domain
# Azure handles certificate provisioning and renewal automatically
az spring certificate add \
    --name api-mycompany-cert \
    --service myorg-spring-apps \
    --resource-group rg-spring-production \
    --domain-name api.mycompany.com

# Bind the certificate to the custom domain
az spring app custom-domain update \
    --domain-name api.mycompany.com \
    --app order-service \
    --service myorg-spring-apps \
    --resource-group rg-spring-production \
    --certificate api-mycompany-cert
```

If you have a certificate in Azure Key Vault (common for wildcard certs or certificates from specific CAs):

```bash
# Import certificate from Key Vault
az spring certificate add \
    --name wildcard-mycompany-cert \
    --service myorg-spring-apps \
    --resource-group rg-spring-production \
    --vault-uri https://kv-mycompany.vault.azure.net \
    --vault-certificate-name wildcard-cert

# Bind it to the domain
az spring app custom-domain update \
    --domain-name api.mycompany.com \
    --app order-service \
    --service myorg-spring-apps \
    --resource-group rg-spring-production \
    --certificate wildcard-mycompany-cert
```

## Verifying Everything Works

After configuring both autoscaling and custom domains, run these verification checks:

```bash
# Verify custom domain is bound and certificate is active
az spring app custom-domain show \
    --domain-name api.mycompany.com \
    --app order-service \
    --service myorg-spring-apps \
    --resource-group rg-spring-production

# Verify autoscale settings
az monitor autoscale show \
    --name autoscale-order-service \
    --resource-group rg-spring-production

# Test HTTPS connectivity
curl -I https://api.mycompany.com/actuator/health
```

## Monitoring Autoscale Events

Keep an eye on autoscale activity to make sure your rules are behaving as expected:

```bash
# View recent autoscale events
az monitor autoscale show-predictive-metric \
    --autoscale-setting-name autoscale-order-service \
    --resource-group rg-spring-production \
    --timespan "2026-02-15T00:00:00Z/2026-02-16T00:00:00Z" \
    --metric-name "PercentageCPU" \
    --aggregation "Average" \
    --interval PT1H
```

Also check the Activity Log in the Azure portal for autoscale actions. If you see frequent scale-out followed by immediate scale-in (flapping), increase your cooldown periods or widen the gap between your scale-out and scale-in thresholds.

## Summary

Autoscaling in Azure Spring Apps is straightforward once you understand the metric-based rules and cooldown periods. Start with CPU-based scaling, add scheduled profiles if your traffic is predictable, and always set asymmetric cooldowns (fast scale-out, slow scale-in). Custom domains require DNS configuration, domain verification, and SSL certificate binding, but Azure Spring Apps supports managed certificates that handle renewal automatically. Together, these configurations prepare your Spring Boot application for production-grade traffic handling and professional branding.
