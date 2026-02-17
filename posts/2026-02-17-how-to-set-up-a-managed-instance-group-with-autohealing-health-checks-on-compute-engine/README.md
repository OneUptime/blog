# How to Set Up a Managed Instance Group with Autohealing Health Checks on Compute Engine

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, Managed Instance Groups, Autohealing, Health Checks

Description: Step-by-step guide to setting up a managed instance group with autohealing health checks on GCP Compute Engine to keep your application running smoothly.

---

Managed Instance Groups (MIGs) on GCP Compute Engine are one of the most reliable ways to run stateless applications at scale. They give you identical VM instances managed as a single entity, with features like autoscaling, rolling updates, and - the focus of this post - autohealing.

Autohealing automatically recreates VM instances that fail health checks. This means if your application crashes, becomes unresponsive, or enters a bad state, the MIG will detect it and replace the unhealthy instance with a fresh one. No pager alerts at 3 AM, no manual intervention. Let me show you how to set this up properly.

## How Autohealing Works

The autohealing process is straightforward:

1. You define a health check that probes your application at regular intervals
2. You attach that health check to your managed instance group
3. The MIG continuously monitors instance health
4. When an instance fails the health check consistently, the MIG deletes it and creates a new one from the instance template

The key thing to understand is that autohealing health checks are different from load balancer health checks. A load balancer health check determines where to route traffic. An autohealing health check determines whether an instance should be replaced entirely. You can (and often should) use both.

## Step 1: Create an Instance Template

First, you need an instance template that defines what your VMs look like. This template includes the machine type, disk configuration, startup script, and everything else needed to create identical instances.

```bash
# Create an instance template with a startup script that installs and starts a web server
gcloud compute instance-templates create my-app-template \
    --machine-type=e2-medium \
    --image-family=debian-12 \
    --image-project=debian-cloud \
    --tags=http-server \
    --metadata=startup-script='#!/bin/bash
apt-get update
apt-get install -y nginx
echo "Healthy" > /var/www/html/health
systemctl start nginx'
```

Notice the startup script creates a `/health` endpoint that returns "Healthy". This is what our health check will probe.

## Step 2: Create a Health Check

Now create a health check that will be used for autohealing. This is an HTTP health check that hits the `/health` path on port 80.

```bash
# Create an HTTP health check for autohealing
# The check interval, timeout, and thresholds are tuned to avoid false positives
gcloud compute health-checks create http my-app-autohealing-check \
    --port=80 \
    --request-path=/health \
    --check-interval=30s \
    --timeout=10s \
    --healthy-threshold=2 \
    --unhealthy-threshold=3
```

Let me explain these parameters:

- **check-interval=30s**: Probe every 30 seconds. You do not want this too aggressive for autohealing.
- **timeout=10s**: Wait 10 seconds for a response before marking the probe as failed.
- **healthy-threshold=2**: An instance must pass 2 consecutive checks to be considered healthy.
- **unhealthy-threshold=3**: An instance must fail 3 consecutive checks before being marked unhealthy.

With these settings, an instance has to be down for about 90 seconds (3 checks x 30 seconds) before autohealing kicks in. This avoids replacing instances during brief blips.

## Step 3: Create a Firewall Rule

The health check probes come from Google's health checking IP ranges. You need a firewall rule to allow this traffic.

```bash
# Allow health check traffic from Google's health check IP ranges
gcloud compute firewall-rules create allow-health-check \
    --network=default \
    --action=allow \
    --direction=ingress \
    --source-ranges=130.211.0.0/22,35.191.0.0/16 \
    --target-tags=http-server \
    --rules=tcp:80
```

The source ranges `130.211.0.0/22` and `35.191.0.0/16` are Google's health checking systems. If you skip this step, all health checks will fail and your MIG will be stuck in an endless loop of recreating instances.

## Step 4: Create the Managed Instance Group

Now bring it all together by creating the MIG with the autohealing policy attached.

```bash
# Create a managed instance group with autohealing enabled
gcloud compute instance-groups managed create my-app-mig \
    --template=my-app-template \
    --size=3 \
    --zone=us-central1-a \
    --health-check=my-app-autohealing-check \
    --initial-delay=300
```

