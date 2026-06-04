# Validation Summary: How to Configure Global Load Balancing Across Multiple Kubernetes Clusters

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Kubernetes Service, Deployment, and Ingress
- Amazon Route 53 geolocation routing and health checks
- AWS CloudFormation Route 53 resources
- K8GB Kubernetes Global Balancer
- Helm
- Istio DestinationRule and VirtualService
- Cloudflare Load Balancing API and Node SDK
- Prometheus recording rules and PrometheusRule alerts

## Sources Consulted
- AWS CloudFormation `AWS::Route53::RecordSet` documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-route53-recordset.html
- AWS CloudFormation `AWS::Route53::RecordSet GeoLocation` documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-route53-recordset-geolocation.html
- K8GB Getting Started documentation: https://www.k8gb.io/latest/intro/
- K8GB Resource References documentation: https://www.k8gb.io/resource_ref/
- K8GB Multi-zone Setup documentation: https://www.k8gb.io/multizone/
- K8GB Go API reference for `Gslb` strategy fields: https://pkg.go.dev/github.com/k8gb-io/k8gb@v0.19.0/api/v1beta1io
- Istio locality load balancing documentation: https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/distribute/
- Cloudflare Load Balancer Node API documentation: https://developers.cloudflare.com/api/node/resources/load_balancers/methods/create/
- Cloudflare Load Balancing pools documentation: https://developers.cloudflare.com/load-balancing/pools/create-pool/
- Cloudflare Load Balancers Node API resource documentation: https://developers.cloudflare.com/api/node/resources/load_balancers/

## Issues Found
- The Route 53 example created two geolocation records for the same `Name`, `Type`, and `ContinentCode: NA`. AWS documentation states that two geolocation records cannot specify the same geographic location. Changed the example to use `CountryCode: US` for the east cluster and `CountryCode: '*'` as the default west cluster record.
- The Route 53 explanation claimed geolocation routing sends users to the geographically closest healthy cluster. Route 53 geolocation routing matches configured geographic locations, not proximity. Updated the explanation to describe the explicit United States/default routing behavior.
- The health check Kubernetes example exposed port 443 to an nginx container on port 8080, while `nginx:alpine` listens on port 80 by default and does not serve `/healthz`. Updated the Route 53 health check and Kubernetes Service/Deployment to use HTTP port 80 and path `/`.
- The K8GB Helm command used the older single `k8gb.dnsZone` value. K8GB v0.15.0 and later use `k8gb.dnsZones[]` with `parentZone`, `loadBalancedZone`, and `dnsZoneNegTTL`. Updated the Helm examples.
- The K8GB `Gslb` example used the legacy API group and embedded ingress pattern, and included `splitBrainThresholdSeconds`, which the K8GB API reference marks as deprecated and unused. Updated the example to `apiVersion: k8gb.io/v1beta1`, used `resourceRef` with a Kubernetes Ingress, and removed the deprecated field.
- The K8GB text said configuration is automatically synchronized across clusters. K8GB manages DNS records, but equivalent Gslb resources still need to exist in each participating cluster. Updated the wording.
- The Istio `VirtualService` routed to subsets that were not defined in the `DestinationRule`. Added `us-east` and `us-west` subset definitions.
- The Cloudflare JavaScript example used an outdated client shape (`cloudflare({ token })`, `cf.user.loadBalancers...`, and `cf.zones.loadBalancers.create`). Updated it to the current official Node SDK style with `new Cloudflare({ apiToken })`, `cf.loadBalancers.pools.create({ account_id, ... })`, and `cf.loadBalancers.create({ zone_id, ... })`.
- The Cloudflare pool example used deprecated `notification_email`. Removed it.

## Review Notes
- Helm and Ruby were not installed locally, so I could not run `helm` or Ruby-based YAML validation in this workspace. The reviewed fields and commands were checked against official documentation.
- The Prometheus alert `ClusterNotReceivingTraffic` only evaluates for clusters that still have a `cluster:request_rate:sum` series. A future improvement could add an `absent()`-based alert if the monitoring setup needs to detect completely missing cluster series.
