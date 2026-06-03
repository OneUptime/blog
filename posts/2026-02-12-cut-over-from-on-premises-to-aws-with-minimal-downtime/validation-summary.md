# Validation Summary: How to Cut Over from On-Premises to AWS with Minimal Downtime

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon Route 53
- AWS Database Migration Service (AWS DMS)
- Amazon RDS for PostgreSQL
- AWS Global Accelerator
- Elastic Load Balancing / Application Load Balancer / Network Load Balancer
- Nginx reverse proxy configuration
- DNS TTL and weighted DNS routing

## Sources Consulted
- AWS CLI Command Reference: `route53 change-resource-record-sets` - https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html
- Amazon Route 53 Developer Guide: values specific for weighted records - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-weighted.html
- Amazon Route 53 Developer Guide: DNS best practices - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/best-practices-dns.html
- AWS CLI Command Reference: `dms create-replication-task` - https://docs.aws.amazon.com/cli/latest/reference/dms/create-replication-task.html
- AWS Database Migration Service User Guide: PostgreSQL as an AWS DMS source - https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.PostgreSQL.html
- AWS Database Migration Service User Guide: replication instance classes - https://docs.aws.amazon.com/dms/latest/userguide/CHAP_ReplicationInstance.Types.html
- AWS CLI Command Reference: `globalaccelerator create-accelerator` - https://docs.aws.amazon.com/cli/latest/reference/globalaccelerator/create-accelerator.html
- AWS CLI Command Reference: `globalaccelerator create-listener` - https://docs.aws.amazon.com/cli/latest/reference/globalaccelerator/create-listener.html
- AWS CLI Command Reference: `globalaccelerator create-endpoint-group` - https://docs.aws.amazon.com/cli/latest/reference/globalaccelerator/create-endpoint-group.html
- AWS Global Accelerator Developer Guide: endpoint weights - https://docs.aws.amazon.com/global-accelerator/latest/dg/about-endpoints-endpoint-weights.html
- AWS Global Accelerator Developer Guide: traffic dials - https://docs.aws.amazon.com/global-accelerator/latest/dg/about-endpoint-groups-traffic-dial.html
- AWS Global Accelerator Developer Guide: components and anycast static IPs - https://docs.aws.amazon.com/global-accelerator/latest/dg/introduction-components.html
- NGINX documentation: `split_clients` module - https://nginx.org/en/docs/http/ngx_http_split_clients_module.html
- NGINX documentation: reverse proxy / `proxy_pass` - https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy

## Issues Found
- The PostgreSQL AWS DMS example omitted required source-side CDC prerequisites. Added a note before the DMS task setup explaining that logical replication must be enabled on the source database with settings such as `wal_level=logical`, `max_replication_slots > 1`, and `max_wal_senders > 1`.
- The Global Accelerator comments referred to shifting an "endpoint group" with "weight 100." Global Accelerator uses endpoint weights within an endpoint group and traffic dials for endpoint groups. Updated the comments to refer to endpoint weights and endpoint group traffic dials.
- The Nginx example proxied both backends with `http://$backend` while the AWS backend was configured on port 443. Updated the `split_clients` values to full backend URLs and changed `proxy_pass` to use `$backend`, so the AWS backend uses HTTPS and the on-premises backend remains HTTP.

## Review Notes
The AWS CLI command shapes for Route 53, DMS, and Global Accelerator are current. The Route 53 weighted alias example correctly omits `TTL` for the alias record and uses a 60-second TTL on the non-alias weighted record, which aligns with AWS guidance for weighted records that include an ELB alias target.
