# Validation Summary: How to Build DNS Round Robin Load Balancing

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- DNS A records and DNS round robin behavior
- BIND zone file configuration
- AWS Route 53 simple, weighted, geolocation, and health-check routing
- AWS CLI Route 53 change-resource-record-sets
- Terraform AWS provider resources for Route 53 records and health checks
- dig DNS query tool
- Python with boto3 and requests
- Node.js dns and https modules

## Sources Consulted
- BIND 9 documentation, rrset-order configuration: https://bind9.readthedocs.io/en/stable/reference.html
- Amazon Route 53 simple routing documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-simple.html
- Amazon Route 53 weighted routing documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-weighted.html
- Amazon Route 53 weighted record values: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-weighted.html
- Amazon Route 53 ResourceRecordSet API reference: https://docs.aws.amazon.com/Route53/latest/APIReference/API_ResourceRecordSet.html
- Amazon Route 53 ChangeResourceRecordSets API reference: https://docs.aws.amazon.com/Route53/latest/APIReference/API_ChangeResourceRecordSets.html
- AWS CLI route53 change-resource-record-sets reference: https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html
- Amazon Route 53 multivalue answer routing documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-multivalue.html
- Amazon Route 53 routing policy overview, including geolocation and geoproximity: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy.html
- Terraform AWS provider aws_route53_record documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Node.js HTTPS documentation for https.request and TLS servername option: https://nodejs.org/api/https.html
- Node.js DNS documentation for dns.promises.resolve4: https://nodejs.org/api/dns.html

## Issues Found
- The post stated that DNS responses always rotate IP address order. Updated this to say DNS servers commonly rotate or randomize responses, and that authoritative DNS services, recursive resolvers, and clients can vary in behavior.
- The Route 53 simple-routing explanation said records are rotated automatically. Updated this to match Route 53 documentation: multiple values in a simple record are returned in random order and are not health checked.
- The BIND zone snippet was labeled as `bash` even though it is a zone file. Changed the code fence to `dns` and added in-zone A records for `ns1` and `ns2` so the example is more complete.
- The health-check limitation said DNS does not perform health checks. Narrowed this to "Basic DNS round robin" because managed DNS services such as Route 53 can integrate health checks through specific routing policies.
- The Python example imported `Dict` but never used it. Removed the unused import.
- The GeoDNS section described routing users to the nearest server. Updated this to explain that geolocation DNS routes by configured geographic policy and inferred resolver/client-subnet location, not necessarily by latency or nearest server.
- The Node.js HTTPS example connected to a specific IP address with only a `Host` header. Added the `servername` option so TLS SNI and certificate selection use the original hostname.
- The comparison table implied basic DNS round robin provides geographic and weighted routing. Updated those entries to clarify that those require GeoDNS or weighted DNS rather than plain round robin.

## Review Notes
Local validation covered JavaScript syntax with `node --check`, Python syntax with `py_compile`, bash syntax with `bash -n`, embedded JSON payloads with `jq`, and `dig` availability. `terraform`, `aws`, and `named-checkzone` were not installed locally, so those snippets were reviewed against official documentation rather than executed.