The `--initial-delay=300` is important. It tells the MIG to wait 300 seconds (5 minutes) before starting health checks on a new instance. This gives your application time to boot, install dependencies, and become ready. Without this delay, your instances might get replaced before they even finish starting up.

## Setting This Up with Terraform

Here is the complete Terraform configuration for the same setup.

```hcl
# Instance template definition
resource "google_compute_instance_template" "app" {
  name_prefix  = "my-app-"
  machine_type = "e2-medium"

  disk {
    source_image = "debian-cloud/debian-12"
    auto_delete  = true
    boot         = true
  }

  network_interface {
    network = "default"
  }

  # Tag for firewall rule targeting
  tags = ["http-server"]

  metadata_startup_script = <<-EOF
    #!/bin/bash
    apt-get update
    apt-get install -y nginx
    echo "Healthy" > /var/www/html/health
    systemctl start nginx
  EOF

  lifecycle {
    create_before_destroy = true
  }
}

# Health check for autohealing
resource "google_compute_health_check" "autohealing" {
  name                = "my-app-autohealing-check"
  check_interval_sec  = 30
  timeout_sec         = 10
  healthy_threshold   = 2
  unhealthy_threshold = 3

  http_health_check {
    port         = 80
    request_path = "/health"
  }
}

# Managed instance group with autohealing policy
resource "google_compute_instance_group_manager" "app" {
  name               = "my-app-mig"
  base_instance_name = "my-app"
  zone               = "us-central1-a"
  target_size        = 3

  version {
    instance_template = google_compute_instance_template.app.id
  }

  auto_healing_policies {
    health_check      = google_compute_health_check.autohealing.id
    initial_delay_sec = 300
  }
}
```

## Monitoring Autohealing Activity

Once your MIG is running, you will want to monitor its autohealing activity. You can check the current status of instances in the group:

```bash
# List instances in the MIG and their current status
gcloud compute instance-groups managed list-instances my-app-mig \
    --zone=us-central1-a
```

The output shows each instance's current action (like NONE, CREATING, RECREATING) and its health status. You can also check the MIG's operations log to see when instances were recreated:

```bash
# View recent operations for the MIG, filtered to recreate actions
gcloud compute operations list \
    --filter="targetLink:my-app-mig AND operationType:recreateInstances" \
    --zones=us-central1-a \
    --limit=10
```

## Common Pitfalls and How to Avoid Them

**Pitfall 1: Initial delay too short.** If your application takes 3 minutes to start and your initial delay is 60 seconds, the MIG will think the instance is unhealthy and keep replacing it. Always set the initial delay longer than your application's startup time.

**Pitfall 2: Health check too aggressive.** An unhealthy threshold of 1 with a 5-second interval means a single missed health check triggers recreation. Transient network issues or a brief GC pause could cause unnecessary instance replacements.

**Pitfall 3: Forgetting the firewall rule.** Without the firewall rule allowing Google's health check ranges, every health check fails. The MIG enters a loop where it creates instances, they fail health checks, get replaced, and the cycle repeats.

**Pitfall 4: Health endpoint that checks external dependencies.** If your health check endpoint verifies database connectivity, a database outage could cause all your instances to be recreated simultaneously. Your health endpoint should ideally check that the application process is running and can respond to requests, not that every dependency is available.

## Best Practices

1. **Use separate health checks for autohealing and load balancing.** The autohealing check should be more lenient since replacing a VM is a heavy operation.
2. **Set up Cloud Monitoring alerts** for autohealing events so you know when instances are being replaced.
3. **Test your health check** by SSHing into an instance and stopping your application. Watch the MIG detect and replace it.
4. **Use regional MIGs** for production workloads so your instances are spread across multiple zones.
5. **Consider the impact on stateful data.** Autohealing destroys and recreates instances. Any local data is lost. Use persistent disks or external storage for anything important.

## Wrapping Up

Autohealing turns your managed instance group into a self-repairing system. Combined with autoscaling, it means your application can handle both traffic spikes and instance failures without manual intervention. The setup is not complicated, but getting the health check timing right is crucial. Start with conservative settings (longer intervals, higher thresholds) and tighten them as you gain confidence in your application's stability.
