# How to Set Timezone on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Timezone, Configuration, Kubernetes, Infrastructure, Time Management

Description: Learn how to configure timezones on Talos Linux nodes and understand the implications for Kubernetes workloads, logging, and scheduled tasks.

---

Timezone configuration on Talos Linux works differently from what you might expect if you are coming from a traditional Linux background. There is no `/etc/localtime` symlink to change, no `timedatectl` command to run, and no interactive setup wizard. Talos takes a deliberate approach to timezone management that reflects its design philosophy of minimal, API-driven configuration.

## How Talos Handles Timezones

Talos Linux nodes always run their system clock in UTC. This is by design and for good reason. In a Kubernetes cluster, having all nodes use UTC eliminates an entire category of bugs related to timezone mismatches between nodes, inconsistent log timestamps, and confusing CronJob behavior.

The system clock on a Talos node is UTC, period. You cannot change this at the OS level. However, this does not mean your applications have to display everything in UTC. Timezone handling happens at the application layer, not the OS layer.

## Why UTC is the Right Choice for Infrastructure

Running infrastructure in UTC is a widely accepted best practice, and Talos enforces it. Here is why this matters:

**Log consistency**: When you are aggregating logs from multiple nodes, having all timestamps in UTC makes correlation trivial. No mental math to figure out which events happened at the same time across nodes in different timezones.

**Distributed consensus**: Systems like etcd use time for leader election and lease management. Using a uniform timezone eliminates any possibility of timezone-related clock discrepancies.

**Certificate handling**: TLS certificates use UTC for their validity periods. Running the system clock in UTC means there is no timezone conversion needed when checking certificate validity.

**CronJob clarity**: Kubernetes CronJobs use the timezone of the kube-controller-manager by default. When everything runs in UTC, scheduling is straightforward and predictable.

## Setting Timezone for Kubernetes Workloads

While Talos nodes run in UTC, your containerized applications can use any timezone. You control this through environment variables and volume mounts in your pod specifications.

### Method 1: TZ Environment Variable

The simplest approach is setting the `TZ` environment variable:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
spec:
  containers:
    - name: app
      image: my-app:latest
      env:
        - name: TZ
          value: "America/New_York"
```

Most programming languages and frameworks respect the `TZ` environment variable. Your application will see local time in the specified timezone while the underlying node stays in UTC.

### Method 2: Mounting Timezone Data

Some applications need the timezone database files rather than just an environment variable:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
spec:
  containers:
    - name: app
      image: my-app:latest
      env:
        - name: TZ
          value: "Europe/London"
      volumeMounts:
        - name: tz-config
          mountPath: /etc/localtime
          readOnly: true
  volumes:
    - name: tz-config
      hostPath:
        path: /usr/share/zoneinfo/Europe/London
        type: File
```

Note that Talos Linux does include timezone data files in `/usr/share/zoneinfo/`, so you can mount the appropriate file into your containers.

### Method 3: Using a ConfigMap

For more flexibility, create a ConfigMap with timezone data:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: timezone-config
data:
  TZ: "Asia/Tokyo"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
        - name: app
          image: my-app:latest
          envFrom:
            - configMapRef:
                name: timezone-config
```

This approach makes it easy to change the timezone for all pods that reference the ConfigMap.

## Setting Timezone for CronJobs

Kubernetes CronJobs have built-in timezone support through the `timeZone` field (available in Kubernetes 1.27+):

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: daily-report
spec:
  schedule: "0 9 * * *"
  timeZone: "America/Chicago"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: report
              image: report-generator:latest
              env:
                - name: TZ
                  value: "America/Chicago"
          restartPolicy: OnFailure
```

Without the `timeZone` field, the schedule is interpreted in UTC. With it, "0 9 * * *" means 9:00 AM Central Time, and Kubernetes handles the conversion including daylight saving time transitions.

## Verifying the Node Timezone

To confirm that your Talos node is running in UTC:

```bash
# Check the current time on a node
talosctl -n 192.168.1.10 time

# The output will be in UTC
# You can compare it with your local time
date -u  # UTC time on your workstation
date     # Local time on your workstation
```

## Common Timezone Pitfalls

### Pitfall 1: Assuming Local Time in Logs

If you grep through pod logs and see timestamps, remember that the node's system logs are always in UTC. Application logs might be in a different timezone depending on how the app is configured.

```bash
# Node-level logs are always UTC
talosctl -n 192.168.1.10 dmesg | head -5
talosctl -n 192.168.1.10 logs kubelet | head -5

# Application logs depend on the app's timezone configuration
kubectl logs my-app | head -5
```

### Pitfall 2: Database Timezone Confusion

If your database stores timestamps, make sure you understand whether they are stored in UTC or local time:

```sql
-- PostgreSQL: Always store in UTC
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    event_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()  -- Stored in UTC
);

-- When querying, convert to local time
SELECT event_name,
       created_at AT TIME ZONE 'America/New_York' AS local_time
FROM events;
```

### Pitfall 3: CronJob DST Issues

Daylight saving time transitions can cause CronJobs to run twice, skip, or run at unexpected times. If you use the `timeZone` field in CronJobs, Kubernetes handles this, but be aware of it:

```yaml
# This job runs at 2:30 AM Eastern Time
# During spring-forward DST, 2:30 AM does not exist
# Kubernetes will handle this, but test the behavior
spec:
  schedule: "30 2 * * *"
  timeZone: "America/New_York"
```

## Timezone Configuration for Monitoring

When setting up monitoring tools like Grafana, you will typically want to display data in the user's local timezone while storing everything in UTC:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
spec:
  template:
    spec:
      containers:
        - name: grafana
          image: grafana/grafana:latest
          env:
            # Grafana stores data in UTC internally
            # Users can select their display timezone in the UI
            - name: GF_DATE_FORMATS_DEFAULT_TIMEZONE
              value: "browser"
```

## Setting Timezone Globally with a Mutating Webhook

If you want all pods in your cluster to automatically have a timezone set, you can use a mutating admission webhook:

```yaml
# Example webhook configuration (conceptual)
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: timezone-injector
webhooks:
  - name: timezone.injector.example.com
    rules:
      - apiGroups: [""]
        apiVersions: ["v1"]
        operations: ["CREATE"]
        resources: ["pods"]
    clientConfig:
      service:
        name: timezone-injector
        namespace: kube-system
        path: "/inject"
```

The webhook would automatically inject the `TZ` environment variable into every pod created in the cluster. This is useful for organizations with a single primary timezone.

## Best Practices

1. **Keep nodes in UTC** - Do not fight Talos on this. UTC at the infrastructure level is the right choice.

2. **Handle timezones at the application layer** - Use environment variables and pod specs to set timezones for individual workloads.

3. **Use the CronJob timeZone field** - If available in your Kubernetes version, this is the cleanest way to handle scheduled jobs in local time.

4. **Store timestamps in UTC** - In databases and log files, always store in UTC and convert for display.

5. **Document your timezone strategy** - Make it clear to your team how timezones are handled across the stack.

Timezone management on Talos Linux is intentionally simple at the OS level. By keeping everything in UTC and handling timezone conversion at the application layer, you get a predictable, consistent infrastructure that avoids the many pitfalls of mixed timezone environments.
