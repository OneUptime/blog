# Validation Summary: How to Troubleshoot GCP Load Balancer Health Check Failures

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Google Cloud Load Balancing
- Google Cloud health checks
- Google Cloud CLI (`gcloud`)
- VPC firewall rules
- Managed and unmanaged instance groups
- Node.js / Express
- Python / Flask
- SQLAlchemy

## Sources Consulted
- Google Cloud Load Balancing health checks overview: https://cloud.google.com/load-balancing/docs/health-check-concepts
- Google Cloud Load Balancing firewall rules: https://cloud.google.com/load-balancing/docs/firewall-rules
- Google Cloud Load Balancing use health checks: https://cloud.google.com/load-balancing/docs/health-checks
- Google Cloud backend services overview and named ports: https://cloud.google.com/load-balancing/docs/backend-service
- `gcloud compute backend-services get-health` reference: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/get-health
- `gcloud compute health-checks update http` reference: https://cloud.google.com/sdk/gcloud/reference/compute/health-checks/update/http
- Compute Engine instance group named ports documentation: https://cloud.google.com/compute/docs/instance-groups/adding-an-instance-group-to-a-load-balancer
- Compute Engine MIG information documentation: https://cloud.google.com/compute/docs/instance-groups/getting-info-about-migs
- Express routing documentation: https://expressjs.com/en/guide/routing.html
- Flask routing and response documentation: https://flask.palletsprojects.com/
- SQLAlchemy statement execution documentation: https://docs.sqlalchemy.org/

## Issues Found
- The post stated that GCP health checks come from `35.191.0.0/16` and `130.211.0.0/22` without qualification. Google Cloud documents different source ranges for some load balancer types, including external passthrough Network Load Balancers. Updated the wording to describe the common ranges and call out external passthrough Network Load Balancer IPv4 ranges.
- The post described an "expected status code" and "whatever your health check expects" for HTTP health checks. Google Cloud HTTP, HTTPS, and HTTP/2 health checks require `200 OK`, with optional response-body matching. Updated the relevant text.
- The health check YAML comment said an empty HTTP `host` uses the instance IP. Current Google Cloud health check resource documentation describes this as the health check destination IP. Updated the comment.
- The named ports section implied named ports apply only to HTTP(S) load balancers and that missing named ports always make health checks fail. Updated the wording to cover Application Load Balancers and proxy Network Load Balancers with instance group backends, and to clarify that health checks fail when they use the serving port.
- The named port command only showed the unmanaged instance group command. Added a note for managed instance groups to use `gcloud compute instance-groups managed set-named-ports`.
- The quick diagnostic script labeled backend group output as "Named Ports". Renamed the label to "Backend Groups" so the script output matches what the command actually returns.
- The Flask / SQLAlchemy example used `db.session.execute('SELECT 1')`. Current SQLAlchemy documentation uses executable SQL constructs such as `text()`, so the example now imports `text` and calls `db.session.execute(text('SELECT 1'))`.

## Review Notes
The `gcloud` binary was not available in the local environment, so CLI syntax was verified against the official Google Cloud SDK reference instead of local `--help` output. The post remains a general troubleshooting guide; future improvements could add load-balancer-type-specific firewall examples for external passthrough Network Load Balancers and IPv6 backends.
