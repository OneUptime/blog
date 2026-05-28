# Validation Summary: How to Configure NSX-T Distributed Firewall Policies for Micro-Segmentation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud VMware Engine
- Google Cloud CLI
- VMware NSX-T / NSX
- NSX Policy API
- NSX Distributed Firewall
- Micro-segmentation
- Syslog forwarding

## Sources Consulted
- Google Cloud CLI reference for `gcloud vmware private-clouds nsx credentials describe`: https://docs.cloud.google.com/sdk/gcloud/reference/vmware/private-clouds/nsx/credentials/describe
- Google Cloud VMware Engine documentation for accessing management appliances: https://docs.cloud.google.com/vmware-engine/docs/vmware-platform/howto-access-management
- Google Cloud VMware Engine quickstart for NSX workload networking and security: https://docs.cloud.google.com/vmware-engine/docs/quickstart-network-segment
- Google Cloud VMware Engine best practices for distributed firewall segmentation: https://docs.cloud.google.com/vmware-engine/docs/best-practices-security
- Broadcom VMware NSX-T Data Center REST API, group condition schema: https://developer.broadcom.com/xapis/nsx-t-data-center-rest-api/latest/types_Condition.html
- Broadcom VMware NSX-T Data Center REST API, virtual machine tag update: https://developer.broadcom.com/xapis/nsx-t-data-center-rest-api/latest/method_UpdateVirtualMachineTags.html
- Broadcom VMware NSX-T Data Center REST API, L4 port set service entry schema: https://developer.broadcom.com/xapis/nsx-t-data-center-rest-api/latest/types_L4PortSetServiceEntry.html
- Broadcom VMware NSX-T Data Center REST API, distributed firewall security policy and rule schemas: https://developer.broadcom.com/xapis/nsx-t-data-center-rest-api/latest/types_SecurityPolicy.html and https://developer.broadcom.com/xapis/nsx-t-data-center-rest-api/latest/types_Rule.html
- Broadcom VMware NSX-T Data Center REST API, node syslog exporter: https://developer.broadcom.com/xapis/nsx-t-data-center-rest-api/latest/method_PostNodeSyslogExporter.html

## Issues Found
- The post stated that the `gcloud vmware private-clouds nsx credentials describe` output gives both the NSX-T Manager URL and credentials. The Google Cloud command retrieves NSX sign-in credentials; the management appliance URL is obtained from the Google Cloud console. Updated the wording accordingly.
- The NSX group examples matched only `web-tier`, `app-tier`, and `db-tier` while the VM tag examples applied those values with the `tier` scope. Updated the group condition values to `tier|web-tier`, `tier|app-tier`, and `tier|db-tier` so the dynamic groups match the scoped tags being applied.
- The custom service example used `protocol` in an `L4PortSetServiceEntry`. NSX Policy API requires `l4_protocol`. Updated the JSON field to `l4_protocol`.
- The syslog exporter example used `PUT` against `/api/v1/node/services/syslog/exporters/{exporter-name}`. The NSX API documents adding a node syslog exporter with `POST` to `/api/v1/node/services/syslog/exporters`. Updated the method and URL.

## Review Notes
The remaining NSX Policy API paths, rule fields, `ANY` constants, rule logging flag, DFW policy statistics endpoint, and GCVE access guidance are consistent with the consulted official documentation. In future revisions, consider noting that Google Cloud and Broadcom increasingly brand the product as VMware NSX rather than NSX-T, although the NSX-T terminology remains recognizable for the APIs and operational model discussed here.
