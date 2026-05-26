# Validation Summary: How to Use Ansible to Create AWS Elastic Load Balancers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- amazon.aws Ansible collection
- AWS Classic Load Balancer
- AWS Elastic Load Balancing
- AWS Certificate Manager
- IAM server certificates
- boto3 and botocore
- YAML playbooks

## Sources Consulted
- Ansible `amazon.aws.elb_classic_lb` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/elb_classic_lb_module.html
- Ansible `amazon.aws.elb_classic_lb_info` module documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/elb_classic_lb_info_module.html
- Ansible `amazon.aws` collection index: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/index.html
- AWS Classic Load Balancer cross-zone load balancing documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/classic/enable-disable-crosszone-lb.html
- AWS Classic Load Balancer HTTPS listener documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/classic/elb-https-load-balancers.html
- AWS Classic Load Balancer SSL/TLS certificate documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/classic/ssl-server-cert.html
- AWS Elastic Load Balancing features comparison: https://aws.amazon.com/elasticloadbalancing/features/

## Issues Found
- The prerequisites listed Ansible 2.14+ while the current unpinned `amazon.aws` collection documentation lists support for newer ansible-core versions. Updated the prerequisite to Ansible 2.16+ for the current collection, or another Ansible version supported by the installed collection version.
- The prerequisites mentioned only boto3. The module documentation requires both boto3 and botocore, so the prerequisite now names both.
- The `purge_instance_ids: false` explanation said omitting it would deregister instances not listed in the playbook. The module default is already `false`, so this was corrected to explain that setting it to `true` enforces the exact instance list and deregisters unlisted instances.

## Review Notes
The remaining module parameters, listener examples, health check fields, access logging keys, HTTPS certificate usage, cross-zone load balancing behavior, connection draining explanation, and Classic Load Balancer feature comparisons align with the official Ansible and AWS documentation reviewed. Classic Load Balancers remain supported for existing workloads, but AWS positions Application Load Balancers and Network Load Balancers as the preferred choices for new designs.
